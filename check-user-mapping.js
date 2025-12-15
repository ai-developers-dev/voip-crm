const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function checkUserMapping() {
  console.log('🔍 Checking voip_users and users relationship...\n')

  // Get all voip_users
  const { data: voipUsers, error: voipError } = await supabase
    .from('voip_users')
    .select('id, user_id, name, today_inbound_calls, today_outbound_calls')

  if (voipError) {
    console.log('❌ Error fetching voip_users:', voipError.message)
    return
  }

  console.log(`Found ${voipUsers?.length || 0} voip_users:\n`)

  if (!voipUsers || voipUsers.length === 0) {
    console.log('❌ No voip_users found!')
    return
  }

  for (const voipUser of voipUsers) {
    console.log('👤 VoIP User:', voipUser.name)
    console.log('   voip_users.id:', voipUser.id)
    console.log('   voip_users.user_id:', voipUser.user_id)
    console.log('   Inbound calls today:', voipUser.today_inbound_calls)
    console.log('   Outbound calls today:', voipUser.today_outbound_calls)

    // Check if this user_id exists in users table
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', voipUser.user_id)
      .maybeSingle()

    if (userError) {
      console.log('   ❌ Error checking users table:', userError.message)
    } else if (!user) {
      console.log('   ❌ user_id NOT FOUND in users table!')
    } else {
      console.log('   ✅ user_id exists in users table')
    }
    console.log('')
  }

  // Check what ID is used in working inbound calls
  console.log('📞 Checking working inbound calls...\n')
  const { data: inboundCalls } = await supabase
    .from('calls')
    .select('id, answered_by_user_id, direction, status')
    .eq('direction', 'inbound')
    .not('answered_by_user_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(3)

  if (inboundCalls && inboundCalls.length > 0) {
    console.log('Recent inbound calls that were answered:')
    for (const call of inboundCalls) {
      console.log(`   answered_by_user_id: ${call.answered_by_user_id}`)

      // Check if this is a voip_users.id or voip_users.user_id
      const { data: matchingVoipUser } = await supabase
        .from('voip_users')
        .select('id, user_id, name')
        .eq('user_id', call.answered_by_user_id)
        .maybeSingle()

      if (matchingVoipUser) {
        console.log(`     ✅ This matches voip_users.user_id for: ${matchingVoipUser.name}`)
        console.log(`        (voip_users.id = ${matchingVoipUser.id})`)
      } else {
        console.log('     ❓ No matching voip_user found')
      }
    }
  }

  console.log('\n\n💡 SOLUTION:')
  console.log('For outbound calls in /api/twilio/outbound:')
  console.log('1. The "from" parameter from Twilio is likely the voip_users.id')
  console.log('2. But answered_by_user_id foreign key points to users.id')
  console.log('3. So we need to look up voip_users.user_id and use that instead\n')
}

checkUserMapping()
