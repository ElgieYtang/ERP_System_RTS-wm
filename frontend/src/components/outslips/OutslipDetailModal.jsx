import { Badge } from '@/components/ui/badge'
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
import { formatCurrency } from '@/lib/format'
import { getStatusDisplay } from '@/lib/status'
import { X } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'

export function OutslipDetailModal({
  outslip,
  busy,
  user,
  deliveryReceipts,
  canApprove,
  canDispatch,
  canCreateDr,
  drForOutslip,
  canGatePass,
  onClose,
  onApprove,
  onDispatch,
  onCreateDr,
  onViewDr,
  onGatePass,
  onSubmit,
  canSubmit,
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

  if (!outslip) return null

  const status = getStatusDisplay(
    outslip.status === 'released' ? 'for_dispatch' : outslip.status,
  )

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
              Outslip Details
            </h2>
            <TransactionBarcode value={outslip.id} />
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={status.variant}>{status.label}</Badge>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Close outslip details"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-maroon-light hover:text-maroon"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="mb-4 grid grid-cols-2 gap-4 rounded-lg border border-border bg-page/60 p-4 text-sm">
            <div>
              <p className="text-xs font-medium uppercase text-text-secondary">Customer</p>
              <p className="mt-1 font-medium">{outslip.customerName || outslip.customerId}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-text-secondary">Receiving</p>
              <p className="mt-1">{outslip.receivingId ? `RCV #${outslip.receivingId}` : '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-text-secondary">Date</p>
              <p className="mt-1">{outslip.displayDate ?? outslip.date ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-text-secondary">Units</p>
              <p className="mt-1">
                {(outslip.items ?? []).reduce((sum, item) => sum + Number(item.quantity ?? 0), 0)}
              </p>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Item</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(outslip.items ?? []).map((item) => (
                <TableRow key={item.productId}>
                  <TableCell>{item.productName}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>
                    {item.unitPrice != null ? formatCurrency(item.unitPrice) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex shrink-0 flex-wrap gap-3 border-t border-border px-5 py-4 sm:px-6">
          {canSubmit ? (
            <Button disabled={busy} onClick={onSubmit}>
              Submit for approval
            </Button>
          ) : null}
          {canApprove ? (
            <Button disabled={busy} onClick={onApprove}>
              Approve
            </Button>
          ) : null}
          {canDispatch ? (
            <Button disabled={busy} onClick={onDispatch}>
              For Dispatch
            </Button>
          ) : null}
          {canCreateDr ? (
            <Button disabled={busy} onClick={onCreateDr}>
              Create Delivery Receipt
            </Button>
          ) : null}
          {drForOutslip ? (
            <Button variant="secondary" onClick={onViewDr}>
              View Delivery Receipt
            </Button>
          ) : null}
          {canGatePass ? (
            <Button variant="secondary" onClick={onGatePass}>
              Print Gate Pass
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
