const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function testAPI() {
  console.log('🔍 Testing SMS API...\n')

  // Get conversations
  const { data: conversations, error: convError } = await supabase
    .from('sms_conversations')
    .select(`
      id,
      contact_id,
      twilio_phone_number,
      contact_phone_number,
      last_message_at,
      last_message_preview,
      unread_count,
      contacts (
        id,
        first_name,
        last_name,
        business_name,
        phone
      )
    `)
    .order('last_message_at', { ascending: false })

  if (convError) {
    console.log('❌ Error fetching conversations:', convError.message)
    return
  }

  console.log(`✅ Found ${conversations.length} conversations`)
  conversations.forEach(c => {
    const contact = c.contacts
    const name = contact?.business_name || `${contact?.first_name} ${contact?.last_name}`
    console.log(`   Conversation ID: ${c.id}`)
    console.log(`   Contact: ${name}`)
    console.log(`   Phone: ${c.contact_phone_number}`)
    console.log(`   Unread: ${c.unread_count}`)
    console.log('')
  })

  // Get messages for first conversation
  if (conversations.length > 0) {
    const convId = conversations[0].id
    console.log(`📱 Fetching messages for conversation: ${convId}\n`)

    const { data: messages, error: msgError } = await supabase
      .from('sms_messages')
      .select(`
        id,
        direction,
        from_number,
        to_number,
        body,
        status,
        created_at
      `)
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })

    if (msgError) {
      console.log('❌ Error fetching messages:', msgError.message)
    } else {
      console.log(`✅ Found ${messages.length} messages:`)
      messages.forEach(m => {
        console.log(`   [${m.direction.toUpperCase()}] ${m.body}`)
        console.log(`   Status: ${m.status}, Time: ${m.created_at}`)
        console.log('')
      })
    }
  }
}

testAPI()
