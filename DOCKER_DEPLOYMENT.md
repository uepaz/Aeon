# Aeon Docker 部署指南

本指南介绍如何使用 Docker 和 Docker Compose 部署 Aeon 应用。

## 📋 前置要求

- Docker Engine >= 20.10
- Docker Compose >= 2.0
- 2GB+ 可用内存
- 10GB+ 可用磁盘空间

## 🚀 快速开始

### 1. 准备环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填入你的配置
nano .env
```

**必填环境变量**：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### 2. 构建并启动

```bash
# 使用 Docker Compose 一键启动
docker-compose up -d

# 查看日志
docker-compose logs -f app

# 检查运行状态
docker-compose ps
```

### 3. 验证部署

访问 http://localhost:3000，你应该能看到登录页面。

## 🏗️ 构建选项

### 单独构建镜像

```bash
# 构建镜像
docker build -t aeon:latest .

# 运行容器
docker run -d \
  --name aeon-app \
  -p 3000:3000 \
  --env-file .env \
  aeon:latest
```

### 使用自定义标签

```bash
# 构建带版本标签的镜像
docker build -t aeon:1.0.0 .
docker build -t aeon:latest .

# 推送到 Docker Hub
docker tag aeon:latest your-username/aeon:latest
docker push your-username/aeon:latest
```

## 🔧 配置说明

### Docker Compose 服务

#### app 服务
- **端口**: 3000
- **重启策略**: unless-stopped
- **健康检查**: 每 30 秒检查一次
- **环境变量**: 从 .env 文件加载

#### nginx 服务（可选）
- **端口**: 80 (HTTP), 443 (HTTPS)
- **作用**: 反向代理、SSL 终止、负载均衡

启动 nginx 服务：

```bash
# 使用 nginx profile
docker-compose --profile with-nginx up -d
```

### 环境变量配置

| 变量 | 必需 | 说明 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase 匿名密钥 |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase 服务密钥 |
| `DATABASE_URL` | ✅ | PostgreSQL 连接字符串 |
| `NEXT_PUBLIC_APP_URL` | ✅ | 应用访问 URL |
| `NODE_ENV` | ❌ | 默认 production |

## 📊 监控与日志

### 查看日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f app

# 查看最近 100 行日志
docker-compose logs --tail=100 app
```

### 健康检查

```bash
# 检查容器健康状态
docker-compose ps

# 手动触发健康检查
docker exec aeon-app wget -qO- http://localhost:3000/api/health
```

### 资源监控

```bash
# 查看容器资源使用
docker stats aeon-app

# 查看详细信息
docker inspect aeon-app
```

## 🔄 更新部署

### 滚动更新

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 重新构建镜像
docker-compose build

# 3. 滚动更新（零停机）
docker-compose up -d --no-deps --build app

# 4. 清理旧镜像
docker image prune -f
```

### 回滚部署

```bash
# 使用之前的镜像标签
docker-compose down
docker run -d \
  --name aeon-app \
  -p 3000:3000 \
  --env-file .env \
  aeon:previous-version

# 或者使用 Docker Compose
# 修改 docker-compose.yml 中的镜像标签后
docker-compose up -d
```

## 🛡️ 生产环境优化

### 1. 使用 Nginx 反向代理

创建 `nginx/nginx.conf`：

```nginx
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    server {
        listen 80;
        server_name your-domain.com;

        # 重定向到 HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        # SSL 配置
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        # 安全响应头
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "DENY" always;
        add_header X-Content-Type-Options "nosniff" always;

        # 代理配置
        location / {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # 静态资源缓存
        location /_next/static {
            proxy_pass http://app;
            add_header Cache-Control "public, max-age=31536000, immutable";
        }
    }
}
```

### 2. 资源限制

修改 `docker-compose.yml`：

```yaml
services:
  app:
    # ... 其他配置
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### 3. 日志轮转

```yaml
services:
  app:
    # ... 其他配置
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## 🐛 故障排查

### 容器无法启动

```bash
# 查看详细错误信息
docker-compose logs app

# 检查环境变量
docker-compose config

# 进入容器调试
docker exec -it aeon-app sh
```

### 连接 Supabase 失败

```bash
# 测试数据库连接
docker exec aeon-app wget -qO- "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/"

# 检查网络连通性
docker exec aeon-app ping db.your-project.supabase.co
```

### 端口冲突

```bash
# 查看端口占用
netstat -tulnp | grep 3000

# 修改 docker-compose.yml 中的端口映射
ports:
  - "8080:3000"  # 使用 8080 端口
```

### 内存不足

```bash
# 查看容器内存使用
docker stats aeon-app

# 增加内存限制
# 修改 docker-compose.yml
deploy:
  resources:
    limits:
      memory: 4G
```

## 🧹 清理与维护

### 停止并删除容器

```bash
# 停止所有服务
docker-compose down

# 删除数据卷（谨慎！）
docker-compose down -v

# 删除所有相关镜像
docker-compose down --rmi all
```

### 清理 Docker 资源

```bash
# 清理未使用的镜像
docker image prune -a

# 清理未使用的容器
docker container prune

# 清理未使用的网络
docker network prune

# 清理所有未使用资源
docker system prune -a --volumes
```

## 📦 数据备份

### 备份环境变量

```bash
# 备份 .env 文件（不要提交到 Git）
cp .env .env.backup
```

### 备份 Supabase 数据

Supabase 自动备份数据库，也可以手动导出：

```bash
# 使用 Supabase CLI 备份
supabase db dump --linked > backup.sql

# 或使用 pg_dump
pg_dump "$DATABASE_URL" > backup.sql
```

## 🔐 安全建议

1. **不要在镜像中包含 .env 文件**
   - 使用 .env 或环境变量注入
   - 使用 Docker secrets（Swarm 模式）

2. **定期更新基础镜像**
   ```bash
   docker pull node:18-alpine
   docker-compose build --no-cache
   ```

3. **使用非 root 用户运行**
   - Dockerfile 中已配置 nextjs 用户

4. **扫描镜像漏洞**
   ```bash
   docker scan aeon:latest
   ```

5. **限制容器权限**
   ```yaml
   services:
     app:
       security_opt:
         - no-new-privileges:true
       read_only: true
   ```

## 📞 支持

如有问题，请：
1. 查看日志：`docker-compose logs -f`
2. 检查 [故障排查](#-故障排查) 章节
3. 提交 Issue：[GitHub Issues](https://github.com/your-username/aeon/issues)

---

**最后更新**：2026-06-14
