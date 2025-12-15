const twilio = require('twilio')

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const twimlAppSid = process.env.TWILIO_TWIML_APP_SID
const productionUrl = 'https://voip-saas.vercel.app'

const client = twilio(accountSid, authToken)

async function configureTwiMLApp() {
  console.log('🔧 Configuring Twilio TwiML App for outbound calls...\n')
  console.log(`   TwiML App SID: ${twimlAppSid}\n`)

  try {
    // First, fetch current configuration
    const app = await client.applications(twimlAppSid).fetch()

    console.log('📋 Current configuration:')
    console.log(`   Friendly Name: ${app.friendlyName}`)
    console.log(`   Voice URL: ${app.voiceUrl || '(not set)'}`)
    console.log(`   Voice Method: ${app.voiceMethod || '(not set)'}`)
    console.log('')

    // Update to use outbound endpoint
    const newVoiceUrl = `${productionUrl}/api/twilio/outbound`

    console.log('🚀 Updating TwiML App configuration...')
    console.log(`   New Voice URL: ${newVoiceUrl}`)
    console.log(`   Method: POST\n`)

    const updated = await client.applications(twimlAppSid)
      .update({
        voiceUrl: newVoiceUrl,
        voiceMethod: 'POST',
        friendlyName: app.friendlyName || 'VoIP SaaS App'
      })

    console.log('✅ TwiML App updated successfully!')
    console.log(`   Voice URL: ${updated.voiceUrl}`)
    console.log(`   Voice Method: ${updated.voiceMethod}`)
    console.log('')
    console.log('🎉 Outbound calls will now be tracked!')
    console.log('   Try making an outbound call and the counter should increment.\n')

  } catch (error) {
    console.error('❌ Error configuring TwiML App:', error.message)
    console.error('')
    console.error('Manual configuration required:')
    console.error(`1. Go to: https://console.twilio.com/us1/develop/voice/manage/twiml-apps/${twimlAppSid}`)
    console.error(`2. Set 'Voice Request URL' to: ${productionUrl}/api/twilio/outbound`)
    console.error('3. Set HTTP Method to: POST')
    console.error('4. Click Save')
  }
}

configureTwiMLApp()
