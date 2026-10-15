import { useEffect, useRef } from 'react'

const RAPID_MS = 50
const MIN_BURST = 4
const MIN_LENGTH = 3
const IDLE_MS = 80

function isScannerTarget(target) {
  if (!(target instanceof HTMLElement)) return true
  if (target instanceof HTMLTextAreaElement) return false
  if (target instanceof HTMLInputElement) {
    if (target.type === 'password') return false
    if (target.getAttribute('aria-label') === 'Scan Barcode') return false
  }
  return true
}

export function usePhysicalBarcodeScan(onScan) {
  const onScanRef = useRef(onScan)

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  useEffect(() => {
    let buffer = ''
    let burst = 0
    let lastAt = 0
    let idleTimer = null

    function reset() {
      buffer = ''
      burst = 0
      if (idleTimer !== null) {
        window.clearTimeout(idleTimer)
        idleTimer = null
      }
    }

    function commit() {
      const code = buffer.trim()
      reset()
      if (code.length >= MIN_LENGTH) onScanRef.current(code)
    }

    function onKeyDown(event) {
      if (!isScannerTarget(event.target)) return
      if (event.ctrlKey || event.metaKey || event.altKey) return

      const now = Date.now()
      if (lastAt && now - lastAt > RAPID_MS) {
        burst = 0
        buffer = ''
      }
      lastAt = now

      if (event.key === 'Enter') {
        if (buffer.length >= MIN_LENGTH) {
          event.preventDefault()
          commit()
        }
        return
      }

      if (event.key.length !== 1) return

      buffer += event.key
      burst += 1

      if (idleTimer !== null) window.clearTimeout(idleTimer)
      idleTimer = window.setTimeout(() => {
        if (burst >= MIN_BURST && buffer.length >= MIN_LENGTH) commit()
        else reset()
      }, IDLE_MS)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      reset()
    }
  }, [])
}
