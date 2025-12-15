const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function checkOutboundCalls() {
  console.log('🔍 Checking for OUTBOUND calls in database...\n')

  const { data: outbound, error } = await supabase
    .from('calls')
    .select('id, direction, status, answered_by_user_id, created_at, to_number, from_number')
    .eq('direction', 'outbound')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.log('❌ Error fetching outbound calls:', error.message)
    return
  }

  if (outbound.length === 0) {
    console.log('❌ NO OUTBOUND CALLS FOUND IN DATABASE!')
    console.log('   This means outbound calls are not being saved at all.\n')
  } else {
    console.log(`✅ Found ${outbound.length} outbound calls:\n`)
    outbound.forEach(call => {
      console.log(`   ${call.direction.toUpperCase().padEnd(8)} - ${call.status.padEnd(12)} - To: ${call.to_number} - Answered by: ${call.answered_by_user_id?.substring(0, 8) || 'none'}... - ${call.created_at}`)
    })
  }

  console.log('\n\n📊 Checking if exec_sql and reset_call_counts functions exist...\n')

  // Check if the functions exist
  const { data: functions, error: funcError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT routine_name, routine_type
      FROM information_schema.routines
      WHERE routine_schema = 'public'
      AND routine_name IN ('exec_sql', 'reset_call_counts')
    `
  }).catch(e => ({ data: null, error: e }))

  if (funcError) {
    console.log('❌ Error checking functions (exec_sql may not exist):', funcError.message)
    console.log('   This is the problem! The exec_sql function is not available.')
    console.log('   The outbound route is trying to call exec_sql but it doesn\'t exist.\n')
  } else if (functions) {
    console.log('✅ Functions found:')
    functions.forEach(f => {
      console.log(`   - ${f.routine_name} (${f.routine_type})`)
    })
  }
}

checkOutboundCalls()
