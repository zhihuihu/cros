

## Project Description
> Five years ago, I first encountered Node.js and wrote a rough demo for intranet penetration. This project has now been refactored with AI assistance, implementing TCP-based intranet penetration, supporting multi-port mapping, encrypted transmission, and HTTP domain-based intranet penetration.

## Features
- [✓] Supports TCP protocol intranet penetration
- [✓] Supports multi-port mapping
- [✓] Supports encrypted transmission
- [✓] Supports HTTP domain-based intranet penetration
- [✓] Supports HTTP WebSocket domain-based intranet penetration
- [ ] Supports HTTPS domain-based intranet penetration (you can implement this via an Nginx reverse proxy).

## Usage
> Source code installation is not recommended. The npm method is recommended.
- Project source code: `https://github.com/zhihuihu/cros`

### Tool Installation
```bash
npm install -g cros
```

## Usage Examples
### TCP-Based Intranet Penetration
#### Server Configuration
##### Configuration File `server.yml`
```yaml
port: 3000       # Control port
httpPort: 3001   # Control HTTP port
crypto:
  password: "mySecurePassword123!" # Must match the client configuration
```
##### Start Server
```bash
cros server server.yml
```

#### Client Configuration
##### Configuration File `client.yml`
```yaml
server:  # Server configuration
  host: 127.0.0.1   # Server address
  port: 3000        # Server port
crypto:             # Encryption configuration
  password: "mySecurePassword123!" # Must match the server configuration
tunnels:
  - remotePort: 8080  # External port (must be unique)
    type: tcp
    localHost: 192.168.8.134
    localPort: 8080
  - remotePort: 3002  # Another unique port
    type: tcp
    localHost: 192.168.8.134
    localPort: 22
```
##### Start Client
```bash
cros client client.yml
```

### HTTP Domain-Based Intranet Penetration
#### Server Configuration
- It is recommended to use together with Nginx
> This is because HTTPS domain-based penetration can be implemented via an Nginx reverse proxy, and it also utilizes ports 80 and 443.
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
> The configuration above uses a wildcard DNS record, so you can access the server via `*.cros.huzhihui.com`.
> You can also access the server directly via `cros.huzhihui.com`.

##### Configuration File `server.yml`
```yaml
port: 3000       # Control port
httpPort: 3001   # Control HTTP port
crypto:
  password: "mySecurePassword123!" # Must match the client configuration
```
##### Start Server
```bash
cros server server.yml
```

#### Client Configuration
##### Configuration File `client.yml`
```yaml
server:  # Server configuration
  host: 127.0.0.1   # Server address
  port: 3000        # Server port
crypto:             # Encryption configuration
  password: "mySecurePassword123!" # Must match the server configuration
tunnels:
  - type: http
    remoteDomain: home.cros.huzhihui.com  # Unique domain (must be unique)
    localHost: 192.168.8.134
    localPort: 8080
```
##### Start Client
```bash
cros client client.yml
```

## Detailed Instructions
### Server Usage Guide
#### Configuration File `server.yml`
```yaml
port: 3000       # Control port
httpPort: 3001   # Control HTTP port
crypto:
  password: "mySecurePassword123!" # Must match the client configuration
```
#### Start Server
```bash
cros server server.yml
```
#### Startup Logs
```
[2025-04-09 05:19:43] [Server] Control server listening on 3000
[2025-04-09 05:19:43] [Server] Control HTTP server listening on 3001
[2025-04-09 05:20:11] [Server] Registered port 8080
[2025-04-09 05:20:11] [Server] Public server listening on 8080
[2025-04-09 05:20:11] [Server] Registered port 3002
[2025-04-09 05:20:11] [Server] Registered HTTP domain home.huzhihui.com
[2025-04-09 05:20:11] [Server] Public server listening on 3002
```

### Client Usage Guide
#### Configuration File `client.yml`
```yaml
server:  # Server configuration
  host: 127.0.0.1   # Server address
  port: 3000        # Server port
crypto:             # Encryption configuration
  password: "mySecurePassword123!" # Must match the server configuration
tunnels:
  - remotePort: 8080  # External port (must be unique)
    type: tcp
    localHost: 192.168.8.134
    localPort: 8080
  - remotePort: 3002  # Another unique port
    type: tcp
    localHost: 192.168.8.134
    localPort: 22
  - type: http
    remoteDomain: home.huzhihui.com  # Unique domain (must be unique)
    localHost: 192.168.8.134
    localPort: 8080
```
#### Start Client
```bash
cros client client.yml
```
#### Startup Logs
```
[2025-04-09 05:20:11] [Client] Connected to server
[2025-04-09 05:20:11] [Client] Tunnel 8080 is available
[2025-04-09 05:20:11] [Client] Tunnel home.huzhihui.com is available
[2025-04-09 05:20:11] [Client] Tunnel 3002 is available
```
