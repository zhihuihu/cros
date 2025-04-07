const net = require('net');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const crypto = require('crypto');
const log = require('../common/logger.js');

class TunnelClient {
  constructor(configPath) {
    this.config = this.loadConfig(configPath);
    this.validateConfig();
    this.failTunnelTcpList = new Set(); // 存储失败的TCP连接ID
    this.failTunnelHttpList = new Set(); // 存储失败的HTTP连接ID
    this.connections = new Map(); // connectionId -> { socket, state, buffer }
    this.controlSocket = null;
    this.receiveBuffer = Buffer.alloc(0);
    this.heartbeatInterval = 10000; // 10秒心跳间隔
    this.heartbeatTimer = null;
    // 加密配置
    this.cryptoConfig = {
      algorithm: 'aes-256-gcm',
      key: crypto.scryptSync(this.config.crypto.password, 'salt', 32),
      ivLength: 12
    };
    this.connectToServer();
  }

  loadConfig(configPath) {
    try {
      const filePath = path.resolve(process.cwd(), configPath);
      return yaml.load(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      throw new Error(`Client config error: ${e.message}`);
    }
  }

  encrypt(data) {
    const iv = crypto.randomBytes(this.cryptoConfig.ivLength);
    const cipher = crypto.createCipheriv(this.cryptoConfig.algorithm, this.cryptoConfig.key, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), encrypted]);
  }

  decrypt(encryptedData) {
    const iv = encryptedData.subarray(0, this.cryptoConfig.ivLength);
    const authTag = encryptedData.subarray(this.cryptoConfig.ivLength, this.cryptoConfig.ivLength + 16);
    const data = encryptedData.subarray(this.cryptoConfig.ivLength + 16);
    const decipher = crypto.createDecipheriv(this.cryptoConfig.algorithm, this.cryptoConfig.key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(data), decipher.final()]);
  }

  validateConfig() {
    const ports = new Set();
    this.config.tunnels.forEach(tunnel => {
      if (ports.has(tunnel.remotePort)) {
        throw new Error(`Duplicate remote port ${tunnel.remotePort}`);
      }
      ports.add(tunnel.remotePort);
    });
  }

  connectToServer() {
    this.controlSocket = net.connect({
      port: this.config.server.port,
      host: this.config.server.host
    });

    this.controlSocket.on('connect', () => {
      log.info('Client', 'Connected to server'); 
      this.registerTunnels();
    });

    // 启动心跳定时器
    this.heartbeatTimer = setInterval(() => {
      const packet = Buffer.alloc(1);
      packet.writeUInt8(0x48, 0); // 'H' 心跳包
      this.sendPacket(packet);
    }, this.heartbeatInterval);

    this.controlSocket.on('data', data => this.processData(data));
    this.controlSocket.on('error', err => {
      log.error('Client', `Control socket error: ${err.message}`);
    });
    this.controlSocket.on('close', () => {
      clearInterval(this.heartbeatTimer);
      log.error('Client', `Control socket close`);
    });
  }

  registerTunnels() {
    const sentPorts = new Set();
    this.config.tunnels.forEach(tunnel => {
      if (sentPorts.has(tunnel.remotePort)) return;
      sentPorts.add(tunnel.remotePort);

      const buffer = Buffer.alloc(3);
      buffer.writeUInt8(0x52, 0); // 'R' 注册命令
      buffer.writeUInt16BE(tunnel.remotePort, 1);
      this.sendPacket(buffer);
    });
  }

  processData(data) {
    this.receiveBuffer = Buffer.concat([this.receiveBuffer, data]);
    while (this.receiveBuffer.length >= 4) {
      const pkgLength = this.receiveBuffer.readUInt32BE(0);
      if (this.receiveBuffer.length < 4 + pkgLength) return;

      const packet = this.receiveBuffer.slice(4, 4 + pkgLength);
      this.receiveBuffer = this.receiveBuffer.slice(4 + pkgLength);
      const decryptedPacket = this.decrypt(packet); // Decrypt the packet using the decrypt functio
      this.handlePacket(decryptedPacket);
    }
  }

  handlePacket(packet) {
    const cmd = packet[0]; // 统一协议：命令字节在首位
    const payload = packet.slice(1);

    switch (cmd) {
      case 0x43: // 'C' 连接请求
        this.handleConnect(payload);
        break;
      case 0x44: // 'D' 数据命令
        this.handleData(payload);
        break;
      case 0x48: // 'H' 心跳包
        //log.info('Client', 'Received heartbeat from server');
        break;
      case 0x4E: // 'N' 通知命令
        this.handleNotice(payload);
        break;
    }
  }

  handleNotice(payload) {
    const noticeJson = JSON.parse(payload.toString('utf8'));
    if(noticeJson.success === true) {
      if(noticeJson.type === 'tcp') {
        log.info('Client', `Tunnel ${noticeJson.remotePort} is available`);
      }else if(noticeJson.type === 'http') {
        log.info('Client', `Tunnel ${noticeJson.remoteDomain} is available`);
      }else {
        log.info('Client', `Other message ${noticeJson.message}`);
      }
    }else {
      if(noticeJson.type === 'tcp') {
        log.info('Client', `Tunnel ${noticeJson.remotePort} is unavailable, message = ${noticeJson.message}`);
      }else if(noticeJson.type === 'http') {
        log.info('Client', `Tunnel ${noticeJson.remoteDomain} is unavailable, message = ${noticeJson.message}`);
      }else {
        log.info('Client', `Other message ${noticeJson.message}`);
      }
    }
  }

  handleConnect(payload) {
    const connectionId = payload.readUInt32BE(0);
    const remotePort = payload.readUInt16BE(4);
    const tunnel = this.config.tunnels.find(t => t.remotePort === remotePort);
    if (!tunnel) return;

    this.connections.set(connectionId, {
      state: 'connecting',
      buffer: [],
      socket: null
    });

    const localSocket = net.connect({
      host: tunnel.localHost,
      port: tunnel.localPort
    }, () => {
      log.info('Client', `Connected to local service ${tunnel.localHost}:${tunnel.localPort}`);
      const entry = this.connections.get(connectionId);
      if (entry) {
        // 发送ACK（协议版本1）
        const ackPacket = Buffer.alloc(5);
        ackPacket.writeUInt8(0x41, 0);    // 命令字节
        ackPacket.writeUInt32BE(connectionId, 1); // 连接ID
        this.sendPacket(ackPacket);
        
        entry.state = 'ready';
        entry.buffer.forEach(data => localSocket.write(data));
        entry.buffer = [];
      }
    });

    localSocket.on('data', data => {
      // 构建DATA包（协议版本1）
      const dataPacket = Buffer.alloc(5 + data.length);
      dataPacket.writeUInt8(0x44, 0);       // 命令字节
      dataPacket.writeUInt32BE(connectionId, 1); // 连接ID
      data.copy(dataPacket, 5);
      this.sendPacket(dataPacket);
    });

    localSocket.on('close', () => {
      this.connections.delete(connectionId);
    });

    localSocket.on('error', err => {
      log.error('Client', `Local service error (${tunnel.localHost}:${tunnel.localPort}): ${err.message}`);
      this.connections.delete(connectionId);
    });

    this.connections.get(connectionId).socket = localSocket;
  }

  handleData(payload) {
    const connectionId = payload.readUInt32BE(0);
    const data = payload.slice(4);
    const entry = this.connections.get(connectionId);

    if (!entry) return;

    if (entry.state === 'ready') {
      entry.socket.write(data);
    } else if (entry.state === 'connecting') {
      entry.buffer.push(data);
    }
  }

  sendPacket(data) {
    const lengthHeader = Buffer.alloc(4);
    const encryptedData = this.encrypt(data);
    lengthHeader.writeUInt32BE(encryptedData.length, 0);
    this.controlSocket.write(Buffer.concat([lengthHeader, encryptedData]));
  }
}

module.exports = {
  TunnelClient
};