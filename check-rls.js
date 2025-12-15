const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://zcosbiwvstrwmyioqdjw.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function checkRLS() {
  console.log('🔍 Checking RLS status on SMS tables...\n')
  
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename LIKE 'sms_%'
    `
  })
  
  if (error) {
    console.log('Using alternative method...\n')
    // Just try to query and see what happens
    const { data: msgs, error: msgError } = await supabase
      .from('sms_messages')
      .select('id')
      .limit(1)
    
    if (msgError) {
      console.log('❌ Error querying sms_messages:', msgError.message)
      console.log('   This suggests RLS is blocking access')
    } else {
      console.log('✅ Can query sms_messages (found', msgs?.length || 0, 'rows)')
    }
  } else {
    console.log('RLS Status:', data)
  }
}

checkRLS()
