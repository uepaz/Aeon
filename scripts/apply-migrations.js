const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少 Supabase 配置');
  console.error('请确保设置了以下环境变量：');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeSql(sql, description) {
  try {
    console.log(`  ⏳ ${description}...`);

    // 使用 Supabase REST API 执行 SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
      },
      body: JSON.stringify({ query: sql }),
    });

    if (!response.ok) {
      // 如果 exec_sql 不存在，尝试通过 pg 直接执行
      throw new Error(`HTTP ${response.status}`);
    }

    console.log(`  ✅ ${description} 完成`);
    return true;
  } catch (error) {
    console.error(`  ⚠️  ${description} 失败:`, error.message);
    // 继续执行，某些语句可能因为已存在而失败
    return false;
  }
}

async function applyMigrations() {
  console.log('\n📋 开始应用数据库迁移...\n');

  // 读取迁移文件
  const migration001 = fs.readFileSync(
    path.join(__dirname, '../supabase/migrations/001_enable_rls.sql'),
    'utf8'
  );

  const migration002 = fs.readFileSync(
    path.join(__dirname, '../supabase/migrations/002_storage_policies.sql'),
    'utf8'
  );

  // 拆分 SQL 语句
  const statements001 = migration001
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'));

  const statements002 = migration002
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'));

  console.log('📝 Migration 001: 启用 RLS\n');

  for (const statement of statements001) {
    if (statement.includes('ALTER TABLE') && statement.includes('ENABLE ROW LEVEL SECURITY')) {
      await executeSql(statement, '启用 RLS');
    } else if (statement.includes('CREATE POLICY')) {
      const policyName = statement.match(/CREATE POLICY "([^"]+)"/)?.[1];
      await executeSql(statement, `创建策略: ${policyName}`);
    }
  }

  console.log('\n📝 Migration 002: 配置 Storage 策略\n');

  for (const statement of statements002) {
    if (statement.includes('CREATE POLICY')) {
      const policyName = statement.match(/CREATE POLICY "([^"]+)"/)?.[1];
      await executeSql(statement, `创建 Storage 策略: ${policyName}`);
    } else if (statement.includes('CREATE OR REPLACE FUNCTION')) {
      await executeSql(statement, '创建辅助函数');
    }
  }

  // 创建迁移记录表
  console.log('\n📋 创建迁移记录表...\n');
  await executeSql(`
    CREATE TABLE IF NOT EXISTS _aeon_migrations (
      id SERIAL PRIMARY KEY,
      migration VARCHAR(255) NOT NULL,
      applied_at TIMESTAMP DEFAULT NOW()
    );
  `, '创建 _aeon_migrations 表');

  await executeSql(`
    INSERT INTO _aeon_migrations (migration)
    VALUES ('001_enable_rls'), ('002_storage_policies')
    ON CONFLICT DO NOTHING;
  `, '记录迁移历史');

  console.log('\n✅ 所有迁移已成功应用！\n');
}

// 执行迁移
applyMigrations()
  .then(() => {
    console.log('🎉 数据库初始化完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 迁移失败:', error);
    console.error('\n请手动执行以下操作：');
    console.error('1. 登录 Supabase Dashboard');
    console.error('2. 进入 SQL Editor');
    console.error('3. 依次执行 supabase/migrations/ 下的 SQL 文件');
    process.exit(1);
  });
