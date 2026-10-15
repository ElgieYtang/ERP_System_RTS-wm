import { formatCurrency as formatCurrencyBase } from '@/lib/format'

export function formatCurrency(value) {
  const amount = Number(value) || 0
  return formatCurrencyBase(amount)
}

export function formatDisplayDate(isoDate) {
  if (!isoDate) return '—'
  const date = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(date.getTime())) return isoDate
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function todayIsoDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const year = parts.find((part) => part.type === 'year')?.value ?? '2026'
  const month = parts.find((part) => part.type === 'month')?.value ?? '01'
  const day = parts.find((part) => part.type === 'day')?.value ?? '01'
  return `${year}-${month}-${day}`
}

export function calculateLineAmount(quantity, unitPrice) {
  return Number(quantity || 0) * Number(unitPrice || 0)
}

export function calculateTotals(items, discount = 0, tax = 0) {
  const subtotal = items.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const total = Math.max(0, subtotal - Number(discount || 0) + Number(tax || 0))
  return { subtotal, total }
}

export function filterQuotations(quotations, filters) {
  return quotations.filter((quotation) => {
    if (filters.status !== 'all' && quotation.status !== filters.status) return false

    const term = filters.search.trim().toLowerCase()
    if (term) {
      const haystack = [
        quotation.quotationNo,
        quotation.customerName,
        quotation.remarks,
        ...quotation.items.flatMap((item) => [item.itemName, item.itemCode]),
      ]
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(term)) return false
    }

    if (filters.dateFrom && quotation.date < filters.dateFrom) return false
    if (filters.dateTo && quotation.date > filters.dateTo) return false
    return true
  })
}

export function sortQuotations(quotations, field, direction) {
  const sorted = [...quotations].sort((a, b) => {
    let compare = 0
    switch (field) {
      case 'quotationNo':
        compare = a.quotationNo.localeCompare(b.quotationNo)
        break
      case 'customerName':
        compare = a.customerName.localeCompare(b.customerName)
        break
      case 'date':
        compare = a.date.localeCompare(b.date)
        break
      case 'total':
        compare = a.total - b.total
        break
      case 'status':
        compare = a.status.localeCompare(b.status)
        break
      default:
        compare = 0
    }
    return direction === 'asc' ? compare : -compare
  })
  return sorted
}

export function paginateItems(items, page, perPage) {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage))
  const currentPage = Math.min(Math.max(page, 1), totalPages)
  const start = (currentPage - 1) * perPage
  return {
    items: items.slice(start, start + perPage),
    currentPage,
    totalPages,
    totalItems: items.length,
  }
}

export function createEmptyQuotation(quotationNo) {
  return {
    id: `draft-${crypto.randomUUID()}`,
    quotationNo: quotationNo || 'New',
    customerId: '',
    customerName: '',
    customerAddress: '',
    customerPhone: '',
    customerTin: '',
    subject: '',
    date: todayIsoDate(),
    status: 'pending',
    items: [],
    subtotal: 0,
    discount: 0,
    tax: 0,
    total: 0,
    remarks: '',
    terms: '30 DAYS',
    preparedByUserId: '',
    preparedBy: '',
    preparedByPosition: '',
    approvedByUserId: '',
    approvedBy: '',
  }
}

export function generateQuotationNo(quotations) {
  const numbers = quotations.map((row) => {
    const part = row.quotationNo?.split('-')?.[1]
    return Number(part) || 0
  })
  const next = Math.max(0, ...numbers) + 1
  return `QTN-${String(next).padStart(5, '0')}`
}
