import { MobileDetailField, MobileDetailShell, MobileStickyActions } from '@/components/layout/MobileDetailShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useAuth } from '@/context/AuthContext'
import { useDemo } from '@/context/DemoContext'
import { useTransactions } from '@/context/TransactionContext'
import { formatCurrency } from '@/lib/format'
import { canPrintGatePass } from '@/lib/gatePass'
import { getStatusDisplay } from '@/lib/status'
import {
  canApproveOutslipForUser,
  canCreateDrFromOutslip,
  canDispatchOutslipForUser,
  findDrForOutslip,
} from '@/lib/transactionRules'
import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'

export function OutslipDetailPage() {
  const { id } = useParams()
  const { showToast } = useDemo()
  const { user } = useAuth()
  const {
    outslips,
    deliveryReceipts,
    loading,
    approveOutslip,
    forDispatchOutslip,
    createDeliveryFromOutslip,
  } = useTransactions()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [dispatchOpen, setDispatchOpen] = useState(false)
  const [createDrOpen, setCreateDrOpen] = useState(false)

  const outslip = outslips.find((o) => o.id === id)
  if (!loading && !outslip) return <Navigate to="/outslip" replace />
  if (!outslip) return <p className="p-4 text-sm text-text-secondary">Loading…</p>

  const st = getStatusDisplay(outslip.status === 'released' ? 'for_dispatch' : outslip.status)
  const linkedDr = findDrForOutslip(outslip, deliveryReceipts)

  const handleApprove = async () => {
    setBusy(true)
    try {
      await approveOutslip(outslip.id)
      showToast('success', 'Outslip approved.')
    } catch (caught) {
      showToast('error', caught?.message ?? 'Could not approve.')
    } finally {
      setBusy(false)
    }
  }

  const handleDispatch = async () => {
    setBusy(true)
    try {
      await forDispatchOutslip(outslip.id)
      showToast('success', 'Outslip marked for dispatch.')
      setDispatchOpen(false)
    } catch (caught) {
      showToast('error', caught?.message ?? 'Could not dispatch.')
    } finally {
      setBusy(false)
    }
  }

  const handleCreateDR = async () => {
    setBusy(true)
    try {
      const drId = await createDeliveryFromOutslip(outslip.id)
      showToast('success', 'Delivery Receipt created.')
      setCreateDrOpen(false)
      if (drId) navigate(`/delivery-receipt/${drId}`)
    } catch (caught) {
      showToast('error', caught?.message ?? 'Could not create DR.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <MobileDetailShell
        title={outslip.id}
        backTo="/outslip"
        actions={
          <MobileStickyActions>
            {canApproveOutslipForUser(outslip, user) ? (
              <Button className="w-full" disabled={busy} onClick={handleApprove}>
                Approve
              </Button>
            ) : null}
            {canDispatchOutslipForUser(outslip, user) ? (
              <Button className="w-full" disabled={busy} onClick={() => setDispatchOpen(true)}>
                Mark For Dispatch
              </Button>
            ) : null}
            {canCreateDrFromOutslip(outslip, deliveryReceipts) ? (
              <Button className="w-full" disabled={busy} onClick={() => setCreateDrOpen(true)}>
                Create Delivery Receipt
              </Button>
            ) : null}
            {linkedDr ? (
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => navigate(`/delivery-receipt/${linkedDr.id}`)}
              >
                View Delivery Receipt
              </Button>
            ) : null}
            {canPrintGatePass(outslip.status) ? (
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => navigate(`/outslip/${outslip.id}/gate-pass/preview`)}
              >
                Print Gate Pass
              </Button>
            ) : null}
          </MobileStickyActions>
        }
      >
        <div className="mb-4">
          <Badge variant={st.variant}>{st.label}</Badge>
        </div>
        <div className="mb-4 grid grid-cols-2 gap-3">
          <MobileDetailField label="Customer" value={outslip.customerName || outslip.customerId} />
          <MobileDetailField
            label="Reference"
            value={outslip.receivingId ? `RCV #${outslip.receivingId}` : '—'}
          />
          <MobileDetailField label="Date" value={outslip.displayDate || outslip.date} />
          <MobileDetailField
            label="Items"
            value={`${(outslip.items ?? []).reduce((s, i) => s + i.quantity, 0)} units`}
          />
        </div>
        <h2 className="mb-2 text-sm font-semibold text-text-primary">Line Items</h2>
        <div className="space-y-2">
          {(outslip.items ?? []).map((item) => (
            <div key={item.productId} className="rounded-lg border border-border bg-surface p-3 text-sm">
              <p className="font-medium">{item.productName}</p>
              <p className="mt-1 text-text-secondary">
                {item.quantity} × {formatCurrency(item.unitPrice)}
              </p>
            </div>
          ))}
        </div>
      </MobileDetailShell>

      <ConfirmDialog
        open={dispatchOpen}
        onClose={() => setDispatchOpen(false)}
        title="For Dispatch"
        message="Mark this outslip ready for dispatch? Inventory will be updated."
        confirmLabel="Confirm"
        onConfirm={handleDispatch}
      />

      <ConfirmDialog
        open={createDrOpen}
        onClose={() => setCreateDrOpen(false)}
        title="Create delivery receipt?"
        message="Create a delivery receipt from this outslip?"
        confirmLabel="Create DR"
        onConfirm={handleCreateDR}
      />
    </>
  )
}
