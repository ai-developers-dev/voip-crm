#!/usr/bin/env node
/**
 * Diagnostic script to debug incoming calls not ringing in browser
 * Run with: node scripts/debug-incoming-calls.js
 */

const twilio = require('twilio')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function debugIncomingCalls() {
  console.log('='.repeat(70))
  console.log('INCOMING CALLS DIAGNOSTIC')
  console.log('='.repeat(70))
  console.log('')

  let issues = []
  let warnings = []

  // ===== 1. ENVIRONMENT VARIABLES =====
  console.log('1. CHECKING ENVIRONMENT VARIABLES')
  console.log('-'.repeat(50))

  const envVars = {
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_API_KEY: process.env.TWILIO_API_KEY,
    TWILIO_API_SECRET: process.env.TWILIO_API_SECRET,
    TWILIO_TWIML_APP_SID: process.env.TWILIO_TWIML_APP_SID,
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  }

  for (const [key, value] of Object.entries(envVars)) {
    if (value) {
      const masked = key.includes('SECRET') || key.includes('TOKEN') || key.includes('KEY')
        ? value.substring(0, 8) + '...'
        : value
      console.log(`   ✅ ${key}: ${masked}`)
    } else {
      console.log(`   ❌ ${key}: MISSING`)
      issues.push(`Missing environment variable: ${key}`)
    }
  }

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.log('\n❌ Cannot continue without Twilio credentials')
    return
  }

  // ===== 2. TWILIO PHONE NUMBER CONFIGURATION =====
  console.log('\n2. CHECKING TWILIO PHONE NUMBER WEBHOOK')
  console.log('-'.repeat(50))

  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )

    const phoneNumber = process.env.TWILIO_PHONE_NUMBER
    const numbers = await client.incomingPhoneNumbers.list({ phoneNumber })

    if (numbers.length === 0) {
      console.log(`   ❌ Phone number ${phoneNumber} not found in account`)
      issues.push(`Phone number ${phoneNumber} not found`)
    } else {
      const num = numbers[0]
      console.log(`   Phone Number: ${num.phoneNumber}`)
      console.log(`   SID: ${num.sid}`)
      console.log(`   Voice URL: ${num.voiceUrl || '(NOT SET)'}`)
      console.log(`   Voice Method: ${num.voiceMethod || '(NOT SET)'}`)
      console.log(`   Voice Fallback URL: ${num.voiceFallbackUrl || '(NOT SET)'}`)

      if (!num.voiceUrl) {
        console.log('\n   ❌ CRITICAL: Voice URL is NOT SET!')
        console.log('   Twilio does not know where to send incoming calls!')
        issues.push('Phone number Voice URL is not configured')
      } else if (!num.voiceUrl.includes('/api/twilio/voice')) {
        console.log('\n   ⚠️  WARNING: Voice URL may not point to correct endpoint')
        console.log(`   Expected: .../api/twilio/voice`)
        console.log(`   Actual: ${num.voiceUrl}`)
        warnings.push('Voice URL may not point to /api/twilio/voice')
      } else {
        console.log('\n   ✅ Voice URL is configured correctly')
      }

      // Store the SID for later if we need to fix it
      global.phoneNumberSid = num.sid
    }
  } catch (error) {
    console.log(`   ❌ Error checking phone number: ${error.message}`)
    issues.push(`Twilio API error: ${error.message}`)
  }

  // ===== 3. TWIML APP CONFIGURATION =====
  console.log('\n3. CHECKING TWIML APP')
  console.log('-'.repeat(50))

  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )

    const app = await client.applications(process.env.TWILIO_TWIML_APP_SID).fetch()
    console.log(`   App Name: ${app.friendlyName}`)
    console.log(`   App SID: ${app.sid}`)
    console.log(`   Voice URL: ${app.voiceUrl || '(NOT SET)'}`)
    console.log(`   Voice Method: ${app.voiceMethod || '(NOT SET)'}`)

    // Note: TwiML App Voice URL is for OUTBOUND calls from browser
    // Phone number Voice URL is for INCOMING calls to phone number
    if (app.voiceUrl && app.voiceUrl.includes('/api/twilio/outbound')) {
      console.log('\n   ✅ TwiML App configured for outbound calls')
    }
  } catch (error) {
    console.log(`   ❌ Error checking TwiML App: ${error.message}`)
    issues.push(`TwiML App error: ${error.message}`)
  }

  // ===== 4. DATABASE - AVAILABLE AGENTS =====
  console.log('\n4. CHECKING AVAILABLE AGENTS IN DATABASE')
  console.log('-'.repeat(50))

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Get all voip_users
    const { data: allUsers, error: allError } = await supabase
      .from('voip_users')
      .select('id, full_name, email, is_available, role')
      .in('role', ['agent', 'super_admin'])

    if (allError) throw allError

    console.log(`   Total agents/super_admins: ${allUsers?.length || 0}`)

    // Get available agents
    const { data: availableAgents, error: availError } = await supabase
      .from('voip_users')
      .select('id, full_name, email, is_available, role')
      .eq('is_available', true)
      .in('role', ['agent', 'super_admin'])

    if (availError) throw availError

    console.log(`   Currently AVAILABLE: ${availableAgents?.length || 0}`)
    console.log('')

    if (!availableAgents || availableAgents.length === 0) {
      console.log('   ❌ NO AGENTS AVAILABLE!')
      console.log('   All incoming calls will go to voicemail.')
      issues.push('No agents are marked as available')

      console.log('\n   All agents and their status:')
      allUsers?.forEach(u => {
        const status = u.is_available ? '🟢 AVAILABLE' : '🔴 UNAVAILABLE'
        console.log(`   ${status} ${u.full_name} (${u.email})`)
        console.log(`            ID: ${u.id}`)
      })
    } else {
      console.log('   ✅ Available agents who would receive calls:')
      availableAgents.forEach(a => {
        console.log(`   🟢 ${a.full_name} (${a.email})`)
        console.log(`      ID: ${a.id}`)
        console.log(`      Role: ${a.role}`)
      })
    }
  } catch (error) {
    console.log(`   ❌ Database error: ${error.message}`)
    issues.push(`Database error: ${error.message}`)
  }

  // ===== 5. TOKEN GENERATION TEST =====
  console.log('\n5. TESTING TOKEN GENERATION')
  console.log('-'.repeat(50))

  try {
    const AccessToken = twilio.jwt.AccessToken
    const VoiceGrant = AccessToken.VoiceGrant

    const testIdentity = 'test-diagnostic-' + Date.now()
    const token = new AccessToken(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_API_KEY,
      process.env.TWILIO_API_SECRET,
      { identity: testIdentity, ttl: 60 }
    )

    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: process.env.TWILIO_TWIML_APP_SID,
      incomingAllow: true,
    })
    token.addGrant(voiceGrant)

    const jwt = token.toJwt()
    const decoded = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString())

    console.log(`   ✅ Token generated successfully`)
    console.log(`   Identity: ${decoded.grants.identity}`)
    console.log(`   Incoming Allowed: ${decoded.grants.voice?.incoming?.allow === true ? 'YES' : 'NO'}`)
    console.log(`   Outgoing App SID: ${decoded.grants.voice?.outgoing?.application_sid || 'NOT SET'}`)

    if (decoded.grants.voice?.incoming?.allow !== true) {
      console.log('\n   ❌ CRITICAL: incomingAllow is not true!')
      issues.push('Token does not have incomingAllow permission')
    }
  } catch (error) {
    console.log(`   ❌ Token generation failed: ${error.message}`)
    issues.push(`Token generation error: ${error.message}`)
  }

  // ===== SUMMARY =====
  console.log('\n' + '='.repeat(70))
  console.log('DIAGNOSTIC SUMMARY')
  console.log('='.repeat(70))

  if (issues.length === 0 && warnings.length === 0) {
    console.log('\n✅ All checks passed!')
    console.log('\nIf calls still don\'t ring, check:')
    console.log('  1. Browser console for Twilio Device errors')
    console.log('  2. Is the calling dashboard open?')
    console.log('  3. Server logs when making a test call')
  } else {
    if (issues.length > 0) {
      console.log('\n❌ ISSUES FOUND:')
      issues.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue}`)
      })
    }
    if (warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:')
      warnings.forEach((warning, i) => {
        console.log(`   ${i + 1}. ${warning}`)
      })
    }

    // Offer to fix phone number webhook if that's the issue
    if (issues.some(i => i.includes('Voice URL'))) {
      console.log('\n' + '='.repeat(70))
      console.log('RECOMMENDED FIX: Configure phone number webhook')
      console.log('='.repeat(70))
      console.log('\nRun: node scripts/configure-phone-webhook.js')
      console.log('\nThis will set the phone number Voice URL to:')
      console.log(`  ${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/voice`)
    }

    if (issues.some(i => i.includes('No agents'))) {
      console.log('\n' + '='.repeat(70))
      console.log('RECOMMENDED FIX: Mark an agent as available')
      console.log('='.repeat(70))
      console.log('\n1. Open the calling dashboard')
      console.log('2. Toggle your availability to "Available"')
      console.log('3. Or run: node scripts/make-agent-available.js')
    }
  }

  console.log('\n' + '='.repeat(70))
}

debugIncomingCalls().catch(console.error)
