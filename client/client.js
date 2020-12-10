const net = require('net');
const delimiterDecoder = require('../delimiter/delimiterDecoder');

let chinnalMap = new Map();
let delimiterDecoderIns = new delimiterDecoder(Buffer.from("$_"),100*1024*1024,function(completeData){
  console.log('接收CROS服务端的数据: ')
  let transData = JSON.parse(completeData.toString());
  let chinnalId = transData.chinnalId;
  if(chinnalMap.get(chinnalId)){
    let forwardClient = chinnalMap.get(transData.chinnalId);
    let b = Buffer.from(transData.trueData.data);
    forwardClient.write(b)
  }else{
    // 连接服务器
    const forwardClient = net.connect({host: "192.168.8.11",port: 58001}, () => {
      console.log('连接内网真实服务器');
      let b = Buffer.from(transData.trueData.data);
      forwardClient.write(b)
      chinnalMap.set(transData.chinnalId,forwardClient);
    })
    // 接收服务端的数据
    forwardClient.on('data', (data) => {
      console.log('接收内网真实服务端的数据: ');
      let initData = {
        type: 2,
        chinnalId: chinnalId,
        trueData: data
      }
      let buffer = Buffer.from(JSON.stringify(initData)+"$_","utf-8");
      client.write(buffer)
    })
    // 断开连接
    forwardClient.on('end', () => {
      console.log('断开连接')
      chinnalMap.forEach((v,k)=>{
        if(v == forwardClient){
          // 删除连接
          chinnalMap.delete(k);
        }
      })
    })
  }
});
// 连接服务器
const client = net.connect({port: 8080}, () => {

  console.log('CROS客户端连接服务器');
  let initData = {
    type: 1,
    port: 8082,
    localIp: "192.168.8.11",
    localPort: 58001
  }
  let buffer = Buffer.from(JSON.stringify(initData)+"$_","utf-8");
  client.write(buffer)
  //client.write(JSON.stringify(initData))
})
// 接收服务端的数据
client.on('data', (data) => {
  delimiterDecoderIns.read(data);
})
// 断开连接
client.on('end', () => {
  console.log('断开连接')

})
