const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function checkTodayOutbound() {
  console.log('🔍 Checking for OUTBOUND calls TODAY...\n')

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0]
  console.log(`   Today's date: ${today}\n`)

  const { data: outbound, error } = await supabase
    .from('calls')
    .select('id, direction, status, answered_by_user_id, created_at, to_number, from_number, twilio_call_sid')
    .eq('direction', 'outbound')
    .gte('created_at', `${today}T00:00:00`)
    .order('created_at', { ascending: false })

  if (error) {
    console.log('❌ Error fetching outbound calls:', error.message)
    return
  }

  if (outbound.length === 0) {
    console.log('❌ NO OUTBOUND CALLS FOUND TODAY!')
    console.log('   Either:')
    console.log('   1. You haven\'t made an outbound call today')
    console.log('   2. The outbound call is not being saved to database')
    console.log('   3. The outbound route is not being called\n')
  } else {
    console.log(`✅ Found ${outbound.length} outbound call(s) TODAY:\n`)
    outbound.forEach(call => {
      console.log(`   CallSid: ${call.twilio_call_sid}`)
      console.log(`   Status: ${call.status}`)
      console.log(`   To: ${call.to_number}`)
      console.log(`   From: ${call.from_number}`)
      console.log(`   Answered by: ${call.answered_by_user_id || 'none'}`)
      console.log(`   Created: ${call.created_at}`)
      console.log('')
    })
  }
}

checkTodayOutbound()
