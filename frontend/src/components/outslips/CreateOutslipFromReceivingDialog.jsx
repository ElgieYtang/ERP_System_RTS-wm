import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/format'
import { X } from 'lucide-react'
import { useEffect, useId } from 'react'

export function CreateOutslipFromReceivingDialog({
  open,
  busy,
  receivings,
  customers,
  selectedReceivingId,
  linkedReceiving,
  linkedCustomerName,
  onReceivingChange,
  onConfirm,
  onSaveDraft,
  onClose,
}) {
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-3 sm:p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 id={titleId} className="text-lg font-semibold text-text-primary">
            Create outslip from receiving
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-text-secondary hover:bg-maroon-light hover:text-maroon"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <FormField label="Completed receiving">
            <select
              value={selectedReceivingId}
              onChange={(e) => onReceivingChange(e.target.value)}
              className="flex h-9 w-full rounded-md border border-border-input bg-surface px-3 text-sm"
            >
              <option value="">Select receiving…</option>
              {receivings.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id} — {r.customerName ?? r.supplierName ?? 'Receiving'}
                </option>
              ))}
            </select>
          </FormField>

          {linkedReceiving ? (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs font-medium uppercase text-text-secondary">Customer</p>
                  <p className="mt-1 font-medium">{linkedCustomerName}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-text-secondary">Supplier</p>
                  <p className="mt-1">{linkedReceiving.supplierName || '—'}</p>
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
                  {(linkedReceiving.items ?? []).map((item) => (
                    <TableRow key={`${item.productId}-${item.productName}`}>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell>{item.quantity ?? item.received ?? '—'}</TableCell>
                      <TableCell>
                        {item.unitPrice != null ? formatCurrency(item.unitPrice) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="mt-4 rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-text-secondary">
              Select a completed receiving without an existing outslip.
            </p>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-border px-5 py-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          {onSaveDraft ? (
            <Button
              type="button"
              variant="secondary"
              disabled={busy || !linkedReceiving?.customerId}
              onClick={onSaveDraft}
            >
              {busy ? 'Saving…' : 'Save as draft'}
            </Button>
          ) : null}
          <Button
            type="button"
            disabled={busy || !linkedReceiving?.customerId}
            onClick={onConfirm}
          >
            {busy ? 'Creating…' : 'Submit for approval'}
          </Button>
        </div>
      </div>
    </div>
  )
}
