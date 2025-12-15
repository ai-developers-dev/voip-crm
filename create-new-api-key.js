const twilio = require('twilio')
require('dotenv').config({ path: '.env.local' })

console.log('🔑 Creating a NEW Twilio API Key...\n')
console.log('This will create a fresh API Key/Secret pair for your VoIP app.\n')

// Use Account SID and Auth Token to create a new API Key
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

client.newKeys
  .create({ friendlyName: 'VoIP App Key - ' + new Date().toISOString() })
  .then(key => {
    console.log('✅ SUCCESS! New API Key created!\n')
    console.log('=' .repeat(70))
    console.log('COPY THESE VALUES TO YOUR .env.local FILE:')
    console.log('=' .repeat(70))
    console.log()
    console.log(`TWILIO_API_KEY=${key.sid}`)
    console.log(`TWILIO_API_SECRET=${key.secret}`)
    console.log()
    console.log('=' .repeat(70))
    console.log()
    console.log('⚠️  IMPORTANT: The secret above is shown ONLY ONCE!')
    console.log('   Copy it now and update your .env.local file.')
    console.log()
    console.log('After updating .env.local:')
    console.log('1. Restart your Next.js dev server (stop and run: npm run dev)')
    console.log('2. The Twilio Device should register successfully')
    console.log()
  })
  .catch(error => {
    console.error('❌ Error creating API Key:', error.message)
    console.error()

    if (error.code === 20003) {
      console.error('Authentication failed. This means:')
      console.error('  - Your TWILIO_AUTH_TOKEN is incorrect')
      console.error('  - Your TWILIO_ACCOUNT_SID is incorrect')
      console.error()
      console.error('To fix:')
      console.error('  1. Go to https://console.twilio.com')
      console.error('  2. Click "Show" under Auth Token')
      console.error('  3. Update TWILIO_AUTH_TOKEN in .env.local')
      console.error('  4. Run this script again')
    } else {
      console.error('Full error:', error)
    }

    process.exit(1)
  })
