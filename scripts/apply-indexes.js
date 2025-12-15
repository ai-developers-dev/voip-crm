const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function createIndex(indexSQL, indexName, description) {
  try {
    console.log(`\n📌 Creating: ${indexName}`)
    console.log(`   ${description}`)

    // Use raw SQL execution via supabase-js
    // This executes the CREATE INDEX statement
    const { data, error } = await supabase.rpc('exec_sql', { sql: indexSQL })

    if (error) {
      // If exec_sql doesn't exist, the index creation failed
      // But the index might still exist, so let's check
      console.log(`⚠️ Could not use exec_sql: ${error.message}`)
      console.log(`ℹ️  Index may need manual creation in Supabase SQL Editor`)
      return false
    }

    console.log(`✅ ${indexName} created successfully`)
    return true
  } catch (error) {
    console.error(`❌ Error creating ${indexName}: ${error.message}`)
    return false
  }
}

async function main() {
  console.log('\n' + '='.repeat(70))
  console.log('🗄️  DATABASE OPTIMIZATION v4.0 - INDEX CREATION')
  console.log('='.repeat(70))
  console.log(`📅 Date: ${new Date().toISOString()}`)
  console.log(`🌐 Database: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`)
  console.log('='.repeat(70))

  const indexes = [
    {
      name: 'calls_assigned_to_idx',
      sql: 'CREATE INDEX IF NOT EXISTS calls_assigned_to_idx ON public.calls(assigned_to);',
      description: 'Foreign key index for assigned calls'
    },
    {
      name: 'calls_from_number_org_idx',
      sql: 'CREATE INDEX IF NOT EXISTS calls_from_number_org_idx ON public.calls(from_number, organization_id);',
      description: 'Composite index for inbound call lookups'
    },
    {
      name: 'calls_to_number_org_idx',
      sql: 'CREATE INDEX IF NOT EXISTS calls_to_number_org_idx ON public.calls(to_number, organization_id);',
      description: 'Composite index for outbound call lookups'
    },
    {
      name: 'calls_direction_created_at_idx',
      sql: 'CREATE INDEX IF NOT EXISTS calls_direction_created_at_idx ON public.calls(direction, created_at DESC);',
      description: 'Optimized for time-series queries by direction'
    },
    {
      name: 'calls_answered_at_idx',
      sql: 'CREATE INDEX IF NOT EXISTS calls_answered_at_idx ON public.calls(answered_at) WHERE answered_at IS NOT NULL;',
      description: 'Partial index for answered calls'
    },
    {
      name: 'calls_ended_at_idx',
      sql: 'CREATE INDEX IF NOT EXISTS calls_ended_at_idx ON public.calls(ended_at) WHERE ended_at IS NOT NULL;',
      description: 'Partial index for completed calls'
    },
    {
      name: 'contacts_phone_idx',
      sql: 'CREATE INDEX IF NOT EXISTS contacts_phone_idx ON public.contacts(phone);',
      description: 'Critical index for phone number matching'
    },
    {
      name: 'contacts_org_phone_idx',
      sql: 'CREATE INDEX IF NOT EXISTS contacts_org_phone_idx ON public.contacts(organization_id, phone);',
      description: 'Composite index for org-specific phone lookups'
    },
    {
      name: 'sms_conversations_contact_phone_idx',
      sql: 'CREATE INDEX IF NOT EXISTS sms_conversations_contact_phone_idx ON public.sms_conversations(contact_phone_number);',
      description: 'Index for SMS conversation phone lookups'
    }
  ]

  console.log(`\n🎯 Target: Create ${indexes.length} performance indexes\n`)

  let successCount = 0
  let failCount = 0

  for (const index of indexes) {
    const success = await createIndex(index.sql, index.name, index.description)
    if (success) {
      successCount++
    } else {
      failCount++
    }
  }

  console.log('\n' + '='.repeat(70))
  console.log('📊 MIGRATION RESULTS')
  console.log('='.repeat(70))
  console.log(`✅ Success: ${successCount}/${indexes.length}`)
  console.log(`❌ Failed: ${failCount}/${indexes.length}`)
  console.log('='.repeat(70))

  if (failCount > 0) {
    console.log('\n⚠️  Some indexes could not be created automatically.')
    console.log('\n📋 Manual migration required:')
    console.log(`\n1. Open Supabase SQL Editor:`)
    console.log(`   https://supabase.com/dashboard/project/zcosbiwvstrwmyioqdjw/sql/new`)
    console.log(`\n2. Copy and paste: database/migrations/12_add_critical_indexes.sql`)
    console.log(`\n3. Click "Run" to execute`)
    console.log(`\n4. Then run: database/migrations/13_add_full_name_column.sql\n`)
  } else {
    console.log('\n🎉 All indexes created successfully!')
    console.log('\n📝 Next: Add full_name column')
    console.log('   Run migration 13 manually in Supabase SQL Editor\n')
  }
}

main()
