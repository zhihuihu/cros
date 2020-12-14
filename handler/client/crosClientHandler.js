const channelHandler = require('../channelHandler');

class crosClientHandler extends channelHandler{

  connect(channelHandlerContext, data) {
    let initData = {
      type: 1,
      registers: [
        {
          type: 'tcp',
          port: 8082,
          localIp: "192.168.8.11",
          localPort: 58001
        },
        {
          type: 'http',
          subdomain: "cos",
          localIp: "192.168.8.11",
          localPort: 58001
        }
      ]
    }
    let buffer = Buffer.from(JSON.stringify(initData),"utf-8");
    channelHandlerContext.write(this,buffer);
  }

  data(channelHandlerContext, data) {
    console.log("-->"+data);
  }
}

module.exports = crosClientHandler;
