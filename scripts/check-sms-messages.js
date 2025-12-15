const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkSMS() {
  console.log('🔍 Checking SMS messages and Rhonda Allen contact...\n')

  // Get Rhonda Allen's contact info
  const { data: rhonda, error: rhondaError } = await supabase
    .from('contacts')
    .select('*')
    .ilike('first_name', 'rhonda')
    .ilike('last_name', 'allen')
    .single()

  if (rhondaError) {
    console.error('❌ Error finding Rhonda:', rhondaError)
    return
  }

  console.log('📋 Rhonda Allen contact:')
  console.log('  ID:', rhonda.id)
  console.log('  Phone:', rhonda.phone)
  console.log('  Normalized:', rhonda.phone.replace(/[\s\-+]/g, ''))
  console.log('')

  // Get recent SMS messages (last 30 minutes)
  const thirtyMinutesAgo = new Date()
  thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30)

  const { data: recentSMS, error: smsError } = await supabase
    .from('sms_messages')
    .select('*')
    .gte('created_at', thirtyMinutesAgo.toISOString())
    .order('created_at', { ascending: false })

  if (smsError) {
    console.error('❌ Error fetching SMS:', smsError)
    return
  }

  console.log(`📱 Recent SMS messages (last 30 min): ${recentSMS?.length || 0}\n`)

  if (recentSMS && recentSMS.length > 0) {
    recentSMS.forEach(sms => {
      console.log('  SMS:', {
        id: sms.id,
        from: sms.from_number,
        to: sms.to_number,
        direction: sms.direction,
        conversation_id: sms.conversation_id,
        body: sms.message_body?.substring(0, 50) + '...',
        created_at: sms.created_at
      })
    })
  } else {
    console.log('  No recent SMS found')
  }

  console.log('\n🔍 Checking if phone numbers match...')

  const rhondaNormalized = rhonda.phone.replace(/[\s\-+]/g, '')
  console.log('  Rhonda normalized:', rhondaNormalized)

  if (recentSMS && recentSMS.length > 0) {
    recentSMS.forEach(sms => {
      const fromNormalized = sms.from_number.replace(/[\s\-+]/g, '')
      const toNormalized = sms.to_number.replace(/[\s\-+]/g, '')

      console.log(`\n  SMS from ${sms.from_number} to ${sms.to_number}:`)
      console.log(`    From normalized: ${fromNormalized}`)
      console.log(`    To normalized: ${toNormalized}`)
      console.log(`    Matches Rhonda? ${fromNormalized === rhondaNormalized || toNormalized === rhondaNormalized || fromNormalized === '1' + rhondaNormalized || toNormalized === '1' + rhondaNormalized}`)
    })
  }

  // Check SMS conversations
  console.log('\n📋 SMS Conversations for Rhonda Allen:')
  const { data: conversations, error: convError } = await supabase
    .from('sms_conversations')
    .select('*')
    .eq('contact_id', rhonda.id)

  if (convError) {
    console.error('❌ Error fetching conversations:', convError)
  } else {
    console.log(`  Found ${conversations?.length || 0} conversations`)
    conversations?.forEach(conv => {
      console.log('    Conversation:', {
        id: conv.id,
        contact_phone: conv.contact_phone_number,
        last_message: conv.last_message_at
      })
    })
  }
}

checkSMS()
