import { formatCurrency } from '@/lib/format'
import { deliveryLineSerialProgress, deliverySerialsComplete } from '@/lib/transactionRules'

export const drStatusBadge = {
  active: 'current',
  out_for_delivery: 'pending',
  partially_delivered: 'pending',
  delivered: 'approved',
  cancelled: 'rejected',
}

export const drStatusLabel = {
  active: 'For Delivery',
  out_for_delivery: 'Out for Delivery',
  partially_delivered: 'Partially Delivered',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export function deliveryProgress(items) {
  let released = 0
  let scanned = 0
  for (const item of items ?? []) {
    const progress = deliveryLineSerialProgress(item)
    released += progress.needed
    scanned += progress.captured
  }
  const percent = released === 0 ? 0 : Math.round((scanned / released) * 100)
  return { released, scanned, percent }
}

export function formatDrMoney(value) {
  return formatCurrency(Number(value) || 0)
}

export function formatDrDisplayDate(isoDate) {
  if (!isoDate) return '—'
  const date = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(date.getTime())) return isoDate
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function deriveDisplayStatus(dr) {
  if (dr.status === 'delivered' || dr.status === 'cancelled') return dr.status
  const items = dr.items ?? []
  const started = items.some((line) => (line.serialNumbers?.length ?? 0) > 0)
  const complete = deliverySerialsComplete(dr)
  if (started && !complete && dr.status === 'out_for_delivery') return 'partially_delivered'
  return dr.status
}

export function apiDeliveryReceiptToView(dr) {
  return {
    id: dr.id,
    customer: dr.customerName ?? '',
    outslipId: dr.referenceOutslipId ?? '—',
    date: dr.date ?? '',
    displayDate: dr.displayDate,
    totalAmount: dr.total ?? 0,
    status: deriveDisplayStatus(dr),
    rawStatus: dr.status,
    items: dr.items ?? [],
    dbId: dr.dbId,
  }
}

export function filterDeliveryReceipts(receipts, filters) {
  return receipts.filter((row) => {
    const view = apiDeliveryReceiptToView(row)
    if (filters.status !== 'all') {
      if (filters.status === 'partially_delivered') {
        if (view.status !== 'partially_delivered') return false
      } else if (filters.status === 'out_for_delivery') {
        if (view.rawStatus !== 'out_for_delivery' || view.status === 'partially_delivered') return false
      } else if (view.rawStatus !== filters.status) {
        return false
      }
    }

    const term = filters.search.trim().toLowerCase()
    if (term) {
      const hay = [view.id, view.customer, view.outslipId].join(' ').toLowerCase()
      if (!hay.includes(term)) return false
    }

    if (filters.dateFrom && row.date < filters.dateFrom) return false
    if (filters.dateTo && row.date > filters.dateTo) return false
    return true
  })
}

export function countDeliveryReceiptStatuses(receipts) {
  const counts = {
    all: receipts.length,
    active: 0,
    out_for_delivery: 0,
    partially_delivered: 0,
    delivered: 0,
  }
  receipts.forEach((row) => {
    const view = apiDeliveryReceiptToView(row)
    if (view.status === 'partially_delivered') counts.partially_delivered += 1
    else if (view.rawStatus === 'active') counts.active += 1
    else if (view.rawStatus === 'out_for_delivery') counts.out_for_delivery += 1
    else if (view.rawStatus === 'delivered') counts.delivered += 1
  })
  return counts
}
