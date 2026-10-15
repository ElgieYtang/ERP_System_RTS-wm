import { useCallback, useEffect, useRef, useState } from 'react'

import { DeliveryReceiptBarcodeScanner } from '@/components/delivery-receipts/DeliveryReceiptBarcodeScanner'
import { Button } from '@/components/ui/button'
import { FormField, Input } from '@/components/ui/input'
import { useConnectionStatus } from '@/hooks/useConnectionStatus'
import { fetchSetupItemByBarcode, updateDeliverySerials } from '@/lib/transactionApi'
import { deliveryLineSerialProgress } from '@/lib/transactionRules'

function cloneItems(items) {
  return (items ?? []).map((item) => ({
    ...item,
    serialNumbers: [...(item.serialNumbers ?? [])],
  }))
}

function findLineIndexByProductId(items, productId) {
  return items.findIndex((line) => String(line.productId) === String(productId))
}

function findLineIndexByBarcode(items, code) {
  const needle = code.trim().toLowerCase()
  if (!needle) return -1
  return items.findIndex((line) => String(line.barcode ?? '').trim().toLowerCase() === needle)
}

function firstIncompleteLineIndex(items) {
  const incomplete = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !deliveryLineSerialProgress(item).complete)
  return incomplete.length === 1 ? incomplete[0].index : -1
}

function scanToneFromState({ error, saving, ok }) {
  if (error) return 'error'
  if (saving) return 'ready'
  if (ok) return 'success'
  return 'ready'
}

