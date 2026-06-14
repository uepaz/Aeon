# Aeon 快速部署指南

## 🚀 真正的一键部署

只需配置 `.env`，然后 `docker-compose up -d`，**无需手动执行任何数据库操作**！

---

## ✅ 部署步骤（3 分钟）

### 1. 克隆项目

```bash
git clone https://github.com/your-username/aeon.git
cd aeon
```

### 2. 配置环境变量

```bash
# 复制模板
cp .env.example .env

# 编辑配置（仅需填写 Supabase 信息）
nano .env
```

**必填项**（从 Supabase Dashboard 获取）：

```bash
# Supabase 配置（必需）
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your_anon_key
SUPABASE_SERVICE_ROLE_KEY=eyJ...your_service_role_key  # ⚠️ 必需，用于自动初始化
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.your-project.supabase.co:5432/postgres

# 应用配置
NEXT_PUBLIC_APP_URL=http://localhost:3000

# 存储模式
NEXT_PUBLIC_STORAGE_TYPE=supabase  # 或 minio / hybrid
```

**获取 Supabase 配置**：
1. 登录 [supabase.com](https://supabase.com)
2. 创建项目（如果没有）
3. 进入 **Settings → API**：
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
4. 进入 **Settings → Database**：
   - `Connection string` (Transaction mode) → `DATABASE_URL`

### 3. 一键启动 🎉

```bash
# 启动应用（自动执行数据库迁移）
docker-compose up -d

# 查看启动日志
docker-compose logs -f app
```

**启动过程**：
```
🚀 Aeon 启动脚本
================================
⏳ 等待数据库连接...
✅ 数据库连接成功
🔍 检查数据库迁移状态...
🔧 执行数据库迁移...
📋 应用 RLS 策略...
  ⏳ 启用 RLS...
  ✅ 启用 RLS 完成
  ⏳ 创建策略: Users can view own settings...
  ✅ 创建策略完成
✅ 数据库迁移完成
================================
🎉 启动 Next.js 应用...
================================
```

### 4. 访问应用

打开浏览器访问：http://localhost:3000

---

## 🎯 自动化功能

### ✅ 启动时自动执行

1. **检测数据库连接**
   - 等待 Supabase 数据库就绪
   - 验证连接配置

2. **检查迁移状态**
   - 查询 `_aeon_migrations` 表
   - 判断是否需要初始化

3. **自动执行迁移**（首次启动）
   - 启用 RLS（Row Level Security）
   - 创建所有安全策略
   - 创建 Storage 策略
   - 创建辅助函数（照片计数）
   - 记录迁移历史

4. **启动应用**
   - 自动跳过已执行的迁移
   - 直接启动 Next.js

### ✅ 幂等性保证

重复启动安全：
- 已执行的迁移不会重复执行
- 已存在的策略会被跳过
- 多次启动不会出错

---

## 📦 部署模式

### 模式 A：仅 Supabase Storage（默认）

```bash
# .env 配置
NEXT_PUBLIC_STORAGE_TYPE=supabase

# 启动
docker-compose up -d app
```

### 模式 B：Supabase + MinIO

```bash
# .env 配置
NEXT_PUBLIC_STORAGE_TYPE=hybrid  # 或 minio

# 启动（App + MinIO）
docker-compose --profile with-minio up -d
```

---

## 🔒 安全说明

### Service Role Key 的使用

**为什么需要 Service Role Key？**

Service Role Key 用于在容器启动时自动执行数据库迁移：
- 创建 RLS 策略
- 创建 Storage 策略
- 创建辅助函数

**安全措施**：

✅ **仅在启动时使用**
- 迁移完成后不再使用
- 应用运行时使用 Anon Key

✅ **不暴露给客户端**
- 仅在服务端使用
- 不包含在打包的前端代码中

✅ **环境变量保护**
- 存储在 `.env` 文件中
- `.env` 已添加到 `.gitignore`

**生产环境建议**：

如果你不希望在生产环境使用 Service Role Key，可以：

1. **手动执行迁移**（一次性）
   ```bash
   # 在 Supabase SQL Editor 中执行：
   # supabase/migrations/001_enable_rls.sql
   # supabase/migrations/002_storage_policies.sql
   ```

2. **移除 Service Role Key**
   ```bash
   # .env 中删除（启动时会跳过迁移检查）
   # SUPABASE_SERVICE_ROLE_KEY=
   ```

---

## 🐛 故障排查

### 问题 1：迁移失败

```bash
# 查看详细日志
docker-compose logs app

# 手动执行迁移
# 1. 登录 Supabase Dashboard
# 2. 进入 SQL Editor
# 3. 依次执行 supabase/migrations/ 下的 SQL 文件
```

### 问题 2：数据库连接超时

```bash
# 检查 DATABASE_URL 是否正确
echo $DATABASE_URL

# 检查网络连通性
ping db.your-project.supabase.co

# 检查 Supabase 项目状态（可能已暂停）
```

### 问题 3：权限不足

```bash
# 确保使用的是 Service Role Key（不是 Anon Key）
# Service Role Key 以 'eyJ...' 开头，长度通常 > 200 字符
```

---

## 🔧 常用命令

```bash
# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f app

# 重启服务（会重新检查迁移）
docker-compose restart app

# 停止服务
docker-compose down

# 完全清理（⚠️ 删除所有数据）
docker-compose down -v
```

---

## 📋 检查清单

启动前确认：

- [ ] Docker 已安装（>= 20.10）
- [ ] Docker Compose 已安装（>= 2.0）
- [ ] Supabase 项目已创建
- [ ] 已获取 4 个必需的环境变量
- [ ] `.env` 文件已创建并填写
- [ ] ✅ **无需手动执行数据库操作**

---

## 🎉 优势

### vs 手动迁移

| 方式 | 步骤 | 耗时 | 出错风险 |
|------|------|------|---------|
| **手动** | 5+ 步骤 | ~10 分钟 | 高 |
| **自动** | 2 步骤 | ~3 分钟 | 低 |

### 自动化带来的好处

✅ **零手动操作**
- 无需登录 Supabase Dashboard
- 无需复制粘贴 SQL
- 无需担心执行顺序

✅ **一致性保证**
- 所有环境使用相同的迁移脚本
- 减少人为错误
- 可重复部署

✅ **开发体验**
- 新成员快速上手
- CI/CD 友好
- 测试环境秒级创建

---

## 📚 更多文档

- `README.md` - 项目总览
- `DEPLOYMENT_REQUIREMENTS.md` - 详细部署需求
- `SECURITY.md` - 安全架构指南

---

**最后更新**：2026-06-14  
**版本**：2.0.0（自动迁移版）

🎉 **现在只需配置 .env，一键启动即可！**
