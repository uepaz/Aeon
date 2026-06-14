# Aeon - 个人/情侣记忆日志

一个使用 Next.js 16 + Supabase 构建的现代化记忆日志应用，支持文字记录、照片上传、时间线浏览等功能。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Docker](https://img.shields.io/badge/Docker-ready-brightgreen)

## ✨ 特性

- 📝 **文字记录** - 支持标题、内容、标签的记忆记录
- 📷 **照片上传** - 自动压缩、双图存储（原图 + 压缩图）
- 📅 **时间线浏览** - 倒序时间线、日期筛选、搜索
- 🗓️ **月历视图** - 高亮有记录的日期
- 📊 **统计仪表盘** - 在一起天数、记录总数、照片数量
- 🖼️ **照片画廊** - 瀑布流布局、虚拟滚动优化
- 🔒 **企业级安全** - RLS、多层文件验证、XSS 防护
- 🎨 **现代化 UI** - shadcn/ui + Tailwind CSS v4
- 🚀 **一键部署** - Docker + 自动数据库迁移

## 🛠️ 技术栈

### 核心框架
- **Next.js 16** - App Router + React Server Components
- **React 19** - 最新特性支持
- **TypeScript** - 类型安全

### 数据库与认证
- **Supabase** - PostgreSQL + Auth + Storage + Realtime
- **Drizzle ORM** - 类型安全的 ORM（仅用于 schema 定义）

### UI 组件
- **shadcn/ui** - Base UI primitives (base-nova style)
- **Tailwind CSS v4** - 原子化 CSS
- **Lucide React** - 图标库
- **TanStack Query** - 数据获取与缓存
- **TanStack Virtual** - 虚拟滚动

### 表单与验证
- **React Hook Form** - 表单管理
- **Zod** - Schema 验证

### 图片处理
- **browser-image-compression** - 客户端图片压缩
- **Sharp** - 服务端图片处理

## 📋 前置要求

- **Docker** >= 20.10
- **Docker Compose** >= 2.0
- **Supabase 账号** - [注册地址](https://supabase.com)

## 🚀 快速开始（Docker 部署，推荐）

### 1. 克隆项目

```bash
git clone https://github.com/your-username/aeon.git
cd aeon
```

### 2. 创建 Supabase 项目

1. 访问 [supabase.com](https://supabase.com) 并登录
2. 点击 "New Project"
3. 填写项目信息并创建

### 3. 配置环境变量

```bash
# Docker 部署：复制为 .env
cp .env.example .env

# 本地开发：复制为 .env.local
cp .env.example .env.local

# 编辑配置文件
nano .env  # 或 .env.local
```

> 💡 **提示**：`.env.example` 是唯一的模板文件。根据部署方式选择目标文件名。

**获取 Supabase 配置**（从 Supabase Dashboard）：

1. 进入 **Settings → API**，获取：
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

2. 进入 **Settings → Database**，获取：
   - `Connection string` (Transaction mode) → `DATABASE_URL`

**必填配置**：

```bash
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# 数据库
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.your-project.supabase.co:5432/postgres

# 应用
NEXT_PUBLIC_APP_URL=http://localhost:3000

# 存储模式（可选，默认 supabase）
NEXT_PUBLIC_STORAGE_TYPE=supabase
```

### 4. 一键启动 🎉

**方式 A：仅 Supabase Storage（默认，推荐小项目）**

```bash
# .env 配置
NEXT_PUBLIC_STORAGE_TYPE=supabase

# 启动应用（自动执行数据库迁移）
docker-compose up -d app

# 查看启动日志
docker-compose logs -f app
```

**方式 B：Supabase + MinIO（推荐生产环境，大文件）**

```bash
# .env 配置
NEXT_PUBLIC_STORAGE_TYPE=hybrid  # 或 minio

# MinIO 配置（使用默认值或自定义）
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin  # ⚠️ 生产环境必须修改

# 启动应用 + MinIO
docker-compose --profile with-minio up -d

# 查看日志
docker-compose logs -f app
```

**启动过程**（自动完成）：
```
🚀 Aeon 启动脚本
⏳ 等待数据库连接...
✅ 数据库连接成功
🔧 执行数据库迁移...
  ✅ 启用 RLS
  ✅ 创建安全策略
  ✅ 创建 Storage 策略
✅ 数据库迁移完成
🎉 启动 Next.js 应用...
```

### 5. 访问应用

**仅 Supabase 模式**：
- 应用：http://localhost:3000

**Supabase + MinIO 模式**：
- 应用：http://localhost:3000
- MinIO Console：http://localhost:9001
  - 登录：minioadmin / minioadmin

**首次访问**：
1. 点击"注册"创建账号
2. 使用邮箱和密码注册
3. 登录后开始使用

---

## 💻 本地开发（无 Docker）

如果你想在本地开发而不使用 Docker：

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
# 本地开发使用 .env.local
cp .env.example .env.local
nano .env.local
```

### 3. 手动执行数据库迁移

在 Supabase Dashboard → SQL Editor 中依次执行：
1. `supabase/migrations/001_enable_rls.sql`
2. `supabase/migrations/002_storage_policies.sql`

### 4. 创建 Storage 桶

在 Supabase Dashboard → Storage 中创建桶：
- **Bucket name**: `record-photos`
- **Public**: false
- **File size limit**: 10 MB
- **Allowed MIME types**: `image/jpeg`, `image/png`, `image/webp`, `image/avif`

### 5. 启动开发服务器

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看应用。

---

## 📦 存储模式说明

Aeon 支持两种存储模式：

### 模式对比

| 特性 | Supabase Storage | MinIO (自托管) |
|------|-----------------|---------------|
| **适用场景** | 小项目、快速部署 | 大文件、生产环境 |
| **配置** | 无需额外配置 | 需要 MinIO 容器 |
| **月费** | 免费额度 / 付费 | 仅服务器成本 |
| **文件大小** | 最大 50MB | 无限制 |
| **内存需求** | ~500MB | ~1GB |
| **数据掌控** | Supabase 托管 | 完全自控 |

### 启动命令

```bash
# Supabase Storage（默认）
docker-compose up -d app

# Supabase + MinIO（推荐生产）
docker-compose --profile with-minio up -d
```

### 常用命令

```bash
# 查看服务状态
docker-compose ps

# 查看应用日志
docker-compose logs -f app

# 查看 MinIO 日志
docker-compose logs -f minio

# 停止服务
docker-compose down

# 完全清理（包括数据）
docker-compose down -v
```

---

## 🗄️ 数据库 Schema

项目使用 Drizzle ORM 定义 schema，包含 3 张主表：

- **user_settings** - 用户设置（纪念日、生日、名字等）
- **records** - 记录表（标题、内容、日期、标签）
- **photos** - 照片表（原图路径、压缩图路径、大小）

### Schema 更新

如果需要修改数据库结构：

```bash
# 1. 修改 src/lib/db/schema.ts

# 2. 生成新迁移
npm run db:generate

# 3. 推送到数据库
npm run db:push
```

---

## 🔒 安全特性

### 多层安全防护

1. **Row Level Security (RLS)** - 数据库层隔离
2. **Storage 桶策略** - 文件访问控制
3. **文件上传验证** - MIME 类型 + Magic Number + 文件名 sanitization
4. **输入验证** - XSS 防护 + 防原型污染
5. **安全响应头** - CSP、HSTS、X-Frame-Options

---

## 📜 可用脚本

```bash
# 开发
npm run dev          # 启动开发服务器（Turbopack）
npm run build        # 生产构建
npm run start        # 启动生产服务器
npm run lint         # ESLint 检查

# 数据库
npm run db:generate  # 生成 migration
npm run db:push      # 推送 schema 到数据库
npm run db:pull      # 从数据库拉取 schema
npm run db:studio    # 打开 Drizzle Studio

# Docker
docker-compose up -d              # 启动应用
docker-compose --profile with-minio up -d  # 启动应用 + MinIO
docker-compose logs -f app        # 查看日志
docker-compose down               # 停止服务
```

---

## 📁 项目结构

```
Aeon/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (dashboard)/        # 主应用路由组
│   │   │   ├── calendar/       # 月历视图
│   │   │   ├── gallery/        # 照片画廊
│   │   │   ├── records/        # 记录管理
│   │   │   ├── settings/       # 用户设置
│   │   │   ├── statistics/     # 统计仪表盘
│   │   │   └── timeline/       # 时间线
│   │   ├── admin/              # 后台管理
│   │   ├── auth/               # 认证回调
│   │   ├── login/              # 登录页
│   │   └── register/           # 注册页
│   ├── components/             # React 组件
│   │   ├── ui/                 # shadcn/ui 组件
│   │   ├── admin/              # 后台组件
│   │   ├── auth/               # 认证组件
│   │   ├── dashboard/          # 仪表盘组件
│   │   ├── gallery/            # 画廊组件
│   │   ├── navigation/         # 导航组件
│   │   └── records/            # 记录组件
│   ├── lib/                    # 核心库
│   │   ├── config/             # 配置文件
│   │   ├── db/                 # 数据库
│   │   │   ├── queries/        # 查询函数
│   │   │   ├── client.ts       # 数据库客户端
│   │   │   └── schema.ts       # Schema 定义
│   │   ├── storage/            # 存储抽象层
│   │   ├── supabase/           # Supabase 客户端
│   │   ├── utils/              # 工具函数
│   │   ├── validations/        # 验证 schemas
│   │   └── env.ts              # 环境变量验证
│   ├── hooks/                  # 自定义 hooks
│   ├── types/                  # TypeScript 类型
│   └── middleware.ts           # Next.js 中间件
├── supabase/
│   └── migrations/             # 数据库迁移文件
├── scripts/                    # 自动化脚本
│   ├── apply-migrations.js     # 自动迁移脚本
│   └── entrypoint.sh           # Docker 启动脚本
├── public/                     # 静态资源
├── docs/                       # 项目文档
├── docker-compose.yml          # Docker Compose 配置
├── Dockerfile                  # Docker 构建文件
├── .env.example                # 环境变量模板
├── SECURITY.md                 # 安全指南
└── README.md                   # 本文件
```

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 开发流程

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

### 代码规范

- 遵循 ESLint 配置
- 使用 TypeScript 类型
- 编写清晰的 commit message
- 添加必要的注释

---

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

---
