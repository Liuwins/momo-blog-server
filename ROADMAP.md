# MomoBlog 优化路线图

本文档记录项目的待优化项，供本地 AI 开发参考。

---

## 🔴 高优先级（建议先做）

### 1. 通知中心 UI
- **状态**: 后端 WebSocket 已就绪，前端未接
- **位置**: `momo-blog-server/src/modules/notifications/`
- **目标**: 
  - 博主收到评论/点赞时实时通知
  - 通知列表页面（`/notifications`）
  - 未读消息计数（TabBar 上显示红点）
- **后端已有**: `NotificationsGateway`、`NotificationsService`、`/api/notifications` 接口
- **前端需要**: 通知页组件、WebSocket 连接、未读计数显示

### 2. 博主后台管理界面
- **状态**: 审核功能分散在文章详情页，无统一后台
- **目标**:
  - 管理后台路由 `/admin`
  - 待审核评论列表（一键通过/拒绝）
  - 文章管理（列表、编辑、删除）
  - 数据统计（文章数、评论数、点赞数）
- **后端已有**: `/api/comments/admin/pending`、`/api/comments/admin/pending-count`
- **前端需要**: Admin 页面、路由守卫（仅 admin 可访问）

### 3. 评论弹窗软键盘适配
- **状态**: 移动端弹出键盘时输入框被遮挡
- **位置**: `momo-blog/src/views/Home.vue` 评论弹窗
- **目标**: 键盘弹出时输入框始终可见
- **方案**: 使用 `position: fixed` + `bottom: env(keyboard-inset-height)` 或监听 `resize` 事件

---

## 🟡 中优先级

### 4. PWA 离线访问
- **状态**: 未配置
- **目标**:
  - 添加 `manifest.json`
  - 添加 Service Worker
  - 支持"添加到主屏幕"
  - 离线缓存静态资源
- **方案**: 使用 `vite-plugin-pwa`

### 5. 单元测试
- **状态**: 0 测试覆盖
- **目标**:
  - 后端：核心 service 单元测试（auth、posts、comments）
  - 前端：核心组件测试（PostCard、CommentList）
- **工具**: 后端 Jest，前端 Vitest（已安装）

---

## 🟢 低优先级

### 6. 文章编辑历史版本
- **状态**: 编辑直接覆盖，无版本记录
- **目标**: 保存编辑历史，支持回滚
- **方案**: 新增 `post_versions` 表，每次编辑前保存快照

### 7. 评论回复通知
- **状态**: 游客 A 评论后，游客 B 回复了 A，A 不知道
- **目标**: 被回复者收到通知
- **方案**: 评论回复时创建通知（后端已支持，需前端触发）

### 8. CSP Nonce
- **状态**: 使用 `unsafe-inline`，安全略弱
- **目标**: 加 nonce 增强 XSS 防护
- **方案**: Nginx 配置 `$request_id` 作为 nonce

### 9. CI/CD
- **状态**: GitHub Actions 未配置（之前 billing 问题）
- **目标**: 推送后自动构建部署
- **方案**: GitHub Actions + SSH 部署到服务器

---

## 开发注意事项

### 通用规则
1. **每次改动前先 `git pull` 拉取最新代码**
2. **改动后运行 `npm run build` 确认无构建错误**
3. **提交前检查无敏感信息泄露**
4. **提交信息格式**: `feat: xxx` / `fix: xxx` / `chore: xxx`

### 前端注意
- 删除文件后检查所有 import 引用
- 构建缓存问题：`npm run build` 已自动清理缓存
- 移动端优先，测试 Chrome DevTools 移动端模拟

### 后端注意
- `.env` 文件不要提交到 git
- 数据库迁移：修改 entity 后需重新 `npm run build && node dist/seed.js`
- JWT Guard：公开接口用 `OptionalJwtAuthGuard`，私有接口用 `JwtAuthGuard`

### 数据库
- SQLite 文件：`momo-blog-server/data/momoblog.db`
- 重置数据：`node dist/seed.js`（会清空重建）
- 默认账号：`admin` / `admin123`

---

## 技术栈速查

| 层 | 技术 |
|---|------|
| 前端 | Vue 3 + Vant 4 + Pinia + Vue Router + Vite |
| 后端 | NestJS + TypeORM + better-sqlite3 + JWT |
| 部署 | Nginx + systemd + Let's Encrypt |
| 存储 | 本地磁盘（图片）+ SQLite（数据库）|
