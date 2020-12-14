const net = require('net');
const uuid = require('uuid');
const http = require('http');
const channelInitializer = require('../channelInitializer');
const delimiterEncoder = require('../encoder/delimiterEncoder');
const delimiterDecoder = require('../decoder/delimiterDecoder');
const crosServerHandler = require('./crosServerHandler');

// 创建TCP服务器
const server = net.createServer((socket) => {
  let channelInitializerIns = new channelInitializer(socket);
  channelInitializerIns.addChannelHandler(new delimiterEncoder(Buffer.from("$_"),100*1024*1024))
  channelInitializerIns.addChannelHandler(new delimiterDecoder(Buffer.from("$_"),100*1024*1024));
  channelInitializerIns.addChannelHandler(new crosServerHandler());
  channelInitializerIns.init();
})
// 启动服务
server.listen(8080, () => {
  console.log('服务创建')
});
