const twilio = require('twilio')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const AccessToken = twilio.jwt.AccessToken
const VoiceGrant = AccessToken.VoiceGrant

console.log('🔍 Verifying Twilio Credentials...\n')

// Check if environment variables are set
console.log('Environment Variables:')
console.log('✓ TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? `${process.env.TWILIO_ACCOUNT_SID.substring(0, 10)}...` : '❌ NOT SET')
console.log('✓ TWILIO_API_KEY:', process.env.TWILIO_API_KEY ? `${process.env.TWILIO_API_KEY.substring(0, 10)}...` : '❌ NOT SET')
console.log('✓ TWILIO_API_SECRET:', process.env.TWILIO_API_SECRET ? '***set***' : '❌ NOT SET')
console.log('✓ TWILIO_TWIML_APP_SID:', process.env.TWILIO_TWIML_APP_SID ? `${process.env.TWILIO_TWIML_APP_SID.substring(0, 10)}...` : '❌ NOT SET')
console.log('✓ TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? '***set***' : '❌ NOT SET')
console.log()

// Verify that credentials are set
if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_API_KEY || !process.env.TWILIO_API_SECRET || !process.env.TWILIO_TWIML_APP_SID) {
  console.error('❌ Missing required Twilio credentials!')
  process.exit(1)
}

// Test 1: Verify Twilio Account with Auth Token
console.log('Test 1: Verifying Twilio Account with Auth Token...')
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

client.api.accounts(process.env.TWILIO_ACCOUNT_SID)
  .fetch()
  .then(account => {
    console.log('✅ Account verified!')
    console.log('   Account SID:', account.sid)
    console.log('   Account Status:', account.status)
    console.log('   Account Name:', account.friendlyName)
    console.log()

    // Test 2: Verify API Key exists
    console.log('Test 2: Verifying API Key exists...')
    return client.keys(process.env.TWILIO_API_KEY).fetch()
  })
  .then(key => {
    console.log('✅ API Key verified!')
    console.log('   Key SID:', key.sid)
    console.log('   Key Name:', key.friendlyName)
    console.log()

    // Test 3: Verify TwiML App exists
    console.log('Test 3: Verifying TwiML App exists...')
    return client.applications(process.env.TWILIO_TWIML_APP_SID).fetch()
  })
  .then(app => {
    console.log('✅ TwiML App verified!')
    console.log('   App SID:', app.sid)
    console.log('   App Name:', app.friendlyName)
    console.log('   Voice URL:', app.voiceUrl)
    console.log()

    // Test 4: Generate a test token
    console.log('Test 4: Generating test access token...')
    const token = new AccessToken(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_API_KEY,
      process.env.TWILIO_API_SECRET,
      {
        identity: 'test-user-123',
        ttl: 14400
      }
    )

    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: process.env.TWILIO_TWIML_APP_SID,
      incomingAllow: true,
    })

    token.addGrant(voiceGrant)

    const jwt = token.toJwt()
    console.log('✅ Token generated successfully!')
    console.log('   Token (first 50 chars):', jwt.substring(0, 50) + '...')
    console.log()

    // Decode and display token
    const decoded = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString())
    console.log('   Token Details:')
    console.log('   - Identity:', decoded.grants.identity)
    console.log('   - Issued At:', new Date(decoded.iat * 1000).toISOString())
    console.log('   - Expires At:', new Date(decoded.exp * 1000).toISOString())
    console.log('   - Issuer (API Key):', decoded.iss)
    console.log('   - Subject (Account SID):', decoded.sub)
    console.log()

    console.log('🎉 All tests passed! Your Twilio credentials are valid.')
    console.log()
    console.log('⚠️  If you\'re still getting "JWT is invalid" errors, the issue might be:')
    console.log('   1. The API Secret in your .env.local file is incorrect')
    console.log('   2. The API Key was regenerated in Twilio console (you need to update the secret)')
    console.log('   3. Clock skew between your server and Twilio (unlikely)')
  })
  .catch(error => {
    console.error('❌ Error:', error.message)
    console.error()

    if (error.code === 20003) {
      console.error('This usually means:')
      console.error('  - TWILIO_AUTH_TOKEN is incorrect')
      console.error('  - TWILIO_ACCOUNT_SID is incorrect')
    } else if (error.code === 20404) {
      console.error('This usually means:')
      console.error('  - The API Key or TwiML App SID does not exist')
      console.error('  - Check your Twilio console at https://console.twilio.com')
    } else {
      console.error('Error details:', error)
    }

    process.exit(1)
  })
