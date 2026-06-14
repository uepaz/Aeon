# Aeon Docker 部署指南

本指南介绍如何使用 Docker 和 Docker Compose 部署 Aeon 应用，支持多种存储模式。

## 📋 前置要求

- Docker Engine >= 20.10
- Docker Compose >= 2.0
- 2GB+ 可用内存
- 10GB+ 可用磁盘空间

## 🗂️ 存储模式选择

Aeon 支持三种存储模式：

| 模式 | 描述 | 适用场景 | Docker 部署 |
|------|------|---------|------------|
| **Supabase** | 纯 Supabase Storage | 小型项目、快速部署 | ✅ 默认，无需额外配置 |
| **MinIO** | 自托管对象存储 | 大文件、完全自托管 | ✅ 包含 MinIO 容器 |
| **Hybrid** | Supabase DB + MinIO 文件 | 平衡方案，推荐 | ✅ 包含 MinIO 容器 |

---

## 🚀 快速开始

### 方式 1：仅 Supabase 模式（默认）

适合快速部署，无需自托管文件存储。

```bash
# 1. 复制环境变量
cp .env.example .env

# 2. 编辑 .env，填入 Supabase 配置
nano .env

# 必填项：
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
# DATABASE_URL=postgresql://...
# NEXT_PUBLIC_STORAGE_TYPE=supabase

# 3. 启动应用（仅 App 服务）
docker-compose up -d app

# 4. 查看日志
docker-compose logs -f app

# 5. 访问应用
# http://localhost:3000
```

### 方式 2：MinIO 混合模式（推荐生产环境）

包含自托管 MinIO 对象存储，适合大文件或完全自托管。

```bash
# 1. 复制环境变量
cp .env.example .env

# 2. 编辑 .env
nano .env

# 必填项：
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
# DATABASE_URL=postgresql://...

# MinIO 配置：
# NEXT_PUBLIC_STORAGE_TYPE=hybrid  # 或 minio
# NEXT_PUBLIC_MINIO_ENDPOINT=minio
# NEXT_PUBLIC_MINIO_PORT=9000
# NEXT_PUBLIC_MINIO_ACCESS_KEY=minioadmin
# NEXT_PUBLIC_MINIO_SECRET_KEY=minioadmin  # ⚠️ 生产环境必须修改
# MINIO_ROOT_USER=minioadmin
# MINIO_ROOT_PASSWORD=minioadmin  # ⚠️ 生产环境必须修改

# 3. 启动所有服务（App + MinIO）
docker-compose --profile with-minio up -d

# 4. 查看服务状态
docker-compose ps

# 5. 访问
# - 应用：http://localhost:3000
# - MinIO Console：http://localhost:9001（管理界面）
```

### 方式 3：完整部署（App + MinIO + Nginx）

包含 Nginx 反向代理，支持 SSL。

```bash
# 1. 配置环境变量（同方式 2）
cp .env.example .env
nano .env

# 2. 创建 Nginx 配置
mkdir -p nginx
# 创建 nginx/nginx.conf（见下文配置示例）

# 3. 启动所有服务
docker-compose --profile with-minio --profile with-nginx up -d

# 4. 访问
# - HTTP：http://localhost:80
# - HTTPS：https://localhost:443
# - MinIO Console：http://localhost:9001
```

---

## 🔧 环境变量配置

### 必需环境变量

```bash
# Supabase（必需）
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

# Application（必需）
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### 存储模式配置

#### A. Supabase 模式（默认）

```bash
NEXT_PUBLIC_STORAGE_TYPE=supabase
# 无需其他配置
```

#### B. Hybrid 模式（推荐）

```bash
NEXT_PUBLIC_STORAGE_TYPE=hybrid

# MinIO 连接（Docker 内部）
NEXT_PUBLIC_MINIO_ENDPOINT=minio
NEXT_PUBLIC_MINIO_PORT=9000
NEXT_PUBLIC_MINIO_USE_SSL=false

