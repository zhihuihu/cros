## cros 内网穿透工具
### 现阶段工具支持功能
* ### tcp内网穿透
* ### http内网穿透
* ### 其他功能暂时不想开发

### server.config配置
```
* 项目clone下来
* 执行 npm install
* 然后配置一下文件，分为服务端和客户端
```
```
* 服务端启动 node ./server/server.js*
{
  // 服务开启的tcp端口供服务端和客户端通信
  "bindPort": 8080,
  // 服务支持http内网穿透的端口
  "bindHttpPort": 8081,
  // 客户端连接认证的token
  "token": "12345676788",
  // 通过域名内网穿透的基础域名
  "subdomainHost": "huzhihui.com"
}
```

### client.json配置

```
* 客户端启动 node ./client/client.js *
{
  // 服务端的IP地址
  "serverIp": "127.0.0.1",
  // 服务端的tcp端口
  "serverPort": 8080,
  // 认证的token
  "token": "12345676788",
  // 需要绑定的穿透服务
  "registers": [
    // tcp端口穿透
    {
      // 穿透类型
      "type": "tcp",
      // 外网暴露端口
      "port": 8082,
      // 内网服务IP
      "localIp": "192.168.8.11",
      // 内网服务端口
      "localPort": 58001
    },
    {
      // 穿透类型
      "type": "http",
      // 外网暴露子域名 需要和 subdomainHost 拼接在一起才是完整域名
      "subdomain": "cos",
      // 内网服务IP
      "localIp": "192.168.8.11",
      // 内网服务端口
      "localPort": 58001
    }
  ]
}
* registers中可以配置多个{}，穿透多个不同的服务 *
* 采用tcp方式最后访问地址是  serverIp:port 如 106.12.3.22:8082 *
* 采用http方式最后访问地址是   subdomain.subdomainHost 如  cos.huzhihui.com *
```
