export const BARCODE_SCAN_EVENT = 'erp-barcode-scanned'

export function requestBarcodeLookup(code) {
  const trimmed = code.trim()
  if (!trimmed) return
  window.dispatchEvent(new CustomEvent(BARCODE_SCAN_EVENT, { detail: trimmed }))
}

function sameCode(left, right) {
  return String(left ?? '').trim().toLowerCase() === String(right ?? '').trim().toLowerCase()
}

function matchesRow(code, row, extra = []) {
  const values = [row?.id, row?.dbId, ...extra].filter(Boolean)
  return values.some((value) => sameCode(code, value))
}

export function findTransactionByCode(code, records) {
  const needle = code.trim()
  if (!needle) return null

  const {
    quotations = [],
    purchaseOrders = [],
    receivings = [],
    outslips = [],
    deliveryReceipts = [],
    billingStatements = [],
  } = records

  for (const row of quotations) {
    if (matchesRow(needle, row)) {
      return {
        label: 'Quotation',
        title: row.id,
        path: `/quotations/${encodeURIComponent(row.dbId ?? row.id)}`,
        party: row.customerName,
      }
    }
  }

  for (const row of purchaseOrders) {
    if (matchesRow(needle, row)) {
      return {
        label: 'Purchase Order',
        title: row.id,
        path: `/purchase-order/${encodeURIComponent(row.dbId ?? row.id)}`,
        party: row.supplierName,
      }
    }
  }

  for (const row of receivings) {
    if (matchesRow(needle, row, [row.receivingNo])) {
      return {
        label: 'Receiving',
        title: row.id ?? row.receivingNo,
        path: '/inventory/receiving',
        party: row.customerName,
      }
    }
  }

  for (const row of outslips) {
    if (matchesRow(needle, row)) {
      return {
        label: 'Outslip',
        title: row.id,
        path: `/outslip/${encodeURIComponent(row.dbId ?? row.id)}`,
        party: row.customerName,
      }
    }
  }

  for (const row of deliveryReceipts) {
    if (matchesRow(needle, row)) {
      return {
        label: 'Delivery Receipt',
        title: row.id,
        path: `/delivery-receipt/${encodeURIComponent(row.dbId ?? row.id)}`,
        party: row.customerName,
      }
    }
  }

  for (const row of billingStatements) {
    if (matchesRow(needle, row)) {
      return {
        label: 'Billing',
        title: row.id,
        path: '/billing',
        party: row.customerName,
      }
    }
  }

  return null
}