function ConnectionBadge({ status, detail, checkedAtLabel, onRetry, compact = false }) {
  const label =
    status === 'connected' ? 'Server online' : status === 'checking' ? 'Checking…' : 'Offline'
  const tone =
    status === 'connected'
      ? 'border-green-200 bg-green-50'
      : status === 'checking'
        ? 'border-amber-200 bg-amber-50'
        : 'border-red-200 bg-red-50'
  const dot =
    status === 'connected'
      ? 'bg-green-600'
      : status === 'checking'
        ? 'animate-pulse bg-amber-500'
        : 'bg-red-600'

  if (compact) {
    return (
      <p className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden="true" />
        <span>{label}</span>
        {checkedAtLabel ? <span>· {checkedAtLabel}</span> : null}
        {status === 'disconnected' ? (
          <button type="button" className="font-medium text-maroon hover:underline" onClick={onRetry}>
            Retry
          </button>
        ) : null}
        {detail && status !== 'connected' ? <span className="text-text-secondary">({detail})</span> : null}
      </p>
    )
  }

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2.5 ${tone}`}>
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary">{label}</p>
          {detail ? <p className="text-xs text-text-secondary">{detail}</p> : null}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {checkedAtLabel ? (
          <span className="text-[11px] text-text-secondary">{checkedAtLabel}</span>
        ) : null}
        {status === 'disconnected' ? (
          <Button type="button" size="sm" variant="secondary" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export function DeliveryReceiptScanPanel({
  deliveryId,
  items,
  onSaved,
  disabled = false,
  appearance = 'magsayo',
  onLastScannedChange,
}) {
  const connection = useConnectionStatus({ pollMs: 10000 })
  const [localItems, setLocalItems] = useState(() => cloneItems(items))
  const [activeIndex, setActiveIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [hint, setHint] = useState('Scan the item barcode, then the serial number.')
  const [barcode, setBarcode] = useState('')
  const [lastScanned, setLastScanned] = useState(null)
  const [lastScanOk, setLastScanOk] = useState(false)
  const scanCaptureRef = useRef(null)
  const ignoreRefocusUntil = useRef(0)
  const scanBlocked = disabled || saving || !connection.isConnected

  useEffect(() => {
    setLocalItems(cloneItems(items))
  }, [items])

  useEffect(() => {
    onLastScannedChange?.(lastScanned)
  }, [lastScanned, onLastScannedChange])

  const refocusCapture = useCallback(() => {
    if (appearance !== 'legacy') return
    if (scanBlocked) return
    if (Date.now() < ignoreRefocusUntil.current) return
    scanCaptureRef.current?.focus()
  }, [appearance, scanBlocked])

  useEffect(() => {
    if (appearance !== 'legacy') return undefined
    refocusCapture()
    const onMouseDown = (event) => {
      if (event.target.closest('button, a, input:not([data-scan-capture]), textarea, select')) {
        ignoreRefocusUntil.current = Date.now() + 400
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [appearance, refocusCapture])

  const activeLine = localItems[activeIndex]
  const activeProgress = activeLine ? deliveryLineSerialProgress(activeLine) : null
  const serialMode = Boolean(
    activeLine &&
      activeProgress &&
      !activeProgress.complete &&
      hint.startsWith('Scan the serial number for'),
  )

  const persistItems = async (nextItems) => {
    setSaving(true)
    setError(null)
    try {
      const updated = await updateDeliverySerials(deliveryId, {
        lines: nextItems.map((item) => ({
          productId: Number(item.productId),
          serialNumbers: item.serialNumbers ?? [],
        })),
      })
      onSaved?.(updated)
      setLocalItems(cloneItems(updated?.items ?? nextItems))
      setLastScanOk(true)
    } catch (caught) {
      setError(caught?.message ?? 'Could not save.')
      setLocalItems(cloneItems(items))
      setLastScanOk(false)
    } finally {
      setSaving(false)
      refocusCapture()
    }
  }

  const pickLine = useCallback((index, message) => {
    setActiveIndex(index)
    setError(null)
    setHint(message)
    setLastScanOk(false)
  }, [])

  const addSerialToLine = async (lineIndex, serial) => {
    const line = localItems[lineIndex]
    if (!line) return false

    const progress = deliveryLineSerialProgress(line)
    if (progress.complete) {
      setError(`${line.productName ?? 'Item'} is already complete.`)
      setHint(`${line.productName ?? 'Item'} is already complete.`)
      return false
    }

    const nextItems = localItems.map((item, index) =>
      index === lineIndex
        ? { ...item, serialNumbers: [...(item.serialNumbers ?? []), serial] }
        : item,
    )

    setLocalItems(nextItems)
    setActiveIndex(lineIndex)
    setError(null)
    setHint(`Serial captured for ${line.productName ?? 'Item'}.`)
    setLastScanned({
      name: line.productName ?? 'Item',
      serial,
      productId: line.productId,
    })

    await persistItems(nextItems)
    return true
  }

  const routeScan = async (rawCode) => {
    if (scanBlocked) {
      if (!connection.isConnected) {
        setError('Offline — scans cannot save.')
        setHint('Offline — scans cannot save.')
      }
      return
    }

    const code = rawCode.trim()
    if (!code) return

    const lineFromDrBarcode = findLineIndexByBarcode(localItems, code)
    if (lineFromDrBarcode >= 0) {
      const line = localItems[lineFromDrBarcode]
      pickLine(lineFromDrBarcode, `Scan the serial number for ${line.productName ?? 'Item'}.`)
      setBarcode('')
      return
    }

    try {
      const item = await fetchSetupItemByBarcode(code)
      const index = findLineIndexByProductId(localItems, item.id)
      if (index < 0) {
        setError(`${item.name ?? 'Item'} is not on this DR.`)
        setHint(`${item.name ?? 'Item'} is not on this DR.`)
        setBarcode('')
        return
      }
      pickLine(index, `Scan the serial number for ${item.name ?? localItems[index]?.productName ?? 'Item'}.`)
      setBarcode('')
      return
    } catch {
      // Treat as serial when not a setup product barcode.
    }

    let lineIndex = activeIndex
    const active = localItems[lineIndex]
    if (!active || deliveryLineSerialProgress(active).complete) {
      lineIndex = firstIncompleteLineIndex(localItems)
    }

    if (lineIndex < 0) {
      setError('Scan the item barcode first, then the serial number.')
      setHint('Scan the item barcode first, then the serial number.')
      setBarcode('')
      return
    }

    setBarcode('')
    await addSerialToLine(lineIndex, code)
  }

  const handleCaptureKeyDown = (event) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    const code = event.currentTarget.value
    event.currentTarget.value = ''
    void routeScan(code)
  }

  const handleProductScan = async (event) => {
    event.preventDefault()
    if (scanBlocked) return
    const code = event.currentTarget.productBarcode.value.trim()
    if (!code) return
    event.currentTarget.productBarcode.value = ''
    await routeScan(code)
  }

  const handleSerialScan = async (event) => {
    event.preventDefault()
    if (scanBlocked) return
    const serial = event.currentTarget.serial.value.trim()
    if (!serial) return
    event.currentTarget.serial.value = ''

    const lineIndex =
      activeLine && !deliveryLineSerialProgress(activeLine).complete
        ? activeIndex
        : firstIncompleteLineIndex(localItems)

    if (lineIndex < 0) {
      setError('Select a line or scan product code first.')
      return
    }

    await addSerialToLine(lineIndex, serial)
  }

  const handleRemoveSerial = async (lineIndex, serialIndex) => {
    if (scanBlocked) return

    const nextItems = localItems.map((item, index) => {
      if (index !== lineIndex) return item
      const serialNumbers = [...(item.serialNumbers ?? [])]
      serialNumbers.splice(serialIndex, 1)
      return { ...item, serialNumbers }
    })

    setLocalItems(nextItems)
    await persistItems(nextItems)
  }

  const offlineHint =
    connection.status === 'disconnected'
      ? 'Offline — reconnect to scan and save serial numbers.'
      : null

  const scanStatus = error ?? offlineHint ?? hint
  const scanTone =
    error || offlineHint
      ? 'error'
      : scanToneFromState({ error, saving, ok: lastScanOk && !error })

  if (appearance === 'magsayo') {
    return (
      <DeliveryReceiptBarcodeScanner
        value={barcode}
        status={scanStatus}
        tone={scanTone}
        busy={saving}
        serialMode={serialMode}
        disabled={scanBlocked}
        onChange={setBarcode}
        onScan={(code) => void routeScan(code)}
      />
    )
  }

  return (
    <div className="relative space-y-3 rounded-xl border border-border bg-surface p-4 md:p-5">
      <input
        ref={scanCaptureRef}
        type="text"
        data-scan-capture=""
        autoComplete="off"
        aria-label="Barcode scanner capture"
        className="absolute left-4 top-4 h-px w-px opacity-0"
        disabled={scanBlocked}
        onKeyDown={handleCaptureKeyDown}
        onBlur={() => window.setTimeout(refocusCapture, 0)}
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Serial capture</h2>
          <p className="mt-0.5 text-xs text-text-secondary">
            Product code selects the line · serial code adds a unit
          </p>
        </div>
        {connection.isConnected && !saving ? (
          <span className="rounded-full bg-maroon-light px-2.5 py-1 text-[11px] font-medium text-maroon">
            Scanner ready
          </span>
        ) : null}
        {saving ? (
          <span className="rounded-full bg-page px-2.5 py-1 text-[11px] font-medium text-text-secondary">
            Saving…
          </span>
        ) : null}
      </div>

      <ConnectionBadge
        status={connection.status}
        detail={connection.detail}
        checkedAtLabel={connection.checkedAtLabel}
        onRetry={() => connection.refresh()}
      />

      {connection.isConnected ? (
        <p className="text-xs text-text-secondary">{hint}</p>
      ) : null}

      <div className="space-y-2">
        {localItems.map((item, index) => {
          const progress = deliveryLineSerialProgress(item)
          const isActive = index === activeIndex

          return (
            <div
              key={`${item.productId}-${item.productName}`}
              role="button"
              tabIndex={scanBlocked ? -1 : 0}
              onClick={() => {
                if (scanBlocked) return
                pickLine(index, `${item.productName ?? 'Item'} selected`)
                refocusCapture()
              }}
              onKeyDown={(event) => {
                if (scanBlocked) return
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  pickLine(index, `${item.productName ?? 'Item'} selected`)
                  refocusCapture()
                }
              }}
              className={`rounded-lg border px-3 py-2.5 transition-colors ${
                scanBlocked
                  ? 'cursor-not-allowed opacity-70'
                  : 'cursor-pointer hover:border-maroon/40 hover:bg-maroon-light/20'
              } ${isActive ? 'border-maroon bg-surface shadow-sm ring-1 ring-maroon/15' : 'border-border bg-page/40'}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-text-primary">{item.productName}</span>
                <span
                  className={`shrink-0 text-xs font-semibold tabular-nums ${
                    progress.complete ? 'text-green-700' : 'text-text-secondary'
                  }`}
                >
                  {progress.captured}/{progress.needed}
                </span>
              </div>
              {(item.serialNumbers ?? []).length ? (
                <div className="mt-2 flex flex-wrap gap-1.5" onClick={(event) => event.stopPropagation()}>
                  {(item.serialNumbers ?? []).map((serial, serialIndex) => (
                    <button
                      key={`${serial}-${serialIndex}`}
                      type="button"
                      className="rounded-md border border-border bg-surface px-2 py-0.5 text-[11px] text-text-secondary hover:border-red-300 hover:text-red-800"
                      onClick={() => handleRemoveSerial(index, serialIndex)}
                      disabled={scanBlocked}
                      title="Remove"
                    >
                      {serial} ×
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}

      <details className="rounded-lg border border-border/80 bg-page/50 px-3 py-2 text-sm">
        <summary className="cursor-pointer text-xs font-medium text-text-secondary">Type instead</summary>
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          <form className="grid gap-3 md:grid-cols-[1fr_auto]" onSubmit={handleProductScan}>
            <FormField label="Product code">
              <Input name="productBarcode" autoComplete="off" placeholder="Barcode" disabled={scanBlocked} />
            </FormField>
            <div className="flex items-end">
              <Button type="submit" variant="secondary" disabled={scanBlocked} size="sm">
                Select
              </Button>
            </div>
          </form>

          <form className="grid gap-3 md:grid-cols-[1fr_auto]" onSubmit={handleSerialScan}>
            <FormField
              label={
                activeLine
                  ? `Serial · ${activeLine.productName} (${activeProgress?.captured ?? 0}/${activeProgress?.needed ?? 0})`
                  : 'Serial'
              }
            >
              <Input name="serial" autoComplete="off" placeholder="Serial sticker" disabled={scanBlocked} />
            </FormField>
            <div className="flex items-end">
              <Button type="submit" disabled={scanBlocked} size="sm">
                Add
              </Button>
            </div>
          </form>
        </div>
      </details>
    </div>
  )
}
