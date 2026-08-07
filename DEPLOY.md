# MomoBlog 部署指南

MomoBlog 是朋友圈式单用户博客：
- 前端：Vue 3 + Vant 4（`momo-blog/`）
- 后端：NestJS + better-sqlite3（`momo-blog-server/`）
- 生产地址：https://blog.codx.top（Nginx 托管静态文件 + 反代 /api）

## 一、后端部署

### 1. 安装依赖 + 构建

```bash
cd /root/web/opencode/pyq-opencode/momo-blog-server
npm install --registry=https://registry.npmmirror.com --no-audit --no-fund
npm run build
```

### 2. 环境变量

```bash
cp .env.example .env
# 修改 .env：PORT=3009, DB_PATH=./data/momoblog.db, JWT_SECRET=<随机>
# 同时把 AccessKey 写入 /root/.hermes/.env（备份脚本用）
```

### 3. 初始化数据

```bash
node dist/seed.js   # 创建 admin 用户 + 示例文章（单用户，密码在脚本里改）
```

### 4. systemd 服务

```bash
cat > /etc/systemd/system/momo-blog.service << 'EOF'
[Unit]
Description=MomoBlog NestJS Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/web/opencode/pyq-opencode/momo-blog-server
Environment=NODE_ENV=production
Environment=PORT=3009
Environment=DB_PATH=./data/momoblog.db
Environment=JWT_SECRET=<随机密钥>
Environment=UPLOAD_DIR=/var/www/momo-blog/images
Environment=CLIENT_ORIGIN=https://blog.codx.top
ExecStart=/usr/bin/node dist/main.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now momo-blog
```

## 二、前端部署

```bash
cd /root/web/opencode/pyq-opencode/momo-blog
npm install --registry=https://registry.npmmirror.com --no-audit --no-fund
npm run build

# 部署（先备份图片目录，再清空替换！）
mkdir -p /tmp/mi && cp -r /var/www/momo-blog/images/* /tmp/mi/
rm -rf /var/www/momo-blog/*
cp -r dist/* /var/www/momo-blog/
mkdir -p /var/www/momo-blog/images && cp -r /tmp/mi/* /var/www/momo-blog/images/
rm -rf /tmp/mi
```

> ⚠️ 部署前必须备份 images 目录：`rm -rf` 会清掉上传的图片。

## 三、Nginx 配置

```nginx
# /etc/nginx/sites-enabled/blog.codx.top
server {
    server_name blog.codx.top;
    root /var/www/momo-blog;
    index index.html;
    client_max_body_size 10m;

    # 安全头在 /etc/nginx/conf.d/security-headers.conf（include 方式）

    location /api/ {
        proxy_pass http://localhost:3009;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 本地图片长缓存
    location /images/ {
        expires 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
        try_files $uri =404;
    }

    # index.html 不缓存（hash 资源才缓存）
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # SPA 路由
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

HTTPS：`certbot --nginx -d blog.codx.top --redirect`（证书自动续期由 cert-check.sh 每天检查）

## 四、运维脚本（cron）

```bash
# 每日 3 点：数据库备份（本地 7 天 + 上传阿里云 OSS codx-top-blog-backup）
0 3 * * * /root/web/opencode/pyq-opencode/momo-blog-server/backup.sh >> .../backup.log 2>&1

# 每日 6 点：SSL 证书到期检查（<20 天自动续期）
0 6 * * * /root/web/opencode/pyq-opencode/momo-blog-server/cert-check.sh
```

## 五、常用命令

```bash
systemctl status momo-blog     # 服务状态
journalctl -u momo-blog -n 50  # 后端日志
sqlite3 data/momoblog.db ".tables"  # 查看表
```

## 六、账号

- 单用户：`admin`，密码在 src/seed.ts 或数据库 users 表（bcrypt 加密）
- 无注册接口（前端无注册页，后端无 register 端点）
