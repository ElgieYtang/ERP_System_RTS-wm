import { Button } from '@/components/ui/button'
import { TransactionBarcode } from '@/components/ui/transaction-barcode'
import { formatDrMoney } from '@/lib/deliveryReceiptList'
import { X } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'

export function DeliveryReceiptDetailModal({
  receipt,
  rawReceipt,
  escapeDisabled = false,
  serialsPending = false,
  onClose,
  onMarkOutForDelivery,
  onRequestMarkDelivered,
  onCreateBilling,
  onOpenFullView,
}) {
  const titleId = useId()
  const closeButtonRef = useRef(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    function handleKeyDown(event) {
      if (escapeDisabled) return
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [escapeDisabled, onClose])

  const rawStatus = rawReceipt?.status ?? receipt.rawStatus

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-transparent p-3 sm:p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-lg rounded-xl border border-border bg-surface shadow-lg"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-text-primary">
              Delivery Receipt Details
            </h2>
            <TransactionBarcode value={receipt.id} />
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close delivery receipt details"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-text-secondary hover:bg-maroon-light hover:text-maroon"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2 px-5 py-4 text-sm">
          <p className="text-lg font-semibold text-text-primary">{receipt.id}</p>
          <p>
            <span className="text-text-secondary">Customer: </span>
            <span className="text-text-primary">{receipt.customer || '—'}</span>
          </p>
          <p>
            <span className="text-text-secondary">Reference Outslip: </span>
            <span className="text-text-primary">{receipt.outslipId || '—'}</span>
          </p>
          <p>
            <span className="text-text-secondary">Total: </span>
            <span className="font-medium text-text-primary">
              {formatDrMoney(receipt.totalAmount)}
            </span>
          </p>
        </div>

        <div className="flex flex-col gap-3 px-5 pb-5">
          {serialsPending ? (
            <p className="text-sm text-amber-800">
              Complete serial capture on all lines before marking delivered.
            </p>
          ) : null}
          {rawStatus === 'active' ? (
            <Button type="button" onClick={onMarkOutForDelivery}>
              Mark Out for Delivery
            </Button>
          ) : null}
          {rawStatus === 'out_for_delivery' ? (
            <Button type="button" disabled={serialsPending} onClick={onRequestMarkDelivered}>
              Mark as Delivered
            </Button>
          ) : null}
          {rawStatus === 'delivered' ? (
            <Button type="button" onClick={onCreateBilling}>
              Create Billing
            </Button>
          ) : null}
          <Button type="button" variant="secondary" onClick={onOpenFullView}>
            Open scan view
          </Button>
        </div>
      </div>
    </div>
  )
}
