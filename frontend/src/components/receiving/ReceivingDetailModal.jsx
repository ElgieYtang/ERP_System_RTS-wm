import { Button } from '@/components/ui/button'
import { TransactionBarcode } from '@/components/ui/transaction-barcode'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { X } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'

function MetaField({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium text-text-secondary">{label}</p>
      <p className="mt-1 text-sm font-semibold text-text-primary">{value}</p>
    </div>
  )
}

export function ReceivingDetailModal({
  receiving,
  busy,
  onClose,
  onConfirm,
  onCreateOutslip,
}) {
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

  if (!receiving) return null

  const isPending = receiving.status !== 'completed'
  const isCompleted = receiving.status === 'completed'

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
              Receiving Details
            </h2>
            <TransactionBarcode value={receiving.id} />
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close receiving details"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-maroon-light hover:text-maroon"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <section className="mb-6 grid grid-cols-1 gap-x-10 gap-y-3 sm:grid-cols-2">
            <MetaField label="Receiving No" value={receiving.id} />
            <MetaField label="PO" value={receiving.purchaseOrderId || '—'} />
            <MetaField label="Supplier" value={receiving.supplierName || '—'} />
            <MetaField label="Date" value={receiving.displayDate ?? receiving.date ?? '—'} />
          </section>

          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Item</TableHead>
                <TableHead className="text-center">Ordered</TableHead>
                <TableHead className="text-center">Received</TableHead>
                <TableHead className="text-center">Remaining</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(receiving.items ?? []).map((item) => (
                <TableRow key={`${item.productId}-${item.productName}`}>
                  <TableCell className="font-medium">{item.productName}</TableCell>
                  <TableCell className="text-center">{item.ordered}</TableCell>
                  <TableCell className="text-center">{item.received}</TableCell>
                  <TableCell className="text-center">{item.remaining}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-3 border-t border-border px-5 py-4 sm:px-6">
          {isPending ? (
            <Button type="button" disabled={busy} onClick={onConfirm}>
              {busy ? 'Confirming…' : 'Confirm Receiving'}
            </Button>
          ) : null}
          {isCompleted ? (
            <Button type="button" onClick={onCreateOutslip}>
              Create Outslip
            </Button>
          ) : null}
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
