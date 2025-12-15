const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function verifyTables() {
  try {
    console.log('🔍 Checking SMS tables...\n')

    // Check sms_conversations
    const { error: convError } = await supabase
      .from('sms_conversations')
      .select('count')
      .limit(1)

    if (!convError) {
      console.log('✅ sms_conversations table exists')
    } else {
      console.log('❌ sms_conversations:', convError.message)
    }

    // Check sms_messages
    const { error: msgError } = await supabase
      .from('sms_messages')
      .select('count')
      .limit(1)

    if (!msgError) {
      console.log('✅ sms_messages table exists')
    } else {
      console.log('❌ sms_messages:', msgError.message)
    }

    // Check sms_message_events
    const { error: eventsError } = await supabase
      .from('sms_message_events')
      .select('count')
      .limit(1)

    if (!eventsError) {
      console.log('✅ sms_message_events table exists')
    } else {
      console.log('❌ sms_message_events:', eventsError.message)
    }

    console.log('\n✨ Database verification complete!')
  } catch (error) {
    console.error('Error:', error.message)
  }
}

verifyTables()
