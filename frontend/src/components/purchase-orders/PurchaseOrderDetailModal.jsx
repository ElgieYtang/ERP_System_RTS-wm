import { Button } from '@/components/ui/button'
import { TransactionBarcode } from '@/components/ui/transaction-barcode'
import { PoStatusChips } from '@/components/purchase-orders/PoStatusChips'
import { formatCurrency, formatDisplayDate } from '@/lib/quotations'
import { X } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'

const statusLabel = { approved: 'Approved', completed: 'Completed' }

function MetaField({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium text-text-secondary">{label}:</p>
      <p className="mt-1 text-sm font-semibold text-text-primary">{value}</p>
    </div>
  )
}

export function PurchaseOrderDetailModal({ order, onClose, onOpenReceiving, onDelete, deleteBusy }) {
  const titleId = useId()
  const closeButtonRef = useRef(null)
  const panelRef = useRef(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    function handleKeyDown(event) {
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
  }, [onClose])

  const showReceive = order.status === 'approved' || order.status === 'completed'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-text-primary sm:text-xl">
              Purchase Order Details
            </h2>
            <TransactionBarcode value={order.poNo} />
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close purchase order details"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-maroon-light hover:text-maroon"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <section className="mb-6 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            <MetaField label="PO No" value={order.poNo} />
            <MetaField label="Reference" value={order.reference || '—'} />
            <MetaField label="Supplier" value={order.supplier || '—'} />
            <MetaField label="Date" value={formatDisplayDate(order.date) || '—'} />
            <MetaField label="Total" value={formatCurrency(order.amount)} />
            <div className="sm:col-span-2">
              <p className="text-xs font-medium text-text-secondary">Status</p>
              <div className="mt-2">
                <PoStatusChips status={order.status} />
              </div>
            </div>
          </section>

          <section className="mb-6">
            {order.items.length === 0 ? (
              <p className="text-sm text-text-secondary">No items on this purchase order.</p>
            ) : (
              <ul className="list-disc space-y-2 pl-5 text-sm text-text-primary">
                {order.items.map((item) => (
                  <li key={item.id}>
                    {item.itemName} × {item.quantity} — {formatCurrency(item.unitPrice)} each
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="flex flex-wrap gap-3">
            {showReceive ? (
              <Button type="button" onClick={() => onOpenReceiving(order)}>
                Receive Items
              </Button>
            ) : null}
            {onDelete ? (
              <Button
                type="button"
                variant="secondary"
                disabled={deleteBusy}
                onClick={() => onDelete(order)}
              >
                {deleteBusy ? 'Deleting…' : 'Delete PO'}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
