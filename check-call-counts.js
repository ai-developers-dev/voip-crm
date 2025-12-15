const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function checkCallCounts() {
  console.log('🔍 Checking call counts in voip_users table...\n')

  const { data: users, error } = await supabase
    .from('voip_users')
    .select(`
      id,
      today_inbound_calls,
      today_outbound_calls,
      weekly_inbound_calls,
      weekly_outbound_calls,
      monthly_inbound_calls,
      monthly_outbound_calls,
      yearly_inbound_calls,
      yearly_outbound_calls,
      last_count_reset_date,
      last_week_reset_date,
      last_month_reset_date,
      last_year_reset_date
    `)

  if (error) {
    console.log('❌ Error fetching users:', error.message)
    return
  }

  console.log(`✅ Found ${users.length} users:\n`)

  users.forEach(user => {
    console.log(`👤 User ID: ${user.id}`)
    console.log(`   Today:   IB=${user.today_inbound_calls || 0}  OB=${user.today_outbound_calls || 0}`)
    console.log(`   Weekly:  IB=${user.weekly_inbound_calls || 0}  OB=${user.weekly_outbound_calls || 0}`)
    console.log(`   Monthly: IB=${user.monthly_inbound_calls || 0}  OB=${user.monthly_outbound_calls || 0}`)
    console.log(`   Yearly:  IB=${user.yearly_inbound_calls || 0}  OB=${user.yearly_outbound_calls || 0}`)
    console.log(`   Last resets:`)
    console.log(`     Daily:   ${user.last_count_reset_date || 'never'}`)
    console.log(`     Weekly:  ${user.last_week_reset_date || 'never'}`)
    console.log(`     Monthly: ${user.last_month_reset_date || 'never'}`)
    console.log(`     Yearly:  ${user.last_year_reset_date || 'never'}`)
    console.log('')
  })

  // Also check recent calls table
  console.log('\n📞 Checking recent calls in database...\n')
  const { data: calls, error: callsError } = await supabase
    .from('calls')
    .select('id, direction, answered_by_user_id, status, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  if (callsError) {
    console.log('❌ Error fetching calls:', callsError.message)
    return
  }

  console.log(`✅ Recent calls (last 10):\n`)
  calls.forEach(call => {
    console.log(`   ${call.direction.toUpperCase().padEnd(8)} - ${call.status.padEnd(12)} - Answered by: ${call.answered_by_user_id?.substring(0, 8) || 'none'}... - ${call.created_at}`)
  })
}

checkCallCounts()
