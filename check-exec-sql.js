const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function checkExecSql() {
  console.log('🔍 Checking if exec_sql function exists...\n')

  try {
    // Try to call exec_sql with a simple query
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: 'SELECT 1 as test'
    })

    if (error) {
      console.log('❌ exec_sql function does NOT exist!')
      console.log(`   Error: ${error.message}\n`)
      console.log('This is the problem! The outbound route is trying to call exec_sql but it doesn\'t exist.')
      console.log('This causes the entire /api/twilio/outbound endpoint to fail.\n')
      console.log('SOLUTION: The exec_sql function needs to be created in Supabase.')
      console.log('Or we need to use a different approach to increment counters.\n')
      return false
    } else {
      console.log('✅ exec_sql function exists and works!')
      console.log(`   Test result: ${JSON.stringify(data)}\n`)
      return true
    }
  } catch (e) {
    console.log('❌ Error testing exec_sql:', e.message)
    return false
  }
}

async function checkResetCallCounts() {
  console.log('🔍 Checking if reset_call_counts function exists...\n')

  try {
    const { data, error } = await supabase.rpc('reset_call_counts')

    if (error) {
      console.log('❌ reset_call_counts function does NOT exist!')
      console.log(`   Error: ${error.message}\n`)
      return false
    } else {
      console.log('✅ reset_call_counts function exists and works!\n')
      return true
    }
  } catch (e) {
    console.log('❌ Error testing reset_call_counts:', e.message)
    return false
  }
}

async function main() {
  const hasExecSql = await checkExecSql()
  const hasResetCallCounts = await checkResetCallCounts()

  if (!hasExecSql) {
    console.log('\n💡 RECOMMENDED FIX:')
    console.log('   Use direct UPDATE instead of exec_sql in the outbound route.')
    console.log('   The exec_sql function is a security risk anyway.\n')
  }
}

main()
