# Aeon 项目一键部署需求文档

本文档列出使用 `docker-compose up -d` 一键部署 Aeon 项目所需的所有条件。

## 🎯 部署目标

使用一条命令完成部署：
```bash
docker-compose up -d
```

## ✅ 必需条件清单

### 1️⃣ 基础环境

| 项目 | 要求 | 检查命令 | 状态 |
|------|------|----------|------|
| **Docker** | >= 20.10 | `docker --version` | ⚠️ 需安装 |
| **Docker Compose** | >= 2.0 | `docker-compose --version` | ⚠️ 需安装 |
| **可用内存** | >= 2GB | `free -h` (Linux) | 🔍 需检查 |
| **可用磁盘** | >= 10GB | `df -h` | 🔍 需检查 |

---

### 2️⃣ Supabase 项目（必需）

Aeon 依赖 Supabase 提供以下服务：

| 服务 | 用途 | 配置位置 |
|------|------|----------|
| **PostgreSQL** | 数据库 | Supabase Dashboard |
| **Auth** | 用户认证 | 自动配置 |
| **Storage** | 文件存储（可选） | Bucket: `record-photos` |
| **Realtime** | 实时更新 | 自动启用 |

#### 获取 Supabase 配置

**步骤**：
1. 登录 [supabase.com](https://supabase.com)
2. 创建项目（如果没有）
3. 进入 **Settings → API**，获取：
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
4. 进入 **Settings → Database**，获取：
   - `Connection string` (Transaction mode) → `DATABASE_URL`

#### 执行数据库迁移（必需）

```bash
# 方式 1：使用 Supabase CLI（推荐）
supabase link --project-ref your-project-ref
supabase db push

# 方式 2：手动执行 SQL
# 在 Supabase Dashboard → SQL Editor 中依次执行：
# 1. supabase/migrations/001_enable_rls.sql
# 2. supabase/migrations/002_storage_policies.sql
```

#### 创建 Storage 桶（如使用 Supabase Storage）

**步骤**：
1. 进入 **Storage → Buckets**
2. 点击 **New Bucket**
3. 配置：
   - Name: `record-photos`
   - Public: `false`
   - File size limit: `10 MB`
   - Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/avif`

---

### 3️⃣ 环境变量配置（必需）

创建 `.env` 文件：

```bash
cp .env.example .env
nano .env
```

#### 必填变量

```bash
# ============================================
# Supabase 配置（必需）
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your_anon_key
SUPABASE_SERVICE_ROLE_KEY=eyJ...your_service_role_key
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.your-project.supabase.co:5432/postgres

# ============================================
# 应用配置（必需）
# ============================================
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=production

# ============================================
# 存储配置（必需）
# ============================================
# 选择存储模式：supabase | minio | hybrid
NEXT_PUBLIC_STORAGE_TYPE=supabase
```

#### MinIO 配置（仅当 STORAGE_TYPE=minio 或 hybrid 时）

```bash
# MinIO 连接
NEXT_PUBLIC_MINIO_ENDPOINT=minio
NEXT_PUBLIC_MINIO_PORT=9000
NEXT_PUBLIC_MINIO_USE_SSL=false
NEXT_PUBLIC_MINIO_BUCKET=aeon-photos

# MinIO 认证
NEXT_PUBLIC_MINIO_ACCESS_KEY=minioadmin
NEXT_PUBLIC_MINIO_SECRET_KEY=minioadmin
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
```

---

### 4️⃣ 项目文件（已包含）

| 文件 | 状态 | 说明 |
|------|------|------|
| `Dockerfile` | ✅ 已包含 | Next.js 镜像构建 |
| `docker-compose.yml` | ✅ 已包含 | 服务编排配置 |
| `.env.example` | ✅ 已包含 | 环境变量模板 |
| `.dockerignore` | ⚠️ 建议添加 | 排除不必要文件 |

---

## 🚀 完整部署流程

### 前置准备（一次性）

```bash
# 1. 安装 Docker 和 Docker Compose
# Ubuntu/Debian
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 验证安装
docker --version
docker-compose --version

# 2. 克隆项目
git clone https://github.com/your-username/aeon.git
cd aeon

# 3. 配置 Supabase（见上文"获取 Supabase 配置"）

# 4. 执行数据库迁移
supabase link --project-ref your-project-ref
supabase db push

# 5. 配置环境变量
cp .env.example .env
nano .env  # 填入 Supabase 配置
```

### 一键部署

```bash
# 模式 A：仅 Supabase Storage（默认）
docker-compose up -d app

# 模式 B：Supabase + MinIO
docker-compose --profile with-minio up -d
```

### 验证部署

```bash
# 1. 查看服务状态
docker-compose ps

# 预期输出：
# NAME          IMAGE              STATUS         PORTS
# aeon-app      aeon:latest        Up (healthy)   0.0.0.0:3000->3000/tcp

# 2. 查看日志
docker-compose logs -f app

# 3. 测试访问
curl http://localhost:3000

# 4. 浏览器访问
# http://localhost:3000
```

---

## ⚠️ 常见问题与解决

### 问题 1：Docker 守护进程未启动

```bash
# 错误
Cannot connect to the Docker daemon

# 解决
sudo systemctl start docker
sudo systemctl enable docker
```

### 问题 2：端口 3000 已被占用

```bash
# 错误
port is already allocated

# 解决方式 1：停止占用进程
lsof -i :3000
kill -9 <PID>

# 解决方式 2：修改端口
# 编辑 docker-compose.yml
ports:
  - "8080:3000"  # 改为 8080
```

### 问题 3：Supabase 连接失败

```bash
# 错误
Failed to connect to database

# 检查清单：
# 1. DATABASE_URL 是否正确
echo $DATABASE_URL

# 2. 网络是否可达
ping db.your-project.supabase.co

# 3. 防火墙是否阻止
sudo ufw allow 5432/tcp

# 4. Supabase 项目是否暂停
# 检查 Supabase Dashboard
```

### 问题 4：RLS 策略未应用

```bash
# 错误
User cannot access records

# 解决：手动执行迁移
# 在 Supabase SQL Editor 中执行：
# supabase/migrations/001_enable_rls.sql
# supabase/migrations/002_storage_policies.sql
```

### 问题 5：MinIO 桶未创建

```bash
# 错误
Bucket aeon-photos does not exist

# 解决：手动创建桶
docker exec aeon-minio mc alias set minio http://localhost:9000 minioadmin minioadmin
docker exec aeon-minio mc mb minio/aeon-photos
docker exec aeon-minio mc anonymous set download minio/aeon-photos
```

---

## 📋 部署前检查清单

### 必需项（阻塞部署）

- [ ] Docker 已安装（>= 20.10）
- [ ] Docker Compose 已安装（>= 2.0）
- [ ] Supabase 项目已创建
- [ ] 已获取 Supabase 配置（URL、密钥）
- [ ] 已执行数据库迁移（RLS + Storage 策略）
- [ ] `.env` 文件已创建并填写

### 推荐项（影响功能）

- [ ] Supabase Storage 桶已创建（如使用 Supabase Storage）
- [ ] 已修改 MinIO 默认密码（如使用 MinIO）
- [ ] 防火墙已配置（开放 3000、9000、9001 端口）
- [ ] 已配置域名和 SSL（生产环境）

### 可选项（优化体验）

- [ ] 已配置资源限制（CPU、内存）
- [ ] 已配置日志轮转
- [ ] 已设置健康检查告警
- [ ] 已配置自动备份

---

## 🎯 理想的"一键部署"体验

**目标**：新用户从零到运行只需 5 分钟。

### 当前状态

```bash
# 用户需要手动执行的步骤
1. 安装 Docker                    # 5 分钟
2. 创建 Supabase 项目             # 2 分钟
3. 获取配置并填入 .env            # 3 分钟
4. 执行数据库迁移                 # 2 分钟
5. docker-compose up -d           # 1 分钟
---
总计：~13 分钟
```

### 优化建议（未来改进）

#### 方案 1：本地化 Supabase（完全自托管）

```yaml
# docker-compose.yml 中包含 Supabase 服务
services:
  app:
    # ...
  
  postgres:
    image: supabase/postgres:latest
    # ...
  
  supabase-auth:
    image: supabase/gotrue:latest
    # ...
  
  supabase-storage:
    image: supabase/storage-api:latest
    # ...
```

**优点**：真正的一键部署，无需外部依赖  
**缺点**：复杂度高，资源占用大（至少 4GB 内存）

#### 方案 2：自动化迁移脚本

```bash
# entrypoint.sh
#!/bin/bash
# 1. 等待数据库就绪
# 2. 自动执行迁移
# 3. 启动应用
```

**优点**：减少手动步骤  
**缺点**：需要 Service Role Key（安全风险）

#### 方案 3：Setup Wizard（推荐）

首次访问 `http://localhost:3000/setup` 时引导配置：
1. 输入 Supabase 配置
2. 测试连接
3. 一键执行迁移
4. 完成设置

**优点**：用户体验好，安全  
**缺点**：需要额外开发

---

## 🔐 生产环境额外要求

### 安全配置

- [ ] 修改所有默认密码
- [ ] 使用强密码（至少 20 字符）
- [ ] 启用 HTTPS（推荐使用 Cloudflare Tunnel 或 Let's Encrypt）
- [ ] 配置防火墙（仅开放必要端口）
- [ ] 限制 Supabase Service Role Key 使用

### 监控与日志

- [ ] 配置健康检查告警
- [ ] 设置日志收集（ELK、Loki）
- [ ] 配置资源监控（Prometheus + Grafana）
- [ ] 设置错误追踪（Sentry）

### 备份与恢复

- [ ] 配置 Supabase 自动备份
- [ ] 配置 MinIO 数据备份
- [ ] 测试恢复流程
- [ ] 制定灾难恢复计划

---

## 📞 支持

遇到问题？
1. 查看本文档的"常见问题与解决"章节
2. 查看 `DOCKER_QUICK_START.md`
3. 提交 Issue：[GitHub Issues](https://github.com/your-username/aeon/issues)

---

**最后更新**：2026-06-14  
**版本**：1.0.0
