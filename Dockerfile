# ===== 构建阶段：编译 TS + 原生模块 =====
FROM node:20-slim AS builder
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
# 删除 devDependencies，只保留生产依赖
RUN npm prune --production

# ===== 运行阶段：最小镜像 =====
FROM node:20-slim AS runner
WORKDIR /app
# 拷贝编译好的 node_modules（含 better-sqlite3 / sharp 原生模块）和 dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
# 持久化目录
RUN mkdir -p data images logs
EXPOSE 3001
# 生产环境：NODE_ENV=production 触发 migrationsRun，关闭 synchronize
ENV NODE_ENV=production
CMD ["node", "dist/main.js"]
