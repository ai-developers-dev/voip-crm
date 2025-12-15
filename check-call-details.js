const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkCall() {
  const callId = 'b7a5b422-03ad-4cd9-8e6a-92faa0925c24'

  console.log('🔍 Checking call details...\n')

  const { data: call, error } = await supabase
    .from('calls')
    .select('*')
    .eq('id', callId)
    .single()

  if (error) {
    console.error('❌ Error:', error)
    return
  }

  console.log('📞 Full call details:')
  console.log(JSON.stringify(call, null, 2))

  console.log('\n🔍 Key fields:')
  console.log('- Direction:', call.direction)
  console.log('- From:', call.from_number)
  console.log('- To:', call.to_number)
  console.log('- Status:', call.status)
  console.log('- Duration:', call.duration)
  console.log('- Answered by user ID:', call.answered_by_user_id)
  console.log('- Created:', call.created_at)
  console.log('- Organization ID:', call.organization_id)
}

checkCall()
