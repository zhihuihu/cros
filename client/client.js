const net = require('net');
const http = require('http');
const clientConfig = require('./client.json');
const delimiterDecoder = require('../delimiter/delimiterDecoder');

let tcpClientMap = new Map();
let delimiterDecoderIns = new delimiterDecoder(Buffer.from("$_"),100*1024*1024,function(completeData){
  let receiveData = JSON.parse(completeData.toString());
  // 接收到注册结果消息
  if(receiveData.type === 2){
    receiveData.data.forEach((result)=>{
      console.log(result.msg);
    })
  }else if(receiveData.type === 3){
    // 接收到请求数据
    if(receiveData.data.type === "tcp"){
      let cacheTcpClient = tcpClientMap.get(receiveData.channelId);
      if(null != cacheTcpClient){
        cacheTcpClient.write(Buffer.from(receiveData.data.trueData))
      }else{
        // 连接服务器
        const tcpClient = net.connect({host: receiveData.data.localIp,port: receiveData.data.localPort}, () => {
          let b = Buffer.from(receiveData.data.trueData);
          tcpClient.write(Buffer.from(receiveData.data.trueData))
          tcpClientMap.set(receiveData.channelId,tcpClient);
        })
        // 接收服务端的数据
        tcpClient.on('data', (data) => {
          let sendData = {
            type: 4,
            channelId: receiveData.channelId,
            data: {
              type: "tcp",
              trueData: data
            }
          }
          client.write(Buffer.from(JSON.stringify(sendData)+"$_","utf-8"))
        })
        // 断开连接
        tcpClient.on('end', () => {
          tcpClientMap.forEach((v,k)=>{
            if(v == tcpClient){
              // 删除连接
              tcpClientMap.delete(k);
            }
          })
        })
      }
    }else if(receiveData.data.type === "http"){
      let options = {
        host: receiveData.data.localIp,
        port: receiveData.data.localPort,
        method: receiveData.data.method,
        path: receiveData.data.url,
        headers: receiveData.data.headers
      };
      let callback = function(response){
        let body = [];
        response.on('data', function(data) {
          body.push(...data);
        });
        response.on('end', function() {
          let responseData = {
            type: "http",
            statusCode: response.statusCode,
            headers: response.headers,
            body: body
          }
          // 数据接收完成
          let sendData = {
            channelId: receiveData.channelId,
            type: 4,
            data: responseData
          }
          client.write(Buffer.from(JSON.stringify(sendData)+"$_","utf-8"))
        });
      }
      // 向服务端发送请求
      let req = http.request(options, callback);
      if(receiveData.data.postData && receiveData.data.postData.length > 0){
        req.write(Buffer.from(receiveData.data.postData))
      }
      req.end();
    }
  }
});
// 连接服务器
const client = net.connect({port: 8080}, () => {
  let sendData = {
    type: 1,
    token: clientConfig.token,
    data: clientConfig.registers
  }
  client.write(Buffer.from(JSON.stringify(sendData)+"$_","utf-8"))
})
// 接收服务端的数据
client.on('data', (data) => {
  delimiterDecoderIns.read(data);
})
// 断开连接
client.on('end', () => {
})
