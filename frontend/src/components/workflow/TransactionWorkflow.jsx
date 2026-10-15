import { SHOW_TRANSACTION_WORKFLOW } from '@/config/featureFlags'
import { useTransactions } from '@/context/TransactionContext'
import { getStatusDisplay } from '@/lib/status'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

export function TransactionWorkflow({ quotationId }) {
  const { quotations, purchaseOrders, receivings, deliveryReceipts, billingStatements } =
    useTransactions()

  if (!SHOW_TRANSACTION_WORKFLOW) return null

  const qtn =
    (quotationId
      ? quotations.find((q) => q.id === quotationId)
      : quotations[0]) ?? null
  if (!qtn) return null

  const po = purchaseOrders.find(
    (p) =>
      p.referenceQuotationId === qtn.id ||
      p.referenceQuotationNo === qtn.id ||
      p.quotationId === qtn.id,
  )
  const rec = po
    ? receivings.find(
        (r) => r.purchaseOrderId === po.id || r.purchaseOrderNo === po.id,
      )
    : undefined
  const dr = deliveryReceipts.find(
    (d) =>
      d.customerId === qtn.customerId ||
      d.outslipId === qtn.id ||
      d.quotationId === qtn.id,
  )
  const bill = dr
    ? billingStatements.find((b) => b.referenceDrId === dr.id || b.deliveryReceiptId === dr.id)
    : undefined

  const steps = [
    {
      label: 'Quotation',
      id: qtn.id,
      statusLabel: getStatusDisplay(qtn.status).label,
      done: qtn.status === 'approved',
      current: qtn.status === 'approved' && !po,
    },
    {
      label: 'Purchase Order',
      id: po?.id,
      statusLabel: po ? getStatusDisplay(po.status).label : 'Pending',
      done: Boolean(po),
      current: Boolean(po) && !rec,
    },
    {
      label: 'Receiving',
      id: rec?.id,
      statusLabel: rec ? getStatusDisplay(rec.status).label : 'Pending',
      done: rec?.status === 'completed',
      current: Boolean(rec) && rec.status !== 'completed',
    },
    {
      label: 'Delivery Receipt',
      id: dr?.id,
      statusLabel: dr ? getStatusDisplay(dr.status).label : 'Pending',
      done: dr?.status === 'delivered',
      current: Boolean(dr) && dr.status !== 'delivered',
    },
    {
      label: 'Billing',
      id: bill?.id,
      statusLabel: bill ? getStatusDisplay(bill.paymentStatus).label : 'Pending',
      done: bill?.paymentStatus === 'paid',
      current: Boolean(bill) && bill.paymentStatus !== 'paid',
    },
  ]

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h3 className="mb-4 text-sm font-semibold text-text-primary">TRANSACTION WORKFLOW</h3>
      <p className="mb-4 text-xs text-text-secondary">
        Quotation (customer) → PO (supplier) → Receiving → Delivery → Billing
      </p>
      <div className="space-y-4">
        {steps.map((step, i) => (
          <div key={step.label} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full',
                  step.done && 'bg-[#DCFCE7] text-[#15803D]',
                  step.current && !step.done && 'bg-maroon text-white',
                  !step.done && !step.current && 'border-2 border-border bg-surface',
                )}
              >
                {step.done ? (
                  <Check className="h-3.5 w-3.5" />
                ) : step.current ? (
                  <span className="h-2 w-2 rounded-full bg-white" />
                ) : null}
              </div>
              {i < steps.length - 1 ? (
                <div
                  className={cn('my-1 h-6 w-0.5', step.done ? 'bg-[#15803D]' : 'bg-border')}
                />
              ) : null}
            </div>
            <div className="pb-2">
              <p className={cn('text-sm font-medium', step.current && 'text-maroon')}>
                {step.label}
              </p>
              {step.id ? (
                <p className="text-xs text-text-secondary">
                  {step.id}
                  {step.statusLabel ? ` — ${step.statusLabel}` : ''}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
