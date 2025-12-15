const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function checkSchema() {
  console.log('🔍 Discovering voip_users schema...\n')

  // Get one row to see all columns
  const { data: sample, error } = await supabase
    .from('voip_users')
    .select('*')
    .limit(1)
    .single()

  if (error) {
    console.log('❌ Error:', error.message)
    return
  }

  console.log('voip_users columns:', Object.keys(sample))
  console.log('\nSample record:')
  console.log(JSON.stringify(sample, null, 2))

  // Check what answered_by_user_id is used in working inbound calls
  console.log('\n\n📞 Checking inbound calls...\n')
  const { data: inboundCall } = await supabase
    .from('calls')
    .select('id, answered_by_user_id, direction')
    .eq('direction', 'inbound')
    .not('answered_by_user_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  console.log('Recent inbound call answered_by_user_id:', inboundCall?.answered_by_user_id)

  // Check if this ID is a voip_users.id
  const { data: voipUser } = await supabase
    .from('voip_users')
    .select('*')
    .eq('id', inboundCall?.answered_by_user_id)
    .maybeSingle()

  if (voipUser) {
    console.log('✅ This IS a voip_users.id!')
    console.log('   Name:', voipUser.name)
    console.log('\n💡 So voip_users.id IS the same as users.id!')
    console.log('   The foreign key calls.answered_by_user_id -> users.id works')
    console.log('   because voip_users.id is the SAME as users.id (shared primary key)\n')
  } else {
    console.log('❌ This is NOT a voip_users.id')
  }
}

checkSchema()
