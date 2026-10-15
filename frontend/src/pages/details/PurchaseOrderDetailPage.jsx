import { Fragment } from 'react'
import { MobileDetailField, MobileDetailShell, MobileStickyActions } from '@/components/layout/MobileDetailShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TransactionWorkflow } from '@/components/workflow/TransactionWorkflow'
import { useToast } from '@/context/ToastContext'
import { useTransactions } from '@/context/TransactionContext'
import { formatCurrency } from '@/lib/format'
import { findReceivingForPo } from '@/lib/receiving'
import { getStatusDisplay } from '@/lib/status'
import { Navigate, useNavigate, useParams } from 'react-router-dom'

export function PurchaseOrderDetailPage() {
  const { id } = useParams()
  const { showToast } = useToast()
  const { purchaseOrders, receivings, loading, createReceiving } = useTransactions()
  const navigate = useNavigate()
  const po = purchaseOrders.find((p) => p.id === id)

  if (loading) {
    return <p className="p-4 text-sm text-text-secondary">Loading purchase order…</p>
  }

  if (!po) return <Navigate to="/purchase-order" replace />

  const st = getStatusDisplay(po.status)

  const receiveItems = async () => {
    if (po.status === 'fully_received') {
      showToast('info', 'All items have been received.')
      return
    }

    const existing = findReceivingForPo(receivings, po)
    if (existing) {
      navigate(
        `/inventory/receiving?po=${po.id}&receiving=${encodeURIComponent(existing.id)}`,
      )
      return
    }

    try {
      await createReceiving(po.id)
      showToast('success', 'Receiving created.')
      navigate(`/inventory/receiving?po=${po.id}`)
    } catch (caught) {
      showToast('error', caught?.message ?? 'Could not create receiving.')
    }
  }

  return (
    <Fragment>
      <MobileDetailShell
        title={po.id}
        backTo="/purchase-order"
        actions={
          <MobileStickyActions>
            <Button className="w-full" onClick={receiveItems}>
              Receive Items
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => navigate(`/purchase-order/${po.id}/preview`)}
            >
              Preview / Print
            </Button>
          </MobileStickyActions>
        }
      >
        <div className="mb-4">
          <Badge variant={st.variant}>{st.label}</Badge>
        </div>
        <div className="mb-4 grid grid-cols-2 gap-3">
          <MobileDetailField label="Supplier" value={po.supplierName} />
          <MobileDetailField
            label="Reference QTN"
            value={po.referenceQuotationNo ?? po.referenceQuotationId ?? '—'}
          />
          <MobileDetailField label="Date" value={po.displayDate ?? po.date} />
          <MobileDetailField label="Total" value={formatCurrency(po.total)} />
        </div>
        <h2 className="mb-2 text-sm font-semibold text-text-primary">Line Items</h2>
        <div className="space-y-2">
          {po.items.map((item) => (
            <div key={`${item.productId}-${item.productName}`} className="rounded-lg border border-border bg-surface p-3 text-sm">
              <p className="font-medium">{item.productName}</p>
              <p className="mt-1 text-text-secondary">
                {item.quantity} × {formatCurrency(item.unitPrice)}
              </p>
            </div>
          ))}
        </div>
        <h2 className="mb-2 mt-6 text-sm font-semibold text-text-primary">Workflow</h2>
        <TransactionWorkflow quotationId={po.referenceQuotationNo ?? po.referenceQuotationId} />
      </MobileDetailShell>
      <div className="hidden md:block">
        <Navigate to="/purchase-order" replace />
      </div>
    </Fragment>
  )
}
