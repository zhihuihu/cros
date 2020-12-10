const net = require('net');
const uuid = require('uuid');
const delimiterDecoder = require('../delimiter/delimiterDecoder');

/** 客户端注册的服务 */
let clientServerMap = new Map();
// 创建TCP服务器
const server = net.createServer((socket) => {

  let delimiterDecoderIns = new delimiterDecoder(Buffer.from("$_"),100*1024*1024,function(completeData){
    console.log(completeData.toString())
    let transData = JSON.parse(completeData.toString());
    if(transData.type === 1){
      // 创建TCP服务器
      const clientServer = net.createServer((clientServer) => {
        let chinnalId = uuid.v1();
        console.log('暴露客户端连接')
        // 监听客户端的数据
        clientServer.on('data', (data) => {
          console.log('暴露客户端接收数据')
          let initData = {
            chinnalId: chinnalId,
            trueData: data
          }
          let buffer = Buffer.from(JSON.stringify(initData)+"$_","utf-8");
          socket.write(buffer)
        });
        // 监听客户端断开连接事件
        clientServer.on('end', (data) => {
          console.log('客户端断开连接')
        });
        clientServerMap.set(chinnalId,clientServer);
      })
      // 启动服务
      clientServer.listen(transData.port, () => {
        console.log('服务创建')
      });
    }else{
      let b = Buffer.from(transData.trueData.data);
      let clientServer = clientServerMap.get(transData.chinnalId);
      clientServer.write(b);
    }
  });
  console.log('注册-客户端连接')
  // 监听客户端的数据
  socket.on('data', (data) => {
    delimiterDecoderIns.read(data);
  });
  // 监听客户端断开连接事件
  socket.on('end', (data) => {
    console.log('客户端断开连接')
  });
})
// 启动服务
server.listen(8080, () => {
  console.log('服务创建')
})