# MinIO 认证
NEXT_PUBLIC_MINIO_ACCESS_KEY=minioadmin
NEXT_PUBLIC_MINIO_SECRET_KEY=minioadmin  # ⚠️ 生产环境必须修改

# MinIO 管理员账号
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin  # ⚠️ 生产环境必须修改

# MinIO 桶名称
NEXT_PUBLIC_MINIO_BUCKET=aeon-photos
```

#### C. MinIO 模式（纯自托管）

```bash
NEXT_PUBLIC_STORAGE_TYPE=minio
# 其他配置同 Hybrid 模式
```

---

## 📊 Docker Compose 服务说明

### 服务列表

| 服务 | Profile | 端口 | 说明 |
|------|---------|------|------|
| `app` | default | 3000 | Next.js 应用 |
| `minio` | with-minio | 9000, 9001 | MinIO 对象存储 |
| `minio-init` | with-minio | - | MinIO 初始化（一次性）|
| `nginx` | with-nginx | 80, 443 | Nginx 反向代理 |

### Profile 使用

```bash
# 仅启动 App
docker-compose up -d app

# App + MinIO
docker-compose --profile with-minio up -d

# App + MinIO + Nginx
docker-compose --profile with-minio --profile with-nginx up -d

# 停止特定 profile
docker-compose --profile with-minio down
```

---

## 🗄️ MinIO 配置与使用

### 访问 MinIO Console

启动后访问：http://localhost:9001

**默认登录**：
- Username: `minioadmin`
- Password: `minioadmin`

⚠️ **生产环境必须修改默认密码！**

### 手动创建桶（如果自动初始化失败）

```bash
# 方式 1: 使用 MinIO Console（推荐）
# 登录后点击 "Buckets" → "Create Bucket" → 输入 "aeon-photos"

# 方式 2: 使用 mc 命令行
docker exec -it aeon-minio-init sh
mc alias set myminio http://minio:9000 minioadmin minioadmin
mc mb myminio/aeon-photos
mc anonymous set download myminio/aeon-photos
```

### MinIO 数据持久化

数据存储在 Docker Volume：`aeon-minio-data`

```bash
# 查看数据卷
docker volume inspect aeon-minio-data

# 备份数据
docker run --rm -v aeon-minio-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/minio-backup.tar.gz /data

# 恢复数据
docker run --rm -v aeon-minio-data:/data -v $(pwd):/backup \
  alpine tar xzf /backup/minio-backup.tar.gz -C /
```

---

## 🛡️ 生产环境安全配置

### 1. 修改 MinIO 默认密码

编辑 `.env`：

```bash
# ⚠️ 使用强密码（至少 20 字符）
MINIO_ROOT_USER=your_admin_username
MINIO_ROOT_PASSWORD=your_strong_password_here

NEXT_PUBLIC_MINIO_ACCESS_KEY=your_app_access_key
NEXT_PUBLIC_MINIO_SECRET_KEY=your_app_secret_key
```

### 2. 启用 MinIO SSL

```bash
# 生成 SSL 证书
mkdir -p minio/certs
# 将证书放入 minio/certs/public.crt 和 minio/certs/private.key

# 修改 docker-compose.yml
minio:
  volumes:
    - ./minio/certs:/root/.minio/certs:ro
  environment:
    - MINIO_OPTS=--address :9000 --console-address :9001 --certs-dir /root/.minio/certs

# 修改 .env
NEXT_PUBLIC_MINIO_USE_SSL=true
NEXT_PUBLIC_MINIO_ENDPOINT=your-domain.com
```

### 3. 限制 MinIO 桶权限

默认配置为 `download`（公开读取），生产环境建议设为私有：

```bash
docker exec aeon-minio mc anonymous set none myminio/aeon-photos
```

然后应用将通过 Pre-signed URL 访问。

### 4. 资源限制

编辑 `docker-compose.yml`，添加资源限制：

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G

  minio:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

---

## 📈 监控与日志

### 查看日志

```bash
# 所有服务
docker-compose logs -f

# 特定服务
docker-compose logs -f app
docker-compose logs -f minio

# 最近 100 行
docker-compose logs --tail=100 app
```

### 健康检查

```bash
# 查看容器健康状态
docker-compose ps

# App 健康检查
curl http://localhost:3000

# MinIO 健康检查
curl http://localhost:9000/minio/health/live
```

### 资源监控

```bash
# 查看资源使用
docker stats aeon-app aeon-minio

# MinIO 存储使用
docker exec aeon-minio df -h /data
```

---

## 🔄 更新与维护

### 更新应用

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 重新构建
docker-compose build app

# 3. 滚动更新
docker-compose up -d --no-deps --build app

# 4. 清理旧镜像
docker image prune -f
```

### 更新 MinIO

```bash
# 1. 停止 MinIO
docker-compose stop minio

# 2. 拉取最新镜像
docker pull minio/minio:latest

# 3. 重启（数据保留在 volume 中）
docker-compose --profile with-minio up -d minio
```

---

## 🐛 故障排查

### MinIO 无法启动

```bash
# 检查日志
docker-compose logs minio

# 常见问题：
# 1. 端口冲突（9000/9001 已被占用）
# 解决：修改 docker-compose.yml 端口映射

# 2. 数据卷权限问题
docker volume rm aeon-minio-data
docker-compose --profile with-minio up -d
```

### MinIO 桶未自动创建

```bash
# 查看初始化日志
docker-compose logs minio-init

# 手动创建
docker exec -it aeon-minio mc alias set myminio http://localhost:9000 minioadmin minioadmin
docker exec -it aeon-minio mc mb myminio/aeon-photos
docker exec -it aeon-minio mc anonymous set download myminio/aeon-photos
```

### App 无法连接 MinIO

```bash
# 1. 检查网络连通性
docker exec aeon-app ping minio

# 2. 检查环境变量
docker exec aeon-app env | grep MINIO

# 3. 检查 MinIO 是否健康
docker-compose ps minio
```

### 照片上传失败

```bash
# 1. 检查存储模式
docker exec aeon-app env | grep STORAGE_TYPE

# 2. 检查 MinIO 桶权限
docker exec aeon-minio mc anonymous get myminio/aeon-photos

# 3. 查看应用日志
docker-compose logs -f app | grep -i "upload\|storage\|minio"
```

---

## 🧹 清理与卸载

### 停止服务

```bash
# 停止所有服务
docker-compose --profile with-minio --profile with-nginx down

# 仅停止不删除
docker-compose stop
```

### 完全清理

```bash
# ⚠️ 警告：将删除所有数据

# 1. 停止并删除容器
docker-compose --profile with-minio down

# 2. 删除数据卷（包括 MinIO 数据）
docker volume rm aeon-minio-data aeon-app-data

# 3. 删除镜像
docker rmi aeon:latest minio/minio:latest

# 4. 清理网络
docker network rm aeon-network
```

---

## 📦 Nginx 配置示例

创建 `nginx/nginx.conf`：

```nginx
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    upstream minio {
        server minio:9000;
    }

    # HTTP → HTTPS 重定向
    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS - App
    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;

        location / {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }

    # HTTPS - MinIO Console
    server {
        listen 443 ssl http2;
        server_name minio.your-domain.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        location / {
            proxy_pass http://minio:9001;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
```

---

## 📞 支持

如有问题，请：
1. 查看日志：`docker-compose logs -f`
2. 检查 [故障排查](#-故障排查) 章节
3. 提交 Issue：[GitHub Issues](https://github.com/your-username/aeon/issues)

---

**最后更新**：2026-06-14  
**版本**：1.1.0（新增 MinIO 支持）
