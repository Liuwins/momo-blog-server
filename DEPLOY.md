# MomoBlog Server 部署指南

## 服务器环境要求

- Linux (Ubuntu 20.04+)
- Node.js 20+
- PostgreSQL 14+
- Nginx
- PM2

## 一、安装依赖

### 1. Node.js 20+
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v  # v20.x
```

### 2. PostgreSQL
```bash
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql

# 创建数据库和用户
sudo -u postgres psql
CREATE USER momoblog WITH PASSWORD 'momoblog_pass';
CREATE DATABASE momoblog OWNER momoblog;
\q
```

### 3. PM2
```bash
npm install -g pm2
```

### 4. Nginx
```bash
sudo apt install nginx
sudo systemctl start nginx
```

## 二、部署后端

```bash
# 上传代码到服务器
cd /var/www/momo-blog-server
npm install --production

# 配置环境变量
cp .env.example .env
nano .env  # 修改 DB_PASSWORD 和 JWT_SECRET

# 编译
npm run build

# 用 PM2 启动
pm2 start dist/main.js --name momoblog-server
pm2 save
pm2 startup
```

## 三、配置 Nginx + HTTPS

```nginx
# /etc/nginx/sites-available/momo-blog
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Let's Encrypt 免费证书
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

## 四、配置前端

修改前端 `src/api/request.js` 的 baseURL：
```js
baseURL: import.meta.env.VITE_API_URL || 'https://api.yourdomain.com/api'
```

`.env.production`:
```
VITE_API_URL=https://api.yourdomain.com
VITE_WS_URL=wss://api.yourdomain.com/notifications
```

## 五、监控

```bash
pm2 logs momoblog-server
pm2 monit
```
