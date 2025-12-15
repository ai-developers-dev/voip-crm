const twilio = require('twilio')
require('dotenv').config({ path: '.env.local' })

console.log('🔍 Testing API Key and Secret for JWT generation...\n')

// The API Key and Secret are what's used to sign JWT tokens
// If the secret is wrong, Twilio will reject the JWT

const AccessToken = twilio.jwt.AccessToken
const VoiceGrant = AccessToken.VoiceGrant

console.log('Credentials being used:')
console.log('  TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID?.substring(0, 10) + '...')
console.log('  TWILIO_API_KEY:', process.env.TWILIO_API_KEY?.substring(0, 10) + '...')
console.log('  TWILIO_API_SECRET:', process.env.TWILIO_API_SECRET ? '***' + process.env.TWILIO_API_SECRET.substring(process.env.TWILIO_API_SECRET.length - 4) + ' (last 4)' : '❌ NOT SET')
console.log()

// Generate token exactly like your API does
try {
  const now = Math.floor(Date.now() / 1000)
  const ttl = 14400 // 4 hours

  const token = new AccessToken(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_API_KEY,
    process.env.TWILIO_API_SECRET,
    {
      identity: 'test-user',
      ttl: ttl
    }
  )

  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: process.env.TWILIO_TWIML_APP_SID,
    incomingAllow: true,
  })

  token.addGrant(voiceGrant)

  const jwt = token.toJwt()

  console.log('✅ JWT Token generated successfully!')
  console.log()
  console.log('Token (first 100 chars):', jwt.substring(0, 100) + '...')
  console.log()

  // Decode the JWT to inspect it
  const parts = jwt.split('.')
  const header = JSON.parse(Buffer.from(parts[0], 'base64').toString())
  const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())

  console.log('JWT Header:', JSON.stringify(header, null, 2))
  console.log()
  console.log('JWT Payload:', JSON.stringify(payload, null, 2))
  console.log()

  console.log('⚠️  The token was generated successfully, but Twilio is still rejecting it.')
  console.log()
  console.log('This means one of these is incorrect:')
  console.log('  1. TWILIO_API_SECRET - The secret paired with your API Key')
  console.log('  2. TWILIO_API_KEY - The API Key itself might be invalid/deleted')
  console.log()
  console.log('To fix this, you need to:')
  console.log('  1. Go to https://console.twilio.com/us1/account/keys-credentials/api-keys')
  console.log('  2. Find the API Key: ' + process.env.TWILIO_API_KEY)
  console.log('  3. If it doesn\'t exist, create a new one')
  console.log('  4. Update both TWILIO_API_KEY and TWILIO_API_SECRET in .env.local')
  console.log()
  console.log('NOTE: The API Secret is only shown ONCE when you create the key!')
  console.log('      If you lost it, you must create a new API Key.')

} catch (error) {
  console.error('❌ Error generating token:', error.message)
  console.error(error)
}
