const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function fixOrganization() {
  console.log('🔧 Setting Twilio number on organization...\n')

  const { data, error } = await supabase
    .from('organizations')
    .update({ twilio_number: '+18775196150' })
    .eq('id', '9abcaa0f-5e39-41f5-b269-2b5872720768')
    .select()

  if (error) {
    console.log('❌ Error updating organization:', error.message)
  } else {
    console.log('✅ Organization updated successfully!')
    console.log('   Name:', data[0].name)
    console.log('   Twilio number:', data[0].twilio_number)
    console.log('\n🎉 SMS webhooks will now work!\n')
  }
}

fixOrganization()
