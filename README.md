## cros 内网穿透工具
### 现阶段工具支持功能
* ### tcp内网穿透
* ### http内网穿透
* ### 其他功能暂时不想开发

### 项目说明
* 项目分为服务端和客户端
* 服务端 为部署在公网服务器的一端接收整个请求
* 客户端 为部署在用户内网中，转发公网过来的请求，路由到指定服务
* 项目可以采用如下两种方式部署
* 一、采用脚手架部署客户端和服务端
* npm install cros -g
* 运行服务端 cros server serverConfig.json 
* serverConfig.json 是服务端的配置文件路径，具体配置在下面
* 运行客户端 cros client clientConfig.json
* clientConfig.json 是服务端的配置文件路径，具体配置在下面
* 二、采用源码方式部署客户端和服务端
* 项目clone下来 git clone https://github.com/zhihuihu/cros.git
* 执行 npm install
* 然后配置一下文件，分为服务端和客户端

### 服务端nginx配置（如果需要域名穿透）
```shell script
# node内网穿透
server {
  listen 80;
  # 泛型域名
  server_name *.crosn.aaa.com;
  location / {
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Host $http_host:80;
    proxy_set_header X-Nginx-Proxy true;
    proxy_set_header Connection "";
    # 服务端配置的http的端口
    proxy_pass http://127.0.0.1:7101/;
  }
}
```
### server.config配置
```
* 服务端启动 node ./server/server.js 或者脚手架启动 cros server serverConfig.json *
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
* 客户端启动 node ./client/client.js 或者脚手架启动 cros client clientConfig.json *
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
