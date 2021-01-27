const net = require('net');
const http = require('http');
let clientConfig = require('./client.json');
const lengthFieldDecoder = require('../lengthField/lengthFieldDecoder');
const lengthFieldEncoder = require('../lengthField/lengthFieldEncoder');
const common = require('../utils/common');

class clientHandler {

  constructor(configJson) {
    if(configJson){
      clientConfig = configJson;
    }else{
    }
  }

  start(){
    // 心跳助手
    let idleStateHandler;
    // 重连助手
    let reconnectHandler;
    // 连接状态
    let connectFlag;
    let tcpClientMap = new Map();
    let lengthFieldEncoderIns = new lengthFieldEncoder(4,100*1024*1024);
    let lengthFieldDecoderIns = new lengthFieldDecoder(4,100*1024*1024,function(completeData){
      let receiveData = JSON.parse(completeData.toString());
      // 如果是心跳回复消息则不处理
      if(receiveData.type === 0){

      }else if(receiveData.type === 2){
        // 接收到注册结果消息
        connectFlag = true;
        clearInterval(reconnectHandler);
        if(!idleStateHandler){
          idleStateHandler = setInterval(function () {
            let sendData = {
              type: 0,
            }
            client.write(lengthFieldEncoderIns.encode(Buffer.from(JSON.stringify(sendData),"utf-8")));
          },30000);
        }
        receiveData.data.forEach((result)=>{
          console.log(new Date().format("yyyy-MM-dd hh:mm:ss") + " " + result.msg);
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
              if(!receiveData.connect){
                tcpClient.write(Buffer.from(receiveData.data.trueData))
              }
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
              client.write(lengthFieldEncoderIns.encode(Buffer.from(JSON.stringify(sendData),"utf-8")));
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
            tcpClient.on("error",(error)=>{
              let responseData = {
                type: "tcp",
                code: "error",
                body: error
              }
              // 数据接收完成
              let sendData = {
                channelId: receiveData.channelId,
                type: 5,
                data: responseData
              }
              client.write(lengthFieldEncoderIns.encode(Buffer.from(JSON.stringify(sendData),"utf-8")));
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
              if(body.length === 0){
                body = data;
              }else{
                body = Buffer.concat([body,data]);
              }
            });
            response.on('end', function() {
              let responseData = {
                type: "http",
                statusCode: response.statusCode,
                headers: response.headers,
                body: [...body]
              }
              // 数据接收完成
              let sendData = {
                channelId: receiveData.channelId,
                type: 4,
                data: responseData
              }
              client.write(lengthFieldEncoderIns.encode(Buffer.from(JSON.stringify(sendData),"utf-8")));
            });
          }
          // 向服务端发送请求
          let req = http.request(options, callback);
          req.on("error", (error)=>{
            let responseData = {
              type: "http",
              code: "error",
              body: error
            }
            // 数据接收完成
            let sendData = {
              channelId: receiveData.channelId,
              type: 5,
              data: responseData
            }
            client.write(lengthFieldEncoderIns.encode(Buffer.from(JSON.stringify(sendData),"utf-8")));
          })
          if(receiveData.data.postData && receiveData.data.postData.length > 0){
            req.write(Buffer.from(receiveData.data.postData))
          }
          req.end();
        }
      }
    })
    // 连接服务器
    let client = connect();

    /**
     * 连接服务器
     * @returns {Socket}
     */
    function connect(){
      let connectClient = net.connect({host: clientConfig.serverIp,port: clientConfig.serverPort}, () => {
        let sendData = {
          type: 1,
          token: clientConfig.token,
          data: clientConfig.registers
        }
        connectClient.write(lengthFieldEncoderIns.encode(Buffer.from(JSON.stringify(sendData),"utf-8")));
      });
      // 接收服务端的数据
      connectClient.on('data', (data) => {
        try{
          lengthFieldDecoderIns.read(data);
        }catch (error) {
          console.error("通道数据异常",error);
        }
      })
      // 断开连接
      connectClient.on('end', () => {

      })
      connectClient.on("error", (error)=>{
        console.error(new Date().format("yyyy-MM-dd hh:mm:ss") + " 异常",error);
        // 断线重连
        connectClient.end();
        clearInterval(reconnectHandler);
        clearInterval(idleStateHandler);
        idleStateHandler = null;
        connectFlag = false;
        reconnectHandler = setInterval(function () {
          client = connect();
        },10000);
      })
      return connectClient;
    }
  }
}
module.exports = clientHandler;



