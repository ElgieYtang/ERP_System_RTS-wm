import { FormField, Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { ScanSearch } from 'lucide-react'
import { useEffect, useRef } from 'react'

export function DeliveryReceiptBarcodeScanner({
  value,
  status,
  tone,
  disabled = false,
  busy = false,
  serialMode = false,
  onChange,
  onScan,
}) {
  const inputRef = useRef(null)
  const burstCount = useRef(0)
  const lastKeyAt = useRef(0)
  const idleTimer = useRef(null)
  const submitting = useRef(false)

  useEffect(() => {
    if (disabled) return
    const focus = () => inputRef.current?.focus()
    const frame = window.requestAnimationFrame(focus)
    const timeout = window.setTimeout(focus, 30)
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(timeout)
    }
  }, [disabled, busy, status, serialMode])

  function currentValue() {
    return (inputRef.current?.value ?? value).trim()
  }

  function submitScan(raw) {
    const barcode = (raw ?? currentValue()).trim()
    if (!barcode || disabled || busy || submitting.current) return
    submitting.current = true
    if (idleTimer.current) {
      window.clearTimeout(idleTimer.current)
      idleTimer.current = null
    }
    burstCount.current = 0
    onScan(barcode)
    window.setTimeout(() => {
      submitting.current = false
      inputRef.current?.focus()
    }, 50)
  }

  function handleSubmit(event) {
    event.preventDefault()
    submitScan()
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault()
      submitScan()
      return
    }

    const now = Date.now()
    if (now - lastKeyAt.current < 50) {
      burstCount.current += 1
    } else {
      burstCount.current = 1
    }
    lastKeyAt.current = now

    if (idleTimer.current) window.clearTimeout(idleTimer.current)
    idleTimer.current = window.setTimeout(() => {
      if (burstCount.current >= 4) {
        submitScan()
      }
      burstCount.current = 0
    }, 80)
  }

  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3">
      <form className="space-y-2" onSubmit={handleSubmit}>
        <FormField
          label="Scan Barcode"
          labelClassName="text-sm font-semibold text-text-primary"
        >
          <div className="relative">
            <ScanSearch
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
              aria-hidden="true"
            />
            <Input
              ref={inputRef}
              value={value}
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={serialMode ? 'Scan serial number...' : 'Scan item barcode...'}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              disabled={disabled}
              enterKeyHint="done"
              aria-label="Scan Barcode"
              className="pl-9"
            />
          </div>
        </FormField>
        <p
          className={cn(
            'text-xs',
            tone === 'success' && 'text-emerald-700',
            tone === 'error' && 'text-error-text',
            tone === 'ready' && 'text-text-secondary',
          )}
        >
          {status}
        </p>
      </form>
    </div>
  )
}
