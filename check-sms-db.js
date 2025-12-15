const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function checkDatabase() {
  console.log('🔍 Checking database for SMS messages...\n')

  // Check conversations
  const { data: conversations, error: convError } = await supabase
    .from('sms_conversations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  if (convError) {
    console.log('❌ Error fetching conversations:', convError.message)
  } else {
    console.log(`📱 Found ${conversations?.length || 0} conversations`)
    conversations?.forEach(c => {
      console.log(`   - Contact: ${c.contact_phone_number} (ID: ${c.id})`)
      console.log(`     Last message: ${c.last_message_preview}`)
      console.log(`     Unread: ${c.unread_count}`)
    })
  }

  console.log('')

  // Check messages
  const { data: messages, error: msgError } = await supabase
    .from('sms_messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)

  if (msgError) {
    console.log('❌ Error fetching messages:', msgError.message)
  } else {
    console.log(`💬 Found ${messages?.length || 0} messages`)
    messages?.forEach(m => {
      console.log(`   - ${m.direction}: "${m.body}" (${m.status})`)
      console.log(`     From: ${m.from_number} To: ${m.to_number}`)
      console.log(`     Created: ${m.created_at}`)
    })
  }
}

checkDatabase()
