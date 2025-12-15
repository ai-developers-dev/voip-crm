import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization_id
    const { data: voipUser, error: voipUserError } = await supabase
      .from('voip_users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (voipUserError || !voipUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const contactId = params.id

    // Fetch contact
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single()

    if (contactError || !contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    // Verify contact belongs to user's organization
    if (contact.organization_id !== voipUser.organization_id) {
      return NextResponse.json({ error: 'Unauthorized to view this contact' }, { status: 403 })
    }

    // Normalize phone number for matching (remove +1, spaces, dashes)
    const normalizedPhone = contact.phone.replace(/[\s\-+]/g, '')

    console.log('📞 Fetching history for contact:', contact.id, 'Phone:', contact.phone, 'Normalized:', normalizedPhone)

    // Fetch all calls for this organization
    const { data: allCalls, error: callsError } = await supabase
      .from('calls')
      .select('*')
      .eq('organization_id', voipUser.organization_id)
      .order('created_at', { ascending: false })
      .limit(200) // Get more to filter

    if (callsError) {
      console.error('Error fetching calls:', callsError)
    }

    // Filter calls by matching phone numbers with normalization
    const filteredCalls = allCalls?.filter(call => {
      const normalizedFrom = call.from_number?.replace(/[\s\-+]/g, '') || ''
      const normalizedTo = call.to_number?.replace(/[\s\-+]/g, '') || ''

      // Try matching with and without leading 1
      const matchFrom = normalizedFrom === normalizedPhone ||
                       normalizedFrom === '1' + normalizedPhone ||
                       normalizedFrom.slice(1) === normalizedPhone
      const matchTo = normalizedTo === normalizedPhone ||
                     normalizedTo === '1' + normalizedPhone ||
                     normalizedTo.slice(1) === normalizedPhone

      return matchFrom || matchTo
    }).slice(0, 20) || []

    // Fetch user data for agents who answered/made calls
    const { data: allUsers } = await supabase
      .from('voip_users')
      .select('id, full_name')

    // Create users map
    const usersMap: Record<string, { full_name: string }> = {}
    allUsers?.forEach((user: any) => {
      if (user.id && user.full_name) {
        usersMap[user.id] = { full_name: user.full_name }
      }
    })

    // Merge user data with calls
    const callHistory = filteredCalls?.map(call => ({
      ...call,
      answered_by_user: call.answered_by_user_id ? usersMap[call.answered_by_user_id] : undefined
    })) || []

    console.log('📞 Found', callHistory.length, 'calls')

    // First, get the SMS conversation for this contact
    const { data: conversation, error: convError } = await supabase
      .from('sms_conversations')
      .select('id')
      .eq('contact_id', contactId)
      .single()

    if (convError && convError.code !== 'PGRST116') {
      console.error('Error fetching SMS conversation:', convError)
    }

    let smsMessages = []
    if (conversation) {
      // Fetch SMS messages using the conversation ID
      const { data: messages, error: smsError } = await supabase
        .from('sms_messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (smsError) {
        console.error('Error fetching SMS messages:', smsError)
      } else {
        smsMessages = messages || []
      }
    }

    console.log('📱 Found', smsMessages?.length || 0, 'SMS messages')

    return NextResponse.json({
      contact,
      callHistory: callHistory || [],
      smsHistory: smsMessages || []
    })

  } catch (error: any) {
    console.error('Error in contacts get API:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
