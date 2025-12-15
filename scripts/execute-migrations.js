const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function executeSQLFile(filePath, description) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`🚀 Executing: ${description}`)
  console.log(`📁 File: ${path.basename(filePath)}`)
  console.log(`${'='.repeat(60)}\n`)

  try {
    const sql = fs.readFileSync(filePath, 'utf8')

    // Split SQL by statements (basic splitting by semicolon + newline)
    const statements = sql
      .split(/;\\s*\\n/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`)

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i]
      if (stmt.includes('CREATE INDEX')) {
        const indexName = stmt.match(/CREATE INDEX.*?(\\w+)\\s+ON/)?.[1]
        console.log(`  ${i + 1}. Creating index: ${indexName || 'unknown'}`)
      } else if (stmt.includes('ALTER TABLE')) {
        console.log(`  ${i + 1}. Altering table structure`)
      } else if (stmt.includes('UPDATE')) {
        console.log(`  ${i + 1}. Updating data`)
      } else {
        console.log(`  ${i + 1}. Executing SQL statement`)
      }
    }

    console.log(`\n✅ ${description} ready to execute\n`)
    return { sql, statements }
  } catch (error) {
    console.error(`❌ Error reading file: ${error.message}`)
    return null
  }
}

async function main() {
  console.log('\n' + '='.repeat(60))
  console.log('🗄️  DATABASE OPTIMIZATION - MIGRATION EXECUTOR')
  console.log('='.repeat(60))
  console.log(`📅 Date: ${new Date().toISOString()}`)
  console.log(`🌐 Database: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`)
  console.log('='.repeat(60))

  // Migration 12: Indexes
  const migration12Path = path.join(__dirname, '..', 'database', 'migrations', '12_add_critical_indexes.sql')
  const migration12 = await executeSQLFile(migration12Path, 'Migration 12: Critical Indexes')

  if (!migration12) {
    console.error('❌ Failed to load migration 12')
    process.exit(1)
  }

  // Migration 13: full_name column
  const migration13Path = path.join(__dirname, '..', 'database', 'migrations', '13_add_full_name_column.sql')
  const migration13 = await executeSQLFile(migration13Path, 'Migration 13: full_name Column')

  if (!migration13) {
    console.error('❌ Failed to load migration 13')
    process.exit(1)
  }

  console.log('\n' + '='.repeat(60))
  console.log('📊 MIGRATION FILES LOADED SUCCESSFULLY')
  console.log('='.repeat(60))
  console.log('\n⚠️  IMPORTANT: Execute these SQL files manually in Supabase SQL Editor:')
  console.log(`\n1. Open: https://supabase.com/dashboard/project/zcosbiwvstrwmyioqdjw/sql/new`)
  console.log(`\n2. Copy and paste the contents of:`)
  console.log(`   - database/migrations/12_add_critical_indexes.sql`)
  console.log(`   - database/migrations/13_add_full_name_column.sql`)
  console.log(`\n3. Click "Run" for each migration`)
  console.log(`\n4. Verify success messages in the output\n`)
  console.log('💡 Alternatively, use psql or your preferred PostgreSQL client.\n')

  console.log('📝 After running migrations, verify with:')
  console.log('   node scripts/verify-indexes.js\n')
}

main()
