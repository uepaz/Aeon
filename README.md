# Aeon - 个人/情侣记忆日志

一个使用 Next.js 16 + Supabase 构建的现代化记忆日志应用，支持文字记录、照片上传、时间线浏览等功能。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

## ✨ 特性

- 📝 **文字记录** - 支持标题、内容、标签的记忆记录
- 📷 **照片上传** - 自动压缩、双图存储（原图 + 压缩图）
- 📅 **时间线浏览** - 倒序时间线、日期筛选、搜索
- 🗓️ **月历视图** - 高亮有记录的日期
- 📊 **统计仪表盘** - 在一起天数、记录总数、照片数量
- 🖼️ **照片画廊** - 瀑布流布局、虚拟滚动优化
- 🔒 **企业级安全** - RLS、多层文件验证、XSS 防护
- 🎨 **现代化 UI** - shadcn/ui + Tailwind CSS v4

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
- **@hookform/resolvers** - 表单验证集成

### 图片处理
- **browser-image-compression** - 客户端图片压缩
- **Sharp** - 服务端图片处理

### 开发工具
- **ESLint** - 代码检查
- **Turbopack** - 快速构建（Next.js 16 默认）

## 📋 前置要求

- **Node.js** >= 18.x
- **npm** >= 9.x
- **Supabase 账号** - [注册地址](https://supabase.com)
- **Docker** (可选，用于本地开发)

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/your-username/aeon.git
cd aeon
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env.local`：

```bash
cp .env.example .env.local
```

编辑 `.env.local`，填入你的 Supabase 配置：

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Database
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.your-project.supabase.co:5432/postgres

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. 配置 Supabase

#### 4.1 连接到你的 Supabase 项目

```bash
# 安装 Supabase CLI（如果尚未安装）
npm install -g supabase

# 连接到远程项目
supabase link --project-ref your-project-ref
```

#### 4.2 执行数据库迁移

```bash
# 推送 schema 到数据库
npm run db:push

# 或者手动执行 SQL
# 在 Supabase Dashboard → SQL Editor 中依次执行：
# 1. supabase/migrations/001_enable_rls.sql
# 2. supabase/migrations/002_storage_policies.sql
```

#### 4.3 创建 Storage 桶

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

## 📦 Docker 部署

### 使用 Docker Compose

项目包含 `docker-compose.yml` 配置文件，可以一键启动完整环境。

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止
docker-compose down
```

访问 [http://localhost:3000](http://localhost:3000)

### 环境变量配置

Docker 部署时，环境变量通过 `.env` 文件传递：

```bash
cp .env.example .env
# 编辑 .env 填入生产环境配置
```

## 🗄️ 数据库 Schema

项目使用 Drizzle ORM 定义 schema，包含 3 张主表：

- **user_settings** - 用户设置（纪念日、生日、名字等）
- **records** - 记录表（标题、内容、日期、标签）
- **photos** - 照片表（原图路径、压缩图路径、大小）

### 生成新迁移

```bash
# 修改 src/lib/db/schema.ts 后
npx drizzle-kit generate

# 推送到数据库
npx drizzle-kit push
```

## 🔒 安全特性

### 多层安全防护

1. **Row Level Security (RLS)** - 数据库层隔离
2. **Storage 桶策略** - 文件访问控制
3. **文件上传验证** - MIME 类型 + Magic Number + 文件名 sanitization
4. **输入验证** - XSS 防护 + 防原型污染
5. **安全响应头** - CSP、HSTS、X-Frame-Options

### 安全审计

上线前必须执行：

```bash
# 1. 依赖安全扫描
npm audit

# 2. 环境变量检查
git log --all --full-history -- .env.local

# 3. 完整审计清单
# 见 SECURITY_AUDIT_CHECKLIST.md
```

详见：[SECURITY.md](./SECURITY.md)

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
```

## 📁 项目结构

```
Aeon/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (dashboard)/        # 主应用路由组
│   │   │   ├── calendar/
│   │   │   ├── gallery/
│   │   │   ├── records/
│   │   │   ├── settings/
│   │   │   ├── statistics/
│   │   │   └── timeline/
│   │   ├── admin/              # 后台管理
│   │   ├── auth/               # 认证回调
│   │   ├── login/              # 登录页
│   │   └── register/           # 注册页
│   ├── components/             # React 组件
│   │   ├── ui/                 # shadcn/ui 组件
│   │   ├── admin/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── gallery/
│   │   ├── navigation/
│   │   └── records/
│   ├── lib/                    # 核心库
│   │   ├── config/             # 配置文件
│   │   ├── db/                 # 数据库相关
│   │   │   ├── queries/        # 查询函数
│   │   │   ├── client.ts
│   │   │   └── schema.ts
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
├── public/                     # 静态资源
├── docs/                       # 项目文档
├── docker-compose.yml          # Docker Compose 配置
├── Dockerfile                  # Docker 构建文件
├── .env.example                # 环境变量模板
├── SECURITY.md                 # 安全指南
└── README.md                   # 本文件
```

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

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Drizzle ORM](https://orm.drizzle.team/)

## 📞 联系方式

- **Issues**: [GitHub Issues](https://github.com/your-username/aeon/issues)
- **Email**: your-email@example.com
- **安全问题**: 请发送邮件至 security@yourapp.com

---

**Built with ❤️ using Next.js 16 and Supabase**
