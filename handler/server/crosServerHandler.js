const channelHandler = require('../channelHandler');

class crosServerHandler extends channelHandler{

  data(channelHandlerContext, data) {
    let receiveData = JSON.parse(data);
    // 如果是客户端注册到服务端来
    if(receiveData.type === 1){
      receiveData.registers.forEach((register,index,arr) => {
        // 如果注册的是tcp
        if(register.type === "tcp"){
          const registerServer = net.createServer((registerServer) => {
            let chinnalId = uuid.v1();

          })
          // 启动服务
          registerServer.listen(register.port, () => {
          });
        }
      })
    }
    channelHandlerContext.write(this,Buffer.from("收到消息啦！！！"))
  }


  error(channelHandlerContext, err) {
    console.error("channel error：",err);
  }
}

module.exports = crosServerHandler;
