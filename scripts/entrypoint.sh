#!/bin/bash
set -e

echo "🚀 Aeon 启动脚本"
echo "================================"

# 等待数据库就绪
echo "⏳ 等待数据库连接..."
until node -e "
const { createClient } = require('@supabase/supabase-js');
const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
client.from('_migrations').select('id').limit(1).then(() => {
  console.log('✅ 数据库连接成功');
  process.exit(0);
}).catch(() => {
  console.log('⏳ 等待数据库...');
  process.exit(1);
});
" 2>/dev/null; do
  sleep 2
done

# 检查是否需要执行迁移
echo "🔍 检查数据库迁移状态..."

# 创建迁移记录表（如果不存在）
node -e "
const { createClient } = require('@supabase/supabase-js');
const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  try {
    // 尝试查询迁移表
    const { error } = await client.from('_aeon_migrations').select('id').limit(1);

    if (error && error.code === 'PGRST204') {
      console.log('📝 创建迁移记录表...');
      // 表不存在，需要执行迁移
      process.exit(2);
    } else {
      console.log('✅ 数据库已初始化');
      process.exit(0);
    }
  } catch (e) {
    console.error('❌ 检查迁移状态失败:', e.message);
    process.exit(1);
  }
})();
"

MIGRATION_STATUS=$?

if [ $MIGRATION_STATUS -eq 2 ]; then
  echo "🔧 执行数据库迁移..."

  # 执行 RLS 策略
  echo "📋 应用 RLS 策略..."
  node /app/scripts/apply-migrations.js

  echo "✅ 数据库迁移完成"
elif [ $MIGRATION_STATUS -eq 0 ]; then
  echo "✅ 数据库已是最新版本"
else
  echo "❌ 迁移检查失败"
  exit 1
fi

echo "================================"
echo "🎉 启动 Next.js 应用..."
echo "================================"

# 启动 Next.js
exec node server.js
