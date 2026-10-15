import { Fragment, useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'

import { PageHeader } from '@/components/layout/PageHeader'
import { MobileDetailShell, MobileStickyActions } from '@/components/layout/MobileDetailShell'
import { DeliveryReceiptScanPanel } from '@/components/transactions/DeliveryReceiptScanPanel'
import { TransactionLoadError } from '@/components/transactions/TransactionLoadError'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { TransactionBarcode } from '@/components/ui/transaction-barcode'
import { useDemo } from '@/context/DemoContext'
import { useTransactions } from '@/context/TransactionContext'
import {
  apiDeliveryReceiptToView,
  deliveryProgress,
  drStatusBadge,
  drStatusLabel,
  formatDrDisplayDate,
  formatDrMoney,
} from '@/lib/deliveryReceiptList'
import { fetchDeliveryReceipt } from '@/lib/transactionApi'
import {
  canCreateBillingFromDelivery,
  canMarkDeliveryDelivered,
  canMarkDeliveryDeliveredWithSerials,
  canMarkDeliveryOut,
  deliveryLineSerialProgress,
  deliverySerialsComplete,
  findBillingForDelivery,
} from '@/lib/transactionRules'
import { cn } from '@/lib/utils'

function normalizeDrRouteId(value) {
  return decodeURIComponent(String(value ?? '')).trim().toUpperCase()
}

function findDeliveryReceipt(rows, id) {
  const needle = normalizeDrRouteId(id)
  return rows.find(
    (row) =>
      normalizeDrRouteId(row.id) === needle ||
      String(row.dbId ?? '') === String(id ?? '').trim(),
  )
}

function DeliveryReceiptItemsGrid({ items, highlightProductId }) {
  if (!items.length) {
    return (
      <div className="rounded-lg border border-border px-3 py-6 text-center text-sm text-text-secondary">
        No line items on this delivery receipt.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-table-header text-left text-xs uppercase tracking-wide text-text-secondary">
          <tr>
            <th className="px-3 py-2">Item</th>
            <th className="px-3 py-2">Item Code</th>
            <th className="px-3 py-2">Serial Number</th>
            <th className="px-3 py-2">Released Qty</th>
            <th className="px-3 py-2">Scanned Qty</th>
            <th className="px-3 py-2">Remaining Qty</th>
            <th className="px-3 py-2">Unit</th>
            <th className="px-3 py-2 text-right">Unit Price</th>
            <th className="px-3 py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const progress = deliveryLineSerialProgress(item)
            const qty = progress.needed
            const scanned = progress.captured
            const remaining = Math.max(0, qty - scanned)
            const unit = (item.unit ?? 'UNITS').toString().toUpperCase()
            const unitPrice = Number(item.unitPrice ?? 0)
            const amount =
              item.amount != null ? Number(item.amount) : qty * unitPrice
            const serials = (item.serialNumbers ?? []).filter(Boolean)
            const highlighted =
              highlightProductId != null &&
              String(highlightProductId) === String(item.productId)

            return (
              <tr
                key={`${item.productId}-${item.productName}`}
                className={cn(
                  'border-t border-border',
                  highlighted && 'bg-maroon-light/50',
                )}
              >
                <td className="px-3 py-2">{item.productName ?? '—'}</td>
                <td className="px-3 py-2">{item.barcode || item.productId || '—'}</td>
                <td className="px-3 py-2">{serials.length ? serials.join(', ') : '—'}</td>
                <td className="px-3 py-2">{qty}</td>
                <td className="px-3 py-2">{scanned}</td>
                <td className="px-3 py-2">{remaining}</td>
                <td className="px-3 py-2">{unit}</td>
                <td className="px-3 py-2 text-right">{formatDrMoney(unitPrice)}</td>
                <td className="px-3 py-2 text-right">{formatDrMoney(amount)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function DeliveryReceiptViewBody({
  dr,
  items,
  linkedOutslip,
  error,
  refreshAll,
  busy,
  lastScanned,
  onLastScannedChange,
  onSerialsSaved,
  canScanSerials,
  actionButtons,
  navigate,
}) {
  const view = apiDeliveryReceiptToView(dr)
  const progress = deliveryProgress(items)
  const displayStatus = view.status

  return (
    <div className="space-y-4">
      {error ? <TransactionLoadError message={error} onRetry={refreshAll} /> : null}

      {canScanSerials ? (
        <DeliveryReceiptScanPanel
          deliveryId={dr.id}
          items={items}
          onSaved={onSerialsSaved}
          disabled={busy}
          appearance="magsayo"
          onLastScannedChange={onLastScannedChange}
        />
      ) : (
        <p className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
          {dr.status === 'delivered'
            ? 'This delivery receipt is already completed.'
            : 'Serial capture is not available for this status.'}
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Last Scanned Item
          </p>
          {lastScanned ? (
            <div className="mt-2 space-y-1 text-sm">
              <p>
                <span className="text-text-secondary">Last Scanned:</span>{' '}
                <span className="font-medium text-text-primary">{lastScanned.name}</span>
              </p>
              <p>
                <span className="text-text-secondary">Serial Number:</span>{' '}
                <span className="font-medium text-text-primary">{lastScanned.serial}</span>
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-text-secondary">No item scanned yet.</p>
          )}
        </div>
        <div className="rounded-lg border border-border bg-surface px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Delivery Progress
          </p>
          <p className="mt-2 text-sm font-medium text-text-primary">
            {progress.scanned} / {progress.released} Delivered
          </p>
          <p className="text-sm text-text-secondary">{progress.percent}%</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-maroon transition-all"
              style={{ width: `${Math.min(100, progress.percent)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <p>
          <span className="text-text-secondary">Delivery Date:</span>{' '}
          {formatDrDisplayDate(dr.date) || dr.displayDate || '—'}
        </p>
        <p>
          <span className="text-text-secondary">Reference Outslip:</span>{' '}
          {dr.referenceOutslipId ? (
            <button
              type="button"
              className="font-medium text-maroon hover:underline"
              onClick={() => {
                if (linkedOutslip) navigate(`/outslip/${linkedOutslip.id}`)
              }}
            >
              {dr.referenceOutslipId}
            </button>
          ) : (
            '—'
          )}
        </p>
        <p>
          <span className="text-text-secondary">Customer:</span>{' '}
          {dr.customerName || dr.customerId || '—'}
        </p>
        <p>
          <span className="text-text-secondary">Status:</span>{' '}
          <Badge variant={drStatusBadge[displayStatus] ?? 'default'}>
            {drStatusLabel[displayStatus] ?? displayStatus}
          </Badge>
        </p>
      </div>

      <DeliveryReceiptItemsGrid
        items={items}
        highlightProductId={lastScanned?.productId}
      />

      <p className="text-right text-sm font-semibold">
        Total Amount: {formatDrMoney(dr.total ?? 0)}
      </p>

      <div className="flex flex-wrap gap-3 border-t border-border pt-4">{actionButtons}</div>
    </div>
  )
}

export function DeliveryReceiptDetailPage() {
  const { id } = useParams()
  const { showToast } = useDemo()
  const navigate = useNavigate()
  const {
    deliveryReceipts,
    billingStatements,
    outslips,
    loading,
    error,
    refreshAll,
    markDeliveryOutForDelivery,
    markDeliveryDelivered,
    createBillingFromDelivery,
  } = useTransactions()

  const [dr, setDr] = useState(null)
  const [detailLoading, setDetailLoading] = useState(true)
  const [detailError, setDetailError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [outForDeliveryId, setOutForDeliveryId] = useState(null)
  const [deliverId, setDeliverId] = useState(null)
  const [billingId, setBillingId] = useState(null)
  const [lastScanned, setLastScanned] = useState(null)

  useEffect(() => {
    let cancelled = false

    const cached = findDeliveryReceipt(deliveryReceipts, id)
    if (cached) {
      setDr(cached)
      setDetailError(null)
      setDetailLoading(false)
      return undefined
    }

    if (loading) {
      setDetailLoading(true)
      return undefined
    }

    setDetailLoading(true)
    setDr(null)
    setDetailError(null)

    fetchDeliveryReceipt(id)
      .then((row) => {
        if (!cancelled) {
          setDr(row)
          setDetailError(null)
        }
      })
      .catch((caught) => {
        if (!cancelled) {
          setDetailError(caught?.message ?? 'Delivery receipt not found.')
          setDr(null)
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id, deliveryReceipts, loading])

  const items = useMemo(
    () => (dr?.items ?? []).map((item) => ({ ...item })),
    [dr],
  )

  const linkedOutslip = useMemo(() => {
    if (!dr) return null
    return outslips.find(
      (row) =>
        row.id === dr.referenceOutslipId ||
        row.dbId === String(dr.referenceOutslipDbId),
    )
  }, [dr, outslips])

  const linkedBilling = dr ? findBillingForDelivery(dr, billingStatements) : null
  const showOutForDelivery = dr ? canMarkDeliveryOut(dr) : false
  const showMarkDelivered = dr ? canMarkDeliveryDeliveredWithSerials(dr) : false
  const serialsPending = dr ? canMarkDeliveryDelivered(dr) && !deliverySerialsComplete(dr) : false
  const showCreateBilling = dr ? canCreateBillingFromDelivery(dr, billingStatements) : false
  const canScanSerials = dr?.status === 'active'

  if (!loading && !detailLoading && !dr && detailError) {
    return (
      <div>
        <PageHeader
          title="Delivery Receipt"
          breadcrumbs={['Transaction', 'Delivery Receipt', id ?? '—']}
        />
        <TransactionLoadError message={detailError} onRetry={refreshAll} />
        <Button variant="secondary" onClick={() => navigate('/delivery-receipt')}>
          Back to list
        </Button>
      </div>
    )
  }

  if (!loading && !detailLoading && !dr && !detailError) {
    return <Navigate to="/delivery-receipt" replace />
  }

  if ((loading || detailLoading) && !dr) {
    return <p className="text-sm text-text-secondary">Loading delivery receipt…</p>
  }

  if (!dr) {
    return <p className="text-sm text-text-secondary">Loading delivery receipt…</p>
  }

  const view = apiDeliveryReceiptToView(dr)
  const headerStatus = view.status

  const handleOutForDelivery = async () => {
    setBusy(true)
    try {
      await markDeliveryOutForDelivery(dr.id)
      showToast('success', 'Delivery marked as out for delivery.')
      setOutForDeliveryId(null)
    } catch (caught) {
      showToast('error', caught?.message ?? 'Could not update delivery.')
    } finally {
      setBusy(false)
    }
  }

  const handleDelivered = async () => {
    setBusy(true)
    try {
      await markDeliveryDelivered(dr.id)
      showToast('success', 'Delivery marked as completed.')
      setDeliverId(null)
    } catch (caught) {
      showToast('error', caught?.message ?? 'Could not mark delivered.')
    } finally {
      setBusy(false)
    }
  }

  const handleCreateBilling = async () => {
    setBusy(true)
    try {
      const bill = await createBillingFromDelivery(dr.id)
      showToast('success', `Billing ${bill?.id ?? ''} created.`)
      setBillingId(null)
      navigate('/billing')
    } catch (caught) {
      showToast('error', caught?.message ?? 'Could not create billing.')
    } finally {
      setBusy(false)
    }
  }

  const handleSerialsSaved = (updated) => {
    setDr(updated)
  }

  const actionButtons = (
    <>
      {serialsPending ? (
        <p className="w-full text-sm text-amber-800">
          Complete serial capture on all lines before delivery.
        </p>
      ) : null}
      <Button type="button" variant="secondary" onClick={() => navigate('/delivery-receipt')}>
        Back to list
      </Button>
      <Button
        type="button"
        variant="secondary"
        onClick={() => navigate(`/delivery-receipt/${dr.id}/preview`)}
      >
        Print delivery receipt
      </Button>
      {showOutForDelivery ? (
        <Button disabled={busy} onClick={() => setOutForDeliveryId(dr.id)}>
          Mark out for delivery
        </Button>
      ) : null}
      {showMarkDelivered ? (
        <Button disabled={busy} onClick={() => setDeliverId(dr.id)}>
          Mark as delivered
        </Button>
      ) : null}
      {showCreateBilling ? (
        <Button disabled={busy} onClick={() => setBillingId(dr.id)}>
          Create billing
        </Button>
      ) : null}
      {linkedBilling ? (
        <Button variant="secondary" onClick={() => navigate('/billing')}>
          View billing {linkedBilling.id}
        </Button>
      ) : null}
    </>
  )

  const cardHeader = (
    <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-border">
      <div>
        <CardTitle className="text-lg">View {dr.id}</CardTitle>
        <TransactionBarcode value={dr.id} />
      </div>
      <Badge variant={drStatusBadge[headerStatus] ?? 'default'}>
        {drStatusLabel[headerStatus] ?? headerStatus}
      </Badge>
    </CardHeader>
  )

  const bodyProps = {
    dr,
    items,
    linkedOutslip,
    error,
    refreshAll,
    busy,
    lastScanned,
    onLastScannedChange: setLastScanned,
    onSerialsSaved: handleSerialsSaved,
    canScanSerials,
    actionButtons,
    navigate,
  }

  return (
    <Fragment>
      <div className="hidden md:block">
        <PageHeader
          title="Delivery Receipt"
          description={`Details for ${dr.id}`}
          breadcrumbs={['Transaction', 'Delivery Receipt', dr.id]}
        />
        <Card>
          {cardHeader}
          <CardContent className="pt-6">
            <DeliveryReceiptViewBody {...bodyProps} />
          </CardContent>
        </Card>
      </div>

      <MobileDetailShell
        title={dr.id}
        backTo="/delivery-receipt"
        actions={<MobileStickyActions>{actionButtons}</MobileStickyActions>}
      >
        <Card className="border-0 shadow-none">
          {cardHeader}
          <CardContent className="pt-6">
            <DeliveryReceiptViewBody {...bodyProps} />
          </CardContent>
        </Card>
      </MobileDetailShell>

      <ConfirmDialog
        open={outForDeliveryId != null}
        onClose={() => setOutForDeliveryId(null)}
        title="Mark out for delivery?"
        message="This delivery will be marked as on the way to the customer."
        confirmLabel="Confirm"
        onConfirm={handleOutForDelivery}
      />

      <ConfirmDialog
        open={deliverId != null}
        onClose={() => setDeliverId(null)}
        title="Mark as delivered?"
        message="Confirm that all items were delivered to the customer."
        confirmLabel="Mark delivered"
        onConfirm={handleDelivered}
      />

      <ConfirmDialog
        open={billingId != null}
        onClose={() => setBillingId(null)}
        title="Create billing?"
        message={`Create a billing statement from ${dr.id}?`}
        confirmLabel="Create billing"
        onConfirm={handleCreateBilling}
      />
    </Fragment>
  )
}
