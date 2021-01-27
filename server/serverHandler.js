const net = require('net');
const uuid = require('uuid');
const http = require('http');
let serverConfig = require('./server.json');
/** 不能删，注册了全局方法 */
const common = require('../utils/common');
const lengthFieldDecoder = require('../lengthField/lengthFieldDecoder');
const lengthFieldEncoder = require('../lengthField/lengthFieldEncoder');

class serverHandler{

  constructor(configJson) {
    if(configJson){
      serverConfig = configJson;
    }else{
    }
  }

  start(){
    /** 客户端与服务器链接的MAP */
    let clientConnectSocketMap = new Map();
    let clientConnectTcpMap = new Map();
    let clientConnectSubdomainMap = new Map();
    /** 客户端注册的TCP穿透MAP */
    let clientTcpSocketMap = new Map();
    /** 客户端注册的TCP服务的Socket与服务之间的关系MAP */
    let clientTcpServerSocketMap = new Map();
    /** 客户端注册的子域名穿透MAP */
    let clientSubdomainConfigMap = new Map();
    /** http服务存储的map键值对 */
    let httpServerMap = new Map();

    let lengthFieldEncoderIns = new lengthFieldEncoder(4,100*1024*1024);
    // 创建TCP服务器
    const server = net.createServer((socket) => {
      // 保存客户端的连接
      let clientConnectChannelId = uuid.v1();
      clientConnectSocketMap.set(clientConnectChannelId,socket);
      let lengthFieldDecoderIns = new lengthFieldDecoder(4,100*1024*1024,function (completeData) {
        let receiveData = JSON.parse(completeData.toString());
        // 如果type：0 代表心跳
        if(receiveData.type === 0){
          let sendData = {
            type: 0,
          }
          socket.write(lengthFieldEncoderIns.encode(Buffer.from(JSON.stringify(sendData),"utf-8")));
        }else if(receiveData.type === 1){
          // 如果type：1 则表示客户端注册请求
          if(receiveData.token !== serverConfig.token){
            console.error("注册客户端token错误！");
            socket.end();
            return;
          }
          console.log(new Date().format("yyyy-MM-dd hh:mm:ss") + "  新客户端连接 clientConnectChannelId="+clientConnectChannelId)
          receiveData.data.forEach((register,index,arr) => {
            // 发送消息给客户端注册的状态
            let sendData = {
              type: 2,
              data:[
              ]
            }
            if(register.type === "tcp"){
              const clientTcpServer = net.createServer((clientTcpSocket) => {
                let clientTcpChannelId = uuid.v1();
                // 发送连接事件消息--有些tcp会让服务端先发消息，所以创建连接就通知是必要的
                let sendData = {
                  channelId: clientTcpChannelId,
                  type: 3,
                  connect: true,
                  data:{
                    type: "tcp",
                    localIp: register.localIp,
                    localPort: register.localPort,
                    trueData: Buffer.from([])
                  }
                }
                socket.write(lengthFieldEncoderIns.encode(Buffer.from(JSON.stringify(sendData),"utf-8")));
                // 监听客户端的数据
                clientTcpSocket.on('data', (data) => {
                  let sendData = {
                    channelId: clientTcpChannelId,
                    type: 3,
                    data:{
                      type: "tcp",
                      localIp: register.localIp,
                      localPort: register.localPort,
                      trueData: data
                    }
                  }
                  socket.write(lengthFieldEncoderIns.encode(Buffer.from(JSON.stringify(sendData),"utf-8")));
                });
                // 监听客户端断开连接事件
                clientTcpSocket.on('end', (data) => {
                  clientTcpSocketMap.delete(clientTcpChannelId);
                });
                clientTcpSocket.on('error', (error) => {
                  clientTcpSocketMap.delete(clientTcpChannelId);
                });
                clientTcpSocketMap.set(clientTcpChannelId,clientTcpSocket);
                clientTcpServerSocketMap.set(clientTcpSocket,clientTcpServer);
              })
              // 启动服务
              clientTcpServer.listen(register.port, () => {
                clientConnectTcpMap.set(clientTcpServer,clientConnectChannelId);
                sendData.data.push({msg:"tcp port:" + register.port + " success"});
                socket.write(lengthFieldEncoderIns.encode(Buffer.from(JSON.stringify(sendData),"utf-8")));
              });
              clientTcpServer.on("error",function (error) {
                console.error("客户端通道失败",error);
                sendData.data.push({msg:"tcp port:" + register.port + " fail"});
                socket.write(lengthFieldEncoderIns.encode(Buffer.from(JSON.stringify(sendData),"utf-8")))
              })
            }else if(register.type === "http"){
              if(null == clientConnectSubdomainMap.get(register.subdomain)){
                clientConnectSubdomainMap.set(register.subdomain,clientConnectChannelId);
                clientSubdomainConfigMap.set(register.subdomain,register);
                sendData.data.push({msg:"http subdomain:" + register.subdomain + " success"});
              }else{
                sendData.data.push({msg:"http subdomain:" + register.subdomain + " fail"});
              }
              socket.write(lengthFieldEncoderIns.encode(Buffer.from(JSON.stringify(sendData),"utf-8")))
            }
          })
        }else if(receiveData.type === 4){
          if(receiveData.data.type === "tcp"){
            let cacheClientTcp = clientTcpSocketMap.get(receiveData.channelId);
            if(null != cacheClientTcp){
              cacheClientTcp.write(Buffer.from(receiveData.data.trueData));
            }
          }else if(receiveData.data.type === "http"){
            let httpServer = httpServerMap.get(receiveData.channelId);
            if(null != httpServer){
              httpServer.res.writeHead(receiveData.data.statusCode, receiveData.data.headers);
              httpServer.res.end(Buffer.from(receiveData.data.body));
              // 由于HTTP请求是单次请求，请求发送结束后就可以删除该绑定通道
              httpServerMap.delete(receiveData.channelId);
            }
          }
        }else if(receiveData.type === 5){
          // 接收到客户端发来的失败状态消息
          if(receiveData.data.type === "tcp"){
            let cacheClientTcp = clientTcpSocketMap.get(receiveData.channelId);
            if(null != cacheClientTcp){
              cacheClientTcp.end();
            }
          }else if(receiveData.data.type === "http"){
            let httpServer = httpServerMap.get(receiveData.channelId);
            if(null != httpServer){
              httpServer.res.writeHead(500);
              httpServer.res.end(Buffer.from(JSON.stringify(receiveData.data.body)));
              // 由于HTTP请求是单次请求，请求发送结束后就可以删除该绑定通道
              httpServerMap.delete(receiveData.channelId);
            }
          }
        }
      });
      // 监听客户端的数据
      socket.on('data', (data) => {
        try{
          lengthFieldDecoderIns.read(data);
        }catch (error) {
          console.error("通道数据异常",error);
        }
      });
      // 监听客户端断开连接事件
      socket.on('end', (data) => {
        console.log('客户端断开连接')
      });
      // 监听客户端断开连接事件
      socket.on('error', (error) => {
        console.log(new Date().format("yyyy-MM-dd hh:mm:ss") + '  客户端异常关闭 clientConnectChannelId='+clientConnectChannelId,error);
        socket.end();
        // 删除客户端与服务端的连接
        clientConnectSocketMap.delete(clientConnectChannelId);
        // 删除客户端注册的TCP穿透连接
        clientConnectTcpMap.forEach((v,k,map)=>{
          if(v === clientConnectChannelId){
            clientTcpServerSocketMap.forEach((vc,kc,map) => {
              if(vc === k){
                kc.end();
                clientTcpServerSocketMap.delete(kc);
              }
            })
            k.close();
            clientConnectTcpMap.delete(k);
          }
        });
        // 删除客户端注册的HTTP穿透连接
        clientConnectSubdomainMap.forEach((v,k,map)=>{
          if(v === clientConnectChannelId){
            // 删除HTTP穿透配置
            clientSubdomainConfigMap.delete(k);
            clientConnectSubdomainMap.delete(k);
          }
        })
      });
    });

// 启动服务
    server.listen(serverConfig.bindPort, () => {
      console.log(new Date().format("yyyy-MM-dd hh:mm:ss") + '  服务创建成功 tcp port:'+serverConfig.bindPort)
    });
    server.on("error", function (error) {
      console.error("服务启动失败",error)
    })

    http.createServer(function (req, res) {
      let channelId = uuid.v1();

      httpServerMap.set(channelId,{req:req,res:res});
      // 定义了一个post变量，用于暂存请求体的信息
      let post = [];
      // 通过req的data事件监听函数，每当接受到请求体的数据，就累加到post变量中
      //当有数据请求时触发
      req.on('data', function(data){
        if(post.length === 0){
          post = data;
        }else{
          post = Buffer.concat([post,data]);
        }
      });

      req.on('end', function(){
        try{
          let subdomain = req.headers.host.substring(0,req.headers.host.indexOf(serverConfig.subdomainHost) - 1);
          let clientConnectChannelId = clientConnectSubdomainMap.get(subdomain);
          let clientSubdomainConfig = clientSubdomainConfigMap.get(subdomain);
          if(null == clientConnectChannelId || null == clientConnectSocketMap.get(clientConnectChannelId)){
            res.writeHead(404);
            res.end(Buffer.from("cros not find "+req.headers.host+" config!","utf-8"));
            httpServerMap.delete(channelId);
            return;
          }
          let cacheClientConnect = clientConnectSocketMap.get(clientConnectChannelId);
          let transData = {
            type: "http",
            localIp: clientSubdomainConfig.localIp,
            localPort: clientSubdomainConfig.localPort,
            headers: req.headers,
            url: req.url,
            method: req.method,
            postData: [...post]
          }
          let initData = {
            channelId: channelId,
            type: 3,
            data: transData
          }
          cacheClientConnect.write(lengthFieldEncoderIns.encode(Buffer.from(JSON.stringify(initData),"utf-8")));
        }catch (error) {
          console.log("http数据异常",error);
        }
      });
    }).listen(serverConfig.bindHttpPort);
    console.log(new Date().format("yyyy-MM-dd hh:mm:ss") + '  Server running at http://127.0.0.1:'+serverConfig.bindHttpPort+'/');
  }
}
module.exports = serverHandler;
