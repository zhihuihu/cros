## 项目说明
> `5`年前，初次接触`node.js`，写了一个粗糙的内网穿透`demo`，现在在`ai`的优化下重构了项目，实现`tcp`协议的内网穿透，支持多端口映射，支持加密传输，支持`http`域名方式的内网穿透。
## 功能说明
- [✓] 支持TCP协议的内网穿透
- [✓] 支持多端口映射
- [✓] 支持加密传输
- [✓] 支持`http`域名方式的内网穿透
- [✓] 支持`http的websocket`域名方式的内网穿透
- [ ] 支持`https`域名方式的内网穿透，但是你可以通过`nginx`反向代理的方式实现。

## 使用说明
> 不推荐使用源码方式安装，推荐使用`npm`安装。
- 项目源码地址：`https://github.com/zhihuihu/cros`
### 工具安装
```bash
npm install -g cros
```

## 使用案例
### `tcp`方式内网穿透
#### 服务端配置
##### 配置文件`server.yml`
```yaml
port: 3000       # 控制端口
httpPort: 3001   # 控制HTTP端口
crypto:
  password: "mySecurePassword123!" # 必须与客户端保持一致
```
##### 启动服务端
```bash
cros server server.yml
```

#### 客户端配置
##### 配置文件`client.yml`
```yaml
server:  # 服务端配置
  host: 127.0.0.1   # 服务端地址
  port: 3000        # 服务端端口
crypto:             # 加密配置
  password: "mySecurePassword123!" # 必须与服务端保持一致
tunnels:
  - remotePort: 8080  # 外网端口（必须唯一）
    type: tcp
    localHost: 192.168.8.134
    localPort: 8080
  - remotePort: 3002  # 另一个唯一端口
    type: tcp
    localHost: 192.168.8.134
    localPort: 22
```
##### 启动客户端
```bash
cros client client.yml
```

### `http`域名方式内网穿透
#### 服务端配置

- 建议配合`nginx`一起使用
> 因为可以通过`nginx`反向代理的方式实现`https`域名方式的内网穿透，还有使用`80`和`443`端口。
```
server {
	listen 80;
	server_name *.cros.huzhihui.com;
	location / {
		proxy_set_header X-Real-IP $remote_addr;
		proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
		proxy_set_header Host $http_host:80;
		proxy_set_header X-Nginx-Proxy true;
		proxy_pass http://127.0.0.1:3001;
	}
}
```
> 上面的配置用了泛解析，所以可以通过`*.cros.huzhihui.com`访问到服务端。
> 也可以通过`cros.huzhihui.com`访问到服务端。

##### 配置文件`server.yml`
```yaml
port: 3000       # 控制端口
httpPort: 3001   # 控制HTTP端口
crypto:
  password: "mySecurePassword123!" # 必须与客户端保持一致
```
##### 启动服务端
```bash
cros server server.yml
```

#### 客户端配置
##### 配置文件`client.yml`
```yaml
server:  # 服务端配置
  host: 127.0.0.1   # 服务端地址
  port: 3000        # 服务端端口
crypto:             # 加密配置
  password: "mySecurePassword123!" # 必须与服务端保持一致
tunnels:
  - type: http
    remoteDomain: home.cros.huzhihui.com  # 唯一域名（必须唯一）
    localHost: 192.168.8.134
    localPort: 8080
```
##### 启动客户端
```bash
cros client client.yml
```

## 详细说明
### 服务端使用指南

#### 配置文件`server.yml`
```yaml
port: 3000       # 控制端口
httpPort: 3001   # 控制HTTP端口
crypto:
  password: "mySecurePassword123!" # 必须与客户端保持一致
```
#### 启动服务端
```bash
cros server server.yml
```
#### 启动日志
```
[2025-04-09 05:19:43] [Server] Control server listening on 3000
[2025-04-09 05:19:43] [Server] Control HTTP server listening on 3001
[2025-04-09 05:20:11] [Server] Registered port 8080
[2025-04-09 05:20:11] [Server] Public server listening on 8080
[2025-04-09 05:20:11] [Server] Registered port 3002
[2025-04-09 05:20:11] [Server] Registered HTTP domain home.huzhihui.com
[2025-04-09 05:20:11] [Server] Public server listening on 3002
```

### 客户端使用指南

#### 配置文件`client.yml`
```yaml
server:  # 服务端配置
  host: 127.0.0.1   # 服务端地址
  port: 3000        # 服务端端口
crypto:             # 加密配置
  password: "mySecurePassword123!" # 必须与服务端保持一致
tunnels:
  - remotePort: 8080  # 外网端口（必须唯一）
    type: tcp
    localHost: 192.168.8.134
    localPort: 8080
  - remotePort: 3002  # 另一个唯一端口
    type: tcp
    localHost: 192.168.8.134
    localPort: 22
  - type: http
    remoteDomain: home.huzhihui.com  # 唯一域名（必须唯一）
    localHost: 192.168.8.134
    localPort: 8080
```
#### 启动客户端
```bash
cros client client.yml
```
#### 启动日志
```
[2025-04-09 05:20:11] [Client] Connected to server
[2025-04-09 05:20:11] [Client] Tunnel 8080 is available
[2025-04-09 05:20:11] [Client] Tunnel home.huzhihui.com is available
[2025-04-09 05:20:11] [Client] Tunnel 3002 is available
```

