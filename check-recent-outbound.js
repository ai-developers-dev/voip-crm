const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkOutbound() {
  console.log('🔍 Checking for outbound calls in last 10 minutes...\n')

  const tenMinutesAgo = new Date()
  tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10)

  const { data: calls, error } = await supabase
    .from('calls')
    .select('*')
    .eq('direction', 'outbound')
    .gte('created_at', tenMinutesAgo.toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ Error:', error)
    return
  }

  console.log(`Found ${calls?.length || 0} outbound calls in last 10 minutes:\n`)

  calls?.forEach(call => {
    console.log('📞 Call:', {
      id: call.id,
      to_number: call.to_number,
      status: call.status,
      created_at: call.created_at,
      twilio_call_sid: call.twilio_call_sid
    })
  })

  if (!calls || calls.length === 0) {
    console.log('❌ NO OUTBOUND CALLS FOUND - This confirms calls are NOT being saved!')
  }
}

checkOutbound()
