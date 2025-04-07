# 项目说明
> `5`年前，初次接触`node.js`，写了一个粗糙的内网穿透`demo`，现在在`ai`的优化下重构了项目，先实现TCP的内网穿透，后续会显现`http`域名方式的内网穿透。
## 使用说明
> 不推荐使用源码方式安装，推荐使用`npm`安装。
### 工具安装
```bash
npm install -g cros
```
### 服务端使用指南

#### 配置文件`server.yml`
```yaml
port: 3000
crypto:
  password: "mySecurePassword123!" # 必须与客户端保持一致
```
#### 启动服务端
```bash
cros server server.yml
```
#### 启动日志
```
[2025-04-07 03:02:45] [Server] Control server listening on 3000
[2025-04-07 03:02:55] [Server] Registered port 8080
[2025-04-07 03:02:55] [Server] Public server listening on 8080
[2025-04-07 03:02:55] [Server] Registered port 3002
[2025-04-07 03:02:55] [Server] Public server listening on 3002
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
    localHost: 192.168.8.11  # 内网地址
    localPort: 8080  # 内网端口
  - remotePort: 3002  # 另一个唯一端口
    localHost: 192.168.8.11
    localPort: 22
```
#### 启动客户端
```bash
cros server client.yml
```
#### 启动日志
```
[2025-04-07 03:02:55] [Client] Connected to server
[2025-04-07 03:02:55] [Client] Tunnel 8080 is available
[2025-04-07 03:02:55] [Client] Tunnel 3002 is available
```