# Aeon Docker 快速部署指南

两种部署模式，一条命令启动。

## 🚀 快速开始

### 1. 准备环境变量

```bash
cp .env.example .env
nano .env  # 填入 Supabase 配置
```

### 2. 选择部署模式

#### 模式 A：仅 Supabase（默认，推荐小项目）

```bash
# .env 配置
NEXT_PUBLIC_STORAGE_TYPE=supabase

# 启动
docker-compose up -d app

# 访问：http://localhost:3000
```

#### 模式 B：Supabase + MinIO（推荐生产环境）

```bash
# .env 配置
NEXT_PUBLIC_STORAGE_TYPE=hybrid  # 或 minio

# 启动（App + MinIO）
docker-compose --profile with-minio up -d

# 访问：
# - 应用：http://localhost:3000
# - MinIO Console：http://localhost:9001
#   登录：minioadmin / minioadmin（⚠️ 生产环境必须修改）
```

---

## 📋 环境变量说明

### 必需配置

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
DATABASE_URL=postgresql://...

# 应用
NEXT_PUBLIC_APP_URL=https://your-domain.com

# 存储模式
NEXT_PUBLIC_STORAGE_TYPE=supabase  # 或 minio / hybrid
```

### MinIO 配置（使用 MinIO 时）

```bash
# 连接
NEXT_PUBLIC_MINIO_ENDPOINT=minio
NEXT_PUBLIC_MINIO_PORT=9000
NEXT_PUBLIC_MINIO_BUCKET=aeon-photos

# 认证（⚠️ 生产环境必须修改）
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
```

---

## 🔧 常用命令

```bash
# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f app
docker-compose logs -f minio

# 停止服务
docker-compose down

# 完全清理（⚠️ 删除所有数据）
docker-compose down -v

# 重启服务
docker-compose restart app
docker-compose restart minio
```

---

## 🛡️ 生产环境检查清单

- [ ] 修改 MinIO 默认密码（`.env` 中的 `MINIO_ROOT_USER/PASSWORD`）
- [ ] 设置强密码（至少 20 字符）
- [ ] 备份数据卷：`docker volume inspect aeon-minio-data`
- [ ] 执行安全审计（见 `SECURITY_AUDIT_CHECKLIST.md`）
- [ ] 配置防火墙（仅开放必要端口）

---

## 📦 服务说明

| 服务 | Profile | 端口 | 说明 |
|------|---------|------|------|
| app | default | 3000 | Next.js 应用 |
| minio | with-minio | 9000, 9001 | 对象存储 + 管理界面 |
| minio-init | with-minio | - | 自动初始化桶（一次性）|

---

## 🐛 故障排查

### MinIO 无法启动

```bash
# 查看日志
docker-compose logs minio

# 常见原因：端口占用
# 解决：修改 docker-compose.yml 端口映射
ports:
  - "19000:9000"   # 改为其他端口
  - "19001:9001"
```

### App 无法连接 MinIO

```bash
# 检查网络
docker exec aeon-app ping minio

# 检查环境变量
docker exec aeon-app env | grep MINIO

# 检查 MinIO 健康状态
docker-compose ps minio
```

### 桶未自动创建

```bash
# 查看初始化日志
docker-compose logs minio-init

# 手动创建
docker exec aeon-minio mc alias set minio http://localhost:9000 minioadmin minioadmin
docker exec aeon-minio mc mb minio/aeon-photos
docker exec aeon-minio mc anonymous set download minio/aeon-photos
```

---

## 🔒 MinIO 安全配置

### 生产环境必改

编辑 `.env`：

```bash
# 使用强密码（至少 20 字符）
MINIO_ROOT_USER=your_secure_username_here
MINIO_ROOT_PASSWORD=your_secure_password_at_least_20_chars

NEXT_PUBLIC_MINIO_ACCESS_KEY=your_app_access_key_here
NEXT_PUBLIC_MINIO_SECRET_KEY=your_app_secret_at_least_20_chars
```

### 设为私有桶

```bash
# 默认是公开读取，生产环境改为私有
docker exec aeon-minio mc alias set minio http://localhost:9000 your_user your_pass
docker exec aeon-minio mc anonymous set none minio/aeon-photos
```

### 启用 HTTPS（推荐）

```bash
# 1. 生成证书
mkdir -p minio/certs
# 将证书放入：
# - minio/certs/public.crt
# - minio/certs/private.key

# 2. 修改 docker-compose.yml
minio:
  volumes:
    - minio-data:/data
    - ./minio/certs:/root/.minio/certs:ro

# 3. 修改 .env
NEXT_PUBLIC_MINIO_USE_SSL=true
```

---

## 📊 数据备份

```bash
# 备份 MinIO 数据
docker run --rm \
  -v aeon-minio-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/minio-backup-$(date +%Y%m%d).tar.gz /data

# 恢复数据
docker run --rm \
  -v aeon-minio-data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/minio-backup-20260614.tar.gz -C /

# 查看数据卷位置
docker volume inspect aeon-minio-data
```

---

## 🔄 更新应用

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 重新构建
docker-compose build app

# 3. 滚动更新（零停机）
docker-compose up -d --no-deps --build app

# 4. 清理旧镜像
docker image prune -f
```

---

## 📈 监控与日志

```bash
# 查看资源使用
docker stats aeon-app aeon-minio

# 查看容器详情
docker inspect aeon-app

# 查看网络
docker network inspect aeon-network

# 持续输出日志
docker-compose logs -f --tail=100 app

# 查看 MinIO 存储使用
docker exec aeon-minio df -h /data
```

---

## 🧹 清理与维护

```bash
# 停止所有服务
docker-compose --profile with-minio down

# 清理未使用的镜像
docker image prune -a

# 清理未使用的容器
docker container prune

# 清理未使用的网络
docker network prune

# 完全清理（⚠️ 包括数据）
docker-compose down -v
docker system prune -a --volumes
```

---

## 📚 更多文档

- `README.md` - 项目总览
- `SECURITY.md` - 安全架构指南
- `SECURITY_AUDIT_CHECKLIST.md` - 上线审计清单（100+ 项）

---

## 💡 生产环境推荐配置

### 资源限制

编辑 `docker-compose.yml`：

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
```

### 日志轮转

```yaml
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

---

**最后更新**：2026-06-14  
**版本**：1.3.0（移除 Nginx）
