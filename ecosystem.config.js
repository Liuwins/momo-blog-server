// PM2 进程管理配置（非 Docker 部署备选方案）
// 用法：NODE_ENV=production pm2 start ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'momo-blog-server',
      script: 'dist/main.js',
      instances: 1, // SQLite 单文件写锁，不要多实例
      autorestart: true,
      max_restarts: 10,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      // 日志输出到 logs/ 目录（与 winston 日志分离，pm2 自身日志）
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
