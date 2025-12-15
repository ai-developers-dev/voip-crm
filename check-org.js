const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function checkOrganization() {
  console.log('🔍 Checking organization for Twilio number...\n')

  const { data: org, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('twilio_number', '+18775196150')
    .single()

  if (error) {
    console.log('❌ NO ORGANIZATION FOUND with twilio_number = +18775196150')
    console.log('   Error:', error.message)
    console.log('\nThis is why SMS is not being saved!\n')

    // Check all organizations
    const { data: allOrgs } = await supabase
      .from('organizations')
      .select('id, name, twilio_number')

    console.log('Available organizations:')
    allOrgs?.forEach(o => {
      console.log(`   - ${o.name} (ID: ${o.id})`)
      console.log(`     Twilio number: ${o.twilio_number || 'NOT SET'}`)
    })
  } else {
    console.log('✅ Found organization:', org.name)
    console.log('   ID:', org.id)
    console.log('   Twilio number:', org.twilio_number)
  }
}

checkOrganization()
