import { getCustomerDetails } from '@/lib/quotationHelpers'
import { calculateLineAmount, calculateTotals } from '@/lib/quotations'

export function mapApiStatus(status) {
  if (status === 'cancelled') return 'rejected'
  if (status === 'draft') return 'pending'
  return status
}

export function apiQuotationToView(apiRow, customerRow) {
  const details = customerRow ? getCustomerDetails(customerRow) : null
  const items = (apiRow.items ?? []).map((line, index) => ({
    id: `${apiRow.id}-line-${index}`,
    itemId: String(line.productId ?? ''),
    itemCode: '',
    itemName: line.productName ?? '',
    unit: '',
    quantity: Number(line.quantity) || 0,
    unitPrice: Number(line.unitPrice) || 0,
    amount: Number(line.amount ?? line.quantity * line.unitPrice) || 0,
  }))

  const { subtotal, total } = calculateTotals(items, 0, 0)

  return {
    id: apiRow.id,
    quotationNo: apiRow.id,
    customerId: String(apiRow.customerId ?? ''),
    customerName: apiRow.customerName ?? details?.name ?? '',
    customerAddress: details?.address ?? '',
    customerPhone: details?.phone ?? '',
    customerTin: details?.tinNo ?? '',
    subject: '',
    date: apiRow.date ?? '',
    status: mapApiStatus(apiRow.status),
    items,
    subtotal,
    discount: 0,
    tax: 0,
    total: apiRow.total ?? total,
    remarks: '',
    terms: details?.terms ?? '',
    preparedByUserId: '',
    preparedBy: apiRow.preparedBy ?? '',
    preparedByPosition: '',
    approvedByUserId: '',
    approvedBy: apiRow.approvedBy ?? '',
  }
}

export function viewQuotationToApiItems(items) {
  return items
    .filter((line) => line.itemId && line.quantity > 0)
    .map((line) => ({
      productId: line.itemId,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
    }))
}

export function enrichCustomerFields(quotation, customerRow) {
  if (!customerRow) return quotation
  const details = getCustomerDetails(customerRow)
  return {
    ...quotation,
    customerName: details.name,
    customerAddress: details.address,
    customerPhone: details.phone,
    customerTin: details.tinNo,
    terms: details.terms || quotation.terms,
  }
}

export function recalculateViewQuotation(quotation) {
  const items = quotation.items.map((item) => ({
    ...item,
    amount: calculateLineAmount(item.quantity, item.unitPrice),
  }))
  const totals = calculateTotals(items, quotation.discount, quotation.tax)
  return { ...quotation, items, ...totals }
}
