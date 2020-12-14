const net = require('net');
const http = require('http');
const channelInitializer = require('../channelInitializer');
const delimiterEncoder = require('../encoder/delimiterEncoder');
const delimiterDecoder = require('../decoder/delimiterDecoder');
const crosClientHandler = require('./crosClientHandler')

// 连接服务器
const client = net.connect({port: 8080}, () => {
  console.log('CROS客户端连接服务器');
});
let channelInitializerIns = new channelInitializer(client);
channelInitializerIns.addChannelHandler(new delimiterEncoder(Buffer.from("$_"),100*1024*1024))
channelInitializerIns.addChannelHandler(new delimiterDecoder(Buffer.from("$_"),100*1024*1024));
channelInitializerIns.addChannelHandler(new crosClientHandler());
channelInitializerIns.init();
