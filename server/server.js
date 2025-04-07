const net = require('net');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const crypto = require('crypto');
const log = require('../common/logger.js');

class TunnelServer {
  constructor(configPath) {
    this.config = this.loadConfig(configPath);
    this.tunnels = new Map();        // remotePort -> clientSocket
    this.tunnelServers = new Map();  // remotePort -> net.Server
    this.connections = new Map();   // connectionId -> { socket, state, buffer }
    this.connectionIdCounter = 0;

    // 加密配置
    this.cryptoConfig = {
      algorithm: 'aes-256-gcm',
      key: crypto.scryptSync(this.config.crypto.password, 'salt', 32),
      ivLength: 12
    };
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

  loadConfig(configPath) {
    try {
      const filePath = path.resolve(process.cwd(), configPath);
      return yaml.load(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      throw new Error(`Server config error: ${e.message}`);
    }
  }

  start() {
    const server = net.createServer(socket => this.handleControlConnection(socket));
    server.listen(this.config.port, () => {
      log.info('Server', `Control server listening on ${this.config.port}`);
    });
  }

  handleControlConnection(clientSocket) {
    let buffer = Buffer.alloc(0);
    
    clientSocket.on('data', data => {
      buffer = Buffer.concat([buffer, data]);
      while (buffer.length >= 4) {
        const pkgLen = buffer.readUInt32BE(0);
        if (buffer.length < 4 + pkgLen) break;
        
        const packet = buffer.slice(4, 4 + pkgLen);
        buffer = buffer.slice(4 + pkgLen);
        const decryptedPacket = this.decrypt(packet);
        this.processPacket(clientSocket, decryptedPacket);
      }
    });

    clientSocket.on('error', err => {
      log.error('Server', `Control socket error: ${err.message}`);
    });

    clientSocket.on('close', () => {
      log.info('Server', 'Control socket closed');
      this.closeClientTunnalsAndServers(clientSocket);
    });
  }

  closeClientTunnalsAndServers(clientSocket) {
    for (const [remotePort, socket] of this.tunnels.entries()) {
      if (socket === clientSocket) {
        this.tunnels.delete(remotePort);
        const server = this.tunnelServers.get(remotePort);
        if (server) {
          server.close(() => {
            log.info('Server', `Closed public server for port ${remotePort}`);
            this.tunnelServers.delete(remotePort);
          });
          if(server._sockets) {
            server._sockets.forEach((socket) => {
              socket.destroy(); // 强制关闭连接 
            });
            server._sockets.clear();
          }
        }
      }
    }
  }

  processPacket(clientSocket, packet) {
    const cmd = packet[0]; // 命令字节始终在首位
    const payload = packet.slice(1);

    switch (cmd) {
      case 0x52: // 'R' 注册隧道
        this.handleRegister(clientSocket, payload);
        break;
      case 0x41: // 'A' ACK确认
      case 0x44: // 'D' 数据传输
        this.handleConnectionData(cmd, payload);
        break;
      case 0x48: // 'H' 心跳包
        // 收到心跳包后回复相同的心跳包
        const response = Buffer.alloc(1);
        response.writeUInt8(0x48, 0);
        this.sendPacket(clientSocket, response);
        break;
    }
  }

  handleRegister(clientSocket, payload) {
    const remotePort = payload.readUInt16BE(0);
    if (this.tunnels.has(remotePort)) return;
    
    this.tunnels.set(remotePort, clientSocket);
    log.info('Server', `Registered port ${remotePort}`);
    this.createPublicServer(remotePort, clientSocket);
  }

  createPublicServer(remotePort, clientSocket) {
    if (this.tunnelServers.has(remotePort)) {
      this.sendNoticePacket(clientSocket, this.buildNoticeTcpJson(false, remotePort, '端口已被占用'));
      return;
    }

    const server = net.createServer(externalSocket => {
      if (!server._sockets) server._sockets = new Set();
      server._sockets.add(externalSocket);
      const connectionId = this.generateConnectionId();
      externalSocket.pause();

      // 初始化连接状态
      this.connections.set(connectionId, {
        socket: externalSocket,
        state: 'connecting',
        timer: setTimeout(() => {
          log.info('Server', `Connection ${connectionId} timeout`);
          externalSocket.destroy();
          this.connections.delete(connectionId);
        }, 5000)
      });

      // 构建CONNECT包（协议版本1）
      const packet = Buffer.alloc(7);
      packet.writeUInt8(0x43, 0);        // 命令字节
      packet.writeUInt32BE(connectionId, 1); // 连接ID
      packet.writeUInt16BE(remotePort, 5);    // 端口号
      this.sendPacket(clientSocket, packet);

      // 监听外部连接数据（修复点）
      externalSocket.on('data', data => {
        const conn = this.connections.get(connectionId);
        if (!conn) return;

        // 构建DATA包（协议版本1）
        const dataPacket = Buffer.alloc(5 + data.length);
        dataPacket.writeUInt8(0x44, 0);       // 命令字节
        dataPacket.writeUInt32BE(connectionId, 1); // 连接ID
        data.copy(dataPacket, 5);
        this.sendPacket(clientSocket, dataPacket);
      });

      externalSocket.on('close', () => {
        this.connections.delete(connectionId);
        server._sockets.delete(externalSocket);
      });

      externalSocket.on('error', err => {
        log.error('Server', `External socket error: ${err.message}`);
        this.connections.delete(connectionId);
      });
    });

    server.listen(remotePort, () => {
      log.info('Server', `Public server listening on ${remotePort}`);
      this.sendNoticePacket(clientSocket, this.buildNoticeTcpJson(true, remotePort, '远程端口已开放'));
    });
    server.on('error', (err) => {
      log.error('Server', `Failed to start public server on port ${remotePort}: ${err.message}`);
      this.sendNoticePacket(clientSocket, this.buildNoticeTcpJson(false, remotePort, `${err.message}`));
      server.close(); // Close the serve
    });
    server.on('close', () => {
      log.info('Server', `Public server closed for port ${remotePort}`);
      this.sendNoticePacket(clientSocket, this.buildNoticeTcpJson(false, remotePort, '远程端口已关闭'));
      this.tunnels.delete(remotePort); 
      this.tunnelServers.delete(remotePort);
    });
    this.tunnelServers.set(remotePort, server);
  }

  handleConnectionData(cmd, payload) {
    const connectionId = payload.readUInt32BE(0);
    const conn = this.connections.get(connectionId);
    if (!conn) return;

    switch (cmd) {
      case 0x41: // ACK处理
        if (conn.state === 'connecting') {
          conn.state = 'ready';
          conn.socket.resume();
          clearTimeout(conn.timer);
        }
        break;
      case 0x44: // 数据处理
        const data = payload.slice(4);
        if (conn.state === 'ready') {
          conn.socket.write(data);
        } else {
          conn.buffer.push(data);
        }
        break;
    }
  }

  generateConnectionId() {
    this.connectionIdCounter = (this.connectionIdCounter + 1) % 0xFFFFFFFF;
    return this.connectionIdCounter;
  }

  sendPacket(socket, data) {
    const lengthHeader = Buffer.alloc(4);
    const encryptedData = this.encrypt(data);
    lengthHeader.writeUInt32BE(encryptedData.length, 0);
    socket.write(Buffer.concat([lengthHeader, encryptedData]));
  }

  /**
   * 发送通知
   * @param {*} clientSocket 
   * @param {*} noticeJson 
   */
  sendNoticePacket(clientSocket, noticeJson) {
    const noticeBuffer = Buffer.from(JSON.stringify(noticeJson), 'utf8');
    const dataPacket = Buffer.alloc(1 + noticeBuffer.length);
    dataPacket.writeUInt8(0x4E, 0);       // 命令字节
    noticeBuffer.copy(dataPacket, 1);
    this.sendPacket(clientSocket, dataPacket);
  }

  /**
   * 构建tcp的通知json
   * @param {*} success 
   * @param {*} remotePort 
   * @param {*} message 
   * @returns 
   */
  buildNoticeTcpJson(success, remotePort, message) {
    return {
      success: success,
      type: 'tcp',
      remotePort: remotePort,
      message: message
    };
  }
}

module.exports = {
  TunnelServer
};