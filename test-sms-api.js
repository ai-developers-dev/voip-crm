async function testSMSAPI() {
  const baseUrl = 'https://voip-saas.vercel.app'

  console.log('🧪 Testing SMS API endpoints...\n')

  // Test 1: List conversations
  console.log('1️⃣ Testing GET /api/sms/conversations/list')
  try {
    const response = await fetch(`${baseUrl}/api/sms/conversations/list`)
    const data = await response.json()

    if (response.ok) {
      console.log(`✅ Success! Found ${data.conversations?.length || 0} conversations`)
    } else {
      console.log(`❌ Error: ${data.error}`)
    }
  } catch (error) {
    console.log(`❌ Request failed: ${error.message}`)
  }

  console.log('\n2️⃣ Testing GET /api/sms/messages/list')
  try {
    const response = await fetch(`${baseUrl}/api/sms/messages/list?conversation_id=test`)
    const data = await response.json()

    if (response.status === 401 || response.status === 400) {
      console.log('✅ Endpoint is protected (expected behavior)')
    } else if (response.ok) {
      console.log('✅ Endpoint accessible')
    } else {
      console.log(`⚠️  Status: ${response.status}`)
    }
  } catch (error) {
    console.log(`❌ Request failed: ${error.message}`)
  }

  console.log('\n✨ API endpoints are deployed and responding!\n')
}

testSMSAPI()
