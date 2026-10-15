import { Fragment } from 'react'
import { MobileDetailField, MobileDetailShell, MobileStickyActions } from '@/components/layout/MobileDetailShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { QuotationWorkflow } from '@/components/workflow/quotationWorkflow'
import { useToast } from '@/context/ToastContext'
import { useTransactions } from '@/context/TransactionContext'
import { useSetupResource } from '@/hooks/useSetupResource'
import { formatCurrency } from '@/lib/format'
import { getStatusDisplay } from '@/lib/status'
import { FormField } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useState } from 'react'

export function QuotationDetailPage() {
  const { id } = useParams()
  const { showToast } = useToast()
  const { quotations, loading, convertQuotationToPO, updateQuotation } = useTransactions()
  const suppliers = useSetupResource('suppliers')
  const navigate = useNavigate()
  const [convertOpen, setConvertOpen] = useState(false)
  const [supplierId, setSupplierId] = useState('')
  const [busy, setBusy] = useState(false)

  const quotation = quotations.find((q) => q.id === id)

  if (loading) {
    return <p className="p-4 text-sm text-text-secondary">Loading quotation…</p>
  }

  if (!quotation) return <Navigate to="/quotations" replace />

  const st = getStatusDisplay(quotation.status)

  const handleConvertPO = async () => {
    if (!supplierId) {
      showToast('error', 'Please select a supplier.')
      return
    }

    setBusy(true)
    try {
      const poId = await convertQuotationToPO(quotation.id, supplierId)
      showToast('success', `Created ${poId}`)
      navigate(`/purchase-order/${poId}`)
    } catch (caught) {
      showToast('error', caught?.message ?? 'Could not convert quotation.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Fragment>
      <MobileDetailShell
        title={quotation.id}
        backTo="/quotations"
        actions={
          <MobileStickyActions>
            {quotation.status === 'pending' ? (
              <Button
                className="w-full"
                onClick={async () => {
                  try {
                    await updateQuotation(quotation.id, { status: 'approved' })
                    showToast('success', 'Quotation approved.')
                  } catch (caught) {
                    showToast('error', caught?.message ?? 'Could not approve quotation.')
                  }
                }}
              >
                Approve
              </Button>
            ) : null}
            {quotation.status === 'approved' ? (
              <Button
                className="w-full"
                onClick={() => {
                  setSupplierId(suppliers.rows.find((row) => row.status !== 'Inactive')?.id ?? '')
                  setConvertOpen(true)
                }}
              >
                Create Purchase Order
              </Button>
            ) : null}
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => navigate(`/quotations/${quotation.id}/preview`)}
            >
              Preview / Print
            </Button>
          </MobileStickyActions>
        }
      >
        <div className="mb-4 flex items-center gap-2">
          <Badge variant={st.variant}>{st.label}</Badge>
        </div>
        <div className="mb-4 grid grid-cols-2 gap-3">
          <MobileDetailField label="Customer" value={quotation.customerName} />
          <MobileDetailField label="Date" value={quotation.displayDate ?? quotation.date} />
          <MobileDetailField label="Total" value={formatCurrency(quotation.total)} />
        </div>
        <h2 className="mb-2 text-sm font-semibold text-text-primary">Line Items</h2>
        <div className="space-y-2">
          {quotation.items.map((item) => (
            <div key={`${item.productId}-${item.productName}`} className="rounded-lg border border-border bg-surface p-3 text-sm">
              <p className="font-medium text-text-primary">{item.productName}</p>
              <p className="mt-1 text-text-secondary">
                {item.quantity} × {formatCurrency(item.unitPrice)} ={' '}
                {formatCurrency(item.quantity * item.unitPrice)}
              </p>
            </div>
          ))}
        </div>
        <h2 className="mb-2 mt-6 text-sm font-semibold text-text-primary">Workflow</h2>
        <QuotationWorkflow quotation={quotation} />
      </MobileDetailShell>

      <Modal open={convertOpen} onClose={() => setConvertOpen(false)} title="Convert to PO" size="md">
        <div className="space-y-4">
          <FormField label="Supplier" required>
            <select
              value={supplierId}
              onChange={(event) => setSupplierId(event.target.value)}
              className="h-9 w-full rounded-md border border-border-input bg-surface px-3 text-sm"
            >
              <option value="">Select supplier...</option>
              {suppliers.rows
                .filter((row) => row.status !== 'Inactive')
                .map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
            </select>
          </FormField>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConvertOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConvertPO} disabled={busy}>
              {busy ? 'Creating…' : 'Create PO'}
            </Button>
          </div>
        </div>
      </Modal>

      <div className="hidden md:block">
        <Navigate to="/quotations" replace />
      </div>
    </Fragment>
  )
}
