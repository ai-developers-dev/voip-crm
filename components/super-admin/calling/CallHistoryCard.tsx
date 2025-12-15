'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Contact {
  id: string
  first_name: string
  last_name: string
  business_name: string | null
}

interface CallRecord {
  id: string
  from_number: string
  to_number: string
  status: string
  direction: string
  answered_by_user_id: string | null
  answered_at: string | null
  ended_at: string | null
  created_at: string
  duration: number | null
  answered_by_user?: {
    full_name: string
  }
  contact?: Contact
}

export default function CallHistoryCard() {
  const [calls, setCalls] = useState<CallRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  const fetchCalls = async () => {
    try {
      // Get date 7 days ago
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const sevenDaysAgoISO = sevenDaysAgo.toISOString()

      console.log('📅 Fetching calls from last 7 days (since:', sevenDaysAgoISO, ')')

      // Fetch calls from last 7 days
      const { data: callsData, error: callsError } = await supabase
        .from('calls')
        .select(`
          id,
          from_number,
          to_number,
          status,
          direction,
          answered_by_user_id,
          answered_at,
          ended_at,
          created_at,
          duration
        `)
        .gte('created_at', sevenDaysAgoISO)
        .order('created_at', { ascending: false })

      if (callsError) throw callsError

      // Fetch user data via API endpoint
      const response = await fetch('/api/saas-users/list', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })

      const { users: allUsers } = await response.json()

      // Create users map
      const usersMap: Record<string, { full_name: string }> = {}
      allUsers?.forEach((user: any) => {
        if (user.id && user.full_name) {
          usersMap[user.id] = { full_name: user.full_name }
        }
      })

      // Merge user data with calls
      const callsWithUsers = callsData?.map(call => ({
        ...call,
        answered_by_user: call.answered_by_user_id ? usersMap[call.answered_by_user_id] : undefined
      })) || []

      // Fetch contacts for phone numbers
      console.log('🔍 Fetching contact names for phone numbers...')
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, phone, first_name, last_name, business_name')

      // Create phone number to contact map
      const contactsMap: Record<string, Contact> = {}
      contacts?.forEach((contact: any) => {
        if (contact.phone) {
          // Normalize phone number for comparison (remove +1, spaces, dashes)
          const normalizedPhone = contact.phone.replace(/[\s\-+]/g, '')
          contactsMap[normalizedPhone] = {
            id: contact.id,
            first_name: contact.first_name,
            last_name: contact.last_name,
            business_name: contact.business_name
          }
        }
      })

      // Attach contact info to each call
      const callsWithContacts = callsWithUsers.map(call => {
        // For inbound calls, check from_number
        // For outbound calls, check to_number
        const phoneToCheck = call.direction === 'inbound' ? call.from_number : call.to_number
        const normalizedPhone = phoneToCheck.replace(/[\s\-+]/g, '')

        // Try different normalizations
        let contact = contactsMap[normalizedPhone]
        if (!contact && normalizedPhone.startsWith('1') && normalizedPhone.length === 11) {
          // Try without leading 1
          contact = contactsMap[normalizedPhone.slice(1)]
        }
        if (!contact && normalizedPhone.length === 10) {
          // Try with leading 1
          contact = contactsMap['1' + normalizedPhone]
        }

        return {
          ...call,
          contact
        }
      })

      console.log('📞 Fetched calls from last 7 days:', {
        totalCalls: callsWithContacts.length,
        answeredCalls: callsWithContacts.filter(c => c.answered_by_user_id).length,
        missedCalls: callsWithContacts.filter(c => !c.answered_by_user_id && (c.status === 'ringing' || c.status === 'no-answer' || c.status === 'busy')).length,
        usersFound: Object.keys(usersMap).length,
        contactsFound: callsWithContacts.filter(c => c.contact).length
      })

      setCalls(callsWithContacts)
    } catch (error) {
      console.error('Error fetching call history:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCalls()

    // Subscribe to new calls
    const channel = supabase
      .channel('call-history-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calls',
        },
        () => {
          console.log('📞 Call history changed, refreshing...')
          fetchCalls()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const formatPhoneNumber = (phone: string) => {
    const digits = phone.replace(/\D/g, '')
    if (digits.length === 11 && digits[0] === '1') {
      const number = digits.slice(1)
      return `${number.slice(0, 3)}-${number.slice(3, 6)}-${number.slice(6)}`
    } else if (digits.length === 10) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
    }
    return phone.replace('+', '')
  }

  const formatDuration = (call: CallRecord) => {
    let seconds = call.duration

    // If duration is null but we have answered_at and ended_at, calculate it
    if (!seconds && call.answered_at && call.ended_at) {
      const answeredTime = new Date(call.answered_at).getTime()
      const endedTime = new Date(call.ended_at).getTime()
      seconds = Math.floor((endedTime - answeredTime) / 1000)
    }

    if (!seconds) return 'N/A'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getStatusInfo = (call: CallRecord) => {
    // For outbound calls, check status and duration, NOT answered_by_user_id
    // (answered_by_user_id for outbound = who made the call, not who answered)
    if (call.direction === 'outbound') {
      if (call.status === 'busy') {
        return {
          type: 'busy',
          label: 'Busy',
          color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
          icon: '🔕'
        }
      }
      if (call.status === 'no-answer' || call.status === 'canceled' || (call.status === 'ringing' && !call.duration)) {
        return {
          type: 'no-answer',
          label: 'No Answer',
          color: 'bg-red-100 text-red-700 border-red-200',
          icon: '📵'
        }
      }
      // For completed outbound calls with short duration (< 10 seconds), likely voicemail
      if (call.status === 'completed' && call.duration && call.duration < 10) {
        return {
          type: 'not-completed',
          label: 'Not Completed',
          color: 'bg-red-100 text-red-700 border-red-200',
          icon: '📵'
        }
      }
      // For completed outbound calls with longer duration (actual conversation)
      if (call.status === 'completed' && call.duration && call.duration >= 10) {
        return {
          type: 'completed',
          label: 'Completed',
          color: 'bg-green-100 text-green-700 border-green-200',
          icon: '✅'
        }
      }
      // Default for other outbound statuses
      return {
        type: 'other',
        label: call.status,
        color: 'bg-slate-100 text-slate-600 border-slate-200',
        icon: '📞'
      }
    }

    // For inbound calls, use answered_by_user_id (this is correct for inbound)
    // Missed call: ringing status and no answered_by_user_id
    if ((call.status === 'ringing' || call.status === 'no-answer' || call.status === 'busy') && !call.answered_by_user_id) {
      return {
        type: 'missed',
        label: 'Missed',
        color: 'bg-red-100 text-red-700 border-red-200',
        icon: '📵'
      }
    }

    // Accepted call: has answered_by_user_id
    if (call.answered_by_user_id) {
      return {
        type: 'accepted',
        label: 'Answered',
        color: 'bg-green-100 text-green-700 border-green-200',
        icon: '✅'
      }
    }

    // Default/other
    return {
      type: 'other',
      label: call.status,
      color: 'bg-slate-100 text-slate-600 border-slate-200',
      icon: '📞'
    }
  }

  if (isLoading) {
    return (
      <div className="backdrop-blur-lg bg-white/70 rounded-xl shadow-lg border border-white/20 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="backdrop-blur-lg bg-white/70 rounded-xl shadow-lg border border-white/20 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-50/80 to-white/60 backdrop-blur-sm p-4 sm:p-6 border-b border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-slate-500 to-slate-600 rounded-full flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-lg">📋</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Call History</h3>
              <p className="text-xs text-slate-500">Last 7 days</p>
            </div>
          </div>
          <span className="bg-slate-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">
            {calls.length}
          </span>
        </div>
      </div>

      {/* Call List */}
      <div className="max-h-96 overflow-y-auto">
        {calls.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-3xl">📞</span>
            </div>
            <p className="text-sm text-slate-400 font-medium">No calls yet</p>
          </div>
        ) : (
          <div className="space-y-3 p-4">
            {calls.map((call) => {
              const isInbound = call.direction === 'inbound'
              return (
                <div
                  key={call.id}
                  className="flex items-center justify-between p-4 bg-white/50 rounded-lg border border-slate-200 hover:border-blue-300 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isInbound ? 'bg-green-100' : 'bg-blue-100'
                    }`}>
                      <svg className={`w-5 h-5 ${isInbound ? 'text-green-600' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">
                          {isInbound ? 'Inbound Call' : 'Outbound Call'}
                        </p>
                        {call.contact ? (
                          <span className="text-sm text-slate-600">
                            - {call.contact.business_name || `${call.contact.first_name} ${call.contact.last_name}`}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-600 font-mono">
                            - {formatPhoneNumber(isInbound ? call.from_number : call.to_number)}
                          </span>
                        )}
                      </div>
                      {call.answered_by_user_id && call.answered_by_user?.full_name && (
                        <p className="text-xs text-slate-500">
                          {isInbound ? 'Answered by' : 'Called by'} {call.answered_by_user.full_name}
                        </p>
                      )}
                      <p className="text-sm text-slate-600">{formatDateTime(call.created_at)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-slate-900">{formatDuration(call)}</p>
                    <p className={`text-sm font-medium ${
                      call.status === 'completed' ? 'text-green-600' : 'text-slate-500'
                    }`}>
                      {call.status}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
