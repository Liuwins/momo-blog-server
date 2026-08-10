# MomoBlog 后端

NestJS + TypeORM + better-sqlite3

## 开发

```bash
npm install
cp .env.example .env
# 编辑 .env 配置 JWT_SECRET 等
npm run build
node dist/seed.js   # 初始化数据
npm run start:dev
```

## 构建

```bash
npm run build
npm run start:prod
```

## 目录结构

```
src/
├── entities/       # TypeORM 实体
├── modules/        # 业务模块
│   ├── auth/       # 认证
│   ├── comments/   # 评论
│   ├── likes/      # 点赞
│   ├── posts/      # 文章
│   ├── upload/     # 上传
│   └── users/      # 用户
├── data-source.ts  # 数据源配置
├── seed.ts         # 初始化数据
└── main.ts         # 入口
```

## 环境变量

`.env`：

```
PORT=3009
DB_PATH=./data/momoblog.db
JWT_SECRET=your_random_secret
UPLOAD_DIR=/var/www/momo-blog/images
CLIENT_ORIGIN=https://yourdomain.com
```

## License

MIT
