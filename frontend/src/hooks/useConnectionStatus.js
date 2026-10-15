import { useCallback, useEffect, useState } from 'react'

import { fetchHealth } from '@/lib/api'

function browserOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}

function formatCheckedAt(date) {
  if (!date) return ''
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })
}

export function useConnectionStatus({ enabled = true, pollMs = 10000 } = {}) {
  const [status, setStatus] = useState('checking')
  const [detail, setDetail] = useState('')
  const [checkedAt, setCheckedAt] = useState(null)

  const refresh = useCallback(async () => {
    if (!enabled) return false

    if (!browserOnline()) {
      setStatus('disconnected')
      setDetail('No internet')
      setCheckedAt(new Date())
      return false
    }

    setStatus((current) => (current === 'connected' ? 'connected' : 'checking'))
    setDetail('')

    try {
      const payload = await fetchHealth()
      const databaseOk = payload?.database === 'ok'
      const appOk = payload?.status === 'ok' || databaseOk

      if (appOk) {
        setStatus('connected')
        setDetail('')
        setCheckedAt(new Date())
        return true
      }

      setStatus('disconnected')
      setDetail('Database unavailable')
      setCheckedAt(new Date())
      return false
    } catch {
      setStatus('disconnected')
      setDetail(browserOnline() ? 'Server unreachable' : 'No internet')
      setCheckedAt(new Date())
      return false
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return undefined

    refresh()

    const intervalId = window.setInterval(() => {
      refresh()
    }, pollMs)

    const onOnline = () => refresh()
    const onOffline = () => {
      setStatus('disconnected')
      setDetail('No internet')
      setCheckedAt(new Date())
    }
    const onVisible = () => {
      if (!document.hidden) refresh()
    }

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [enabled, pollMs, refresh])

  return {
    status,
    detail,
    checkedAt,
    checkedAtLabel: formatCheckedAt(checkedAt),
    isConnected: status === 'connected',
    refresh,
  }
}
