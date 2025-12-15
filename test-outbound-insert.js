const { createClient } = require('@supabase/supabase-js')

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function testOutboundInsert() {
  console.log('🧪 Testing outbound call record insert...\n')

  // Use the actual user ID from the database
  const userId = '9abcaa0f-5e39-41f5-b269-2b5872720768'
  const organizationId = '9abcaa0f-5e39-41f5-b269-2b5872720768'

  console.log('📊 Test parameters:')
  console.log('   User ID:', userId)
  console.log('   Organization ID:', organizationId)
  console.log('   From:', process.env.TWILIO_PHONE_NUMBER)
  console.log('   To: +15555555555')
  console.log('')

  try {
    const { data: callRecord, error: callError } = await adminClient
      .from('calls')
      .insert({
        organization_id: organizationId,
        from_number: process.env.TWILIO_PHONE_NUMBER || 'Unknown',
        to_number: '+15555555555',
        answered_by_user_id: userId,
        assigned_to: userId,
        status: 'ringing',
        direction: 'outbound',
        twilio_call_sid: 'TEST_' + Date.now(),
        metadata: {
          contactName: 'Test Contact',
          initiatedBy: userId
        }
      })
      .select()
      .single()

    if (callError) {
      console.log('❌ FAILED TO INSERT CALL RECORD!')
      console.log('   Error code:', callError.code)
      console.log('   Error message:', callError.message)
      console.log('   Error details:', JSON.stringify(callError, null, 2))
      console.log('')
      console.log('🔍 This is the root cause! The outbound route cannot create call records.')
      console.log('   Possible causes:')
      console.log('   1. RLS (Row Level Security) policy blocking insert')
      console.log('   2. Missing required fields')
      console.log('   3. Foreign key constraint violation')
      console.log('   4. Invalid data format')
    } else {
      console.log('✅ Call record inserted successfully!')
      console.log('   Call ID:', callRecord.id)
      console.log('   Direction:', callRecord.direction)
      console.log('   Status:', callRecord.status)
      console.log('')

      // Clean up test record
      console.log('🧹 Cleaning up test record...')
      await adminClient
        .from('calls')
        .delete()
        .eq('id', callRecord.id)
      console.log('✅ Test record deleted')
    }
  } catch (e) {
    console.log('❌ EXCEPTION:', e.message)
    console.log('   Stack:', e.stack)
  }
}

testOutboundInsert()
