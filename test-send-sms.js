const twilio = require('twilio')

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

async function testSendSMS() {
  try {
    console.log('🧪 Testing SMS send from Twilio...\n')
    
    // Try to send a test SMS
    const message = await client.messages.create({
      body: 'Test SMS from your VoIP app',
      from: '+18775196150',
      to: '+17202401470' // Your number - replace if needed
    })
    
    console.log('✅ SMS sent successfully!')
    console.log('   SID:', message.sid)
    console.log('   Status:', message.status)
    console.log('   Direction:', message.direction)
    
  } catch (error) {
    console.error('❌ Error sending SMS:', error.message)
    console.error('   Code:', error.code)
    
    if (error.code === 21608) {
      console.log('\n⚠️  A2P 10DLC REGISTRATION REQUIRED')
      console.log('   Your Twilio account needs A2P 10DLC registration to send SMS.')
      console.log('   Steps:')
      console.log('   1. Go to: https://console.twilio.com/us1/develop/sms/settings/a2p-registration')
      console.log('   2. Register your business')
      console.log('   3. Create a brand and campaign')
      console.log('   4. This usually takes 1-5 business days\n')
    } else if (error.code === 21211) {
      console.log('\n⚠️  INVALID PHONE NUMBER')
      console.log('   The destination phone number is not valid.\n')
    } else if (error.code === 21408) {
      console.log('\n⚠️  GEOGRAPHIC PERMISSIONS')
      console.log('   You may need to enable SMS for certain countries.')
      console.log('   Go to: https://console.twilio.com/us1/develop/sms/settings/geo-permissions\n')
    }
  }
}

testSendSMS()
