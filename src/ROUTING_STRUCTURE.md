# 路由结构说明

## 已修复的问题

之前 `src/app/page.tsx` (showcase) 和 `src/app/(dashboard)/page.tsx` 都映射到根路径 `/`，产生了冲突。

## 当前路由结构

### ✅ 公开路由（无需登录）

- **`/`** - Showcase 首页（回忆涌现动画）
  - 文件：`src/app/page.tsx`
  - 点击任意位置：已登录 → `/dashboard`，未登录 → `/login`

- **`/login`** - 登录页
  - 文件：`src/app/login/page.tsx`
  - 登录成功后 → `/dashboard`

- **`/register`** - 注册页
  - 文件：`src/app/register/page.tsx`
  - 注册成功后 → `/dashboard`

### 🔒 受保护路由（需要登录）

#### Dashboard 主页
- **`/dashboard`** - 仪表盘首页
  - 文件：`src/app/dashboard/page.tsx`
  - 布局：`src/app/dashboard/layout.tsx`（包含导航栏）
  - 显示：在一起天数、记录统计、最近记录等

#### Dashboard 功能页（在 `(dashboard)` 路由组内）
- **`/calendar`** - 日历视图
  - 文件：`src/app/(dashboard)/calendar/page.tsx`
  
- **`/gallery`** - 照片画廊
  - 文件：`src/app/(dashboard)/gallery/page.tsx`
  
- **`/timeline`** - 时间线
  - 文件：`src/app/(dashboard)/timeline/page.tsx`
  
- **`/statistics`** - 统计数据
  - 文件：`src/app/(dashboard)/statistics/page.tsx`
  
- **`/settings`** - 设置
  - 文件：`src/app/(dashboard)/settings/page.tsx`
  
- **`/records`** - 记录管理
  - `/records/new` - 新建记录
  - `/records/[id]` - 查看记录
  - `/records/[id]/edit` - 编辑记录

- **`/admin`** - 管理后台
  - 文件：`src/app/admin/page.tsx`

## 布局继承

```
根布局 (src/app/layout.tsx)
├── / (showcase - 无额外布局)
├── /login (无额外布局)
├── /register (无额外布局)
├── /dashboard (src/app/dashboard/layout.tsx - 包含导航)
│   └── 仪表盘首页
└── (dashboard) 路由组 (src/app/(dashboard)/layout.tsx - 包含导航)
    ├── /calendar
    ├── /gallery
    ├── /timeline
    ├── /statistics
    ├── /settings
    └── /records/*
```

## 用户流程

```
访问网站
  ↓
/ (Showcase - 回忆涌现动画)
  ↓ 点击屏幕
  ├─ 已登录 → /dashboard (仪表盘首页)
  │             ├─ 点击导航 → /calendar, /gallery, /timeline 等
  │             └─ 查看统计、最近记录
  └─ 未登录 → /login
                ↓ 登录成功
                /dashboard
```

## Middleware 保护逻辑

文件：`src/middleware.ts`

- **保护的路径**：`/dashboard`, `/calendar`, `/gallery`, `/records`, `/settings`, `/statistics`, `/timeline`, `/admin`
- **公开的路径**：`/`, `/login`, `/register`
- **重定向规则**：
  - 未登录访问受保护路由 → `/login`
  - 已登录访问 `/login` 或 `/register` → `/dashboard`

## 注意事项

1. ⚠️ `src/app/dashboard/` 目录下有空的子目录（`calendar/`, `gallery/` 等），这些是遗留文件夹，实际路由在 `(dashboard)` 组内
2. ✅ `/dashboard` 和 `(dashboard)` 组共享相同的布局样式，但是独立的路由
3. ✅ 所有 dashboard 相关页面都有导航栏（Sidebar + BottomNav）
