import { formatLongDate } from '@/lib/printFormat'

export function mapPoListStatus(status) {
  if (status === 'fully_received') return 'completed'
  if (status === 'pending' || status === 'approved') return 'approved'
  return status
}

export function apiPurchaseOrderToView(po, supplier) {
  const items = (po.items ?? []).map((line, index) => ({
    id: `${po.id}-line-${index}`,
    itemCode: line.productId ? `ITM-${String(line.productId).padStart(4, '0')}` : String(index + 1),
    itemName: line.productName ?? '',
    quantity: Number(line.quantity) || 0,
    unit: 'PC/S',
    unitPrice: Number(line.unitPrice) || 0,
    amount: Number(line.amount ?? line.quantity * line.unitPrice) || 0,
  }))

  return {
    id: po.id,
    poNo: po.id,
    reference: po.referenceQuotationNo ?? po.referenceQuotationId ?? '—',
    supplier: po.supplierName ?? '',
    supplierAddress: supplier?.address ?? '',
    supplierPhone: supplier?.phone ?? supplier?.contact ?? '',
    supplierTin: supplier?.tinNo ?? '',
    date: po.date ?? '',
    displayDate: po.displayDate ?? formatLongDate(po.date),
    amount: po.total ?? 0,
    status: mapPoListStatus(po.status),
    items,
    destination: 'Main Office / Warehouse',
    warrantyPeriod: '1 Year',
    deliveryTerm: 'FOB Destination',
    deliveryDate: po.date ?? '',
    project: '—',
    paymentTerm: '30 Days',
    preparedBy: po.preparedBy ?? '',
    preparedByPosition: 'CEO/PRESIDENT',
  }
}

export function filterPurchaseOrders(orders, filters) {
  return orders.filter((order) => {
    if (filters.status !== 'all' && order.status !== filters.status) return false
    const term = filters.search.trim().toLowerCase()
    if (term) {
      const hay = [order.poNo, order.supplier, order.reference].join(' ').toLowerCase()
      if (!hay.includes(term)) return false
    }
    if (filters.dateFrom && order.date < filters.dateFrom) return false
    if (filters.dateTo && order.date > filters.dateTo) return false
    return true
  })
}

export function sortPurchaseOrders(orders, field, direction) {
  const sorted = [...orders].sort((a, b) => {
    let compare = 0
    switch (field) {
      case 'poNo':
        compare = a.poNo.localeCompare(b.poNo)
        break
      case 'supplier':
        compare = a.supplier.localeCompare(b.supplier)
        break
      case 'date':
        compare = a.date.localeCompare(b.date)
        break
      case 'amount':
        compare = a.amount - b.amount
        break
      default:
        compare = 0
    }
    return direction === 'asc' ? compare : -compare
  })
  return sorted
}
