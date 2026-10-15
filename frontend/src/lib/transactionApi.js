import { request } from '@/lib/api'

function fetchQuotations() {
  return request('/quotations?all=1').then((payload) => payload.data ?? [])
}

function fetchQuotation(id) {
  return request(`/quotations/${encodeURIComponent(id)}`).then((payload) => payload.data)
}

function createQuotation(data) {
  return request('/quotations', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

function updateQuotation(id, data) {
  return request(`/quotations/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

function cancelQuotation(id) {
  return request(`/quotations/${encodeURIComponent(id)}/cancel`, {
    method: 'POST',
  })
}

function convertQuotationToPo(id, data) {
  return request(`/quotations/${encodeURIComponent(id)}/convert-to-po`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

function fetchPurchaseOrders() {
  return request('/purchase-orders?all=1').then((payload) => payload.data ?? [])
}

function deletePurchaseOrder(id) {
  return request(`/purchase-orders/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

function fetchPurchaseOrder(id) {
  return request(`/purchase-orders/${encodeURIComponent(id)}`).then((payload) => payload.data)
}

function createReceivingFromPo(poId, data = {}) {
  return request(`/purchase-orders/${encodeURIComponent(poId)}/receivings`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

function fetchReceivings() {
  return request('/receivings?all=1').then((payload) => payload.data ?? [])
}

function confirmReceiving(id) {
  return request(`/receivings/${encodeURIComponent(id)}/confirm`, {
    method: 'POST',
  })
}

function fetchOutslips() {
  return request('/outslips?all=1').then((payload) => payload.data ?? [])
}

function createOutslip(data) {
  return request('/outslips', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

function updateOutslip(id, data) {
  return request(`/outslips/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

function submitOutslip(id) {
  return request(`/outslips/${encodeURIComponent(id)}/submit`, {
    method: 'POST',
  })
}

function approveOutslip(id) {
  return request(`/outslips/${encodeURIComponent(id)}/approve`, {
    method: 'POST',
  })
}

function dispatchOutslip(id) {
  return request(`/outslips/${encodeURIComponent(id)}/dispatch`, {
    method: 'POST',
  })
}

function fetchGatePass(outslipId) {
  return request(`/outslips/${encodeURIComponent(outslipId)}/gate-pass`).then(
    (payload) => payload.data,
  )
}

function saveGatePass(outslipId, data) {
  return request(`/outslips/${encodeURIComponent(outslipId)}/gate-pass`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }).then((payload) => payload.data)
}

function markGatePassExit(outslipId) {
  return request(`/outslips/${encodeURIComponent(outslipId)}/gate-pass/exit`, {
    method: 'POST',
  }).then((payload) => payload.data)
}

function voidGatePass(outslipId) {
  return request(`/outslips/${encodeURIComponent(outslipId)}/gate-pass/void`, {
    method: 'POST',
  })
}

function fetchDeliveryReceipts() {
  return request('/delivery-receipts?all=1').then((payload) => payload.data ?? [])
}

function fetchDeliveryReceipt(id) {
  return request(`/delivery-receipts/${encodeURIComponent(id)}`).then((payload) => payload.data)
}

function createDeliveryReceipt(data) {
  return request('/delivery-receipts', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

function updateDeliveryStatus(id, status) {
  return request(`/delivery-receipts/${encodeURIComponent(id)}/status`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  })
}

function updateDeliverySerials(id, data) {
  return request(`/delivery-receipts/${encodeURIComponent(id)}/serials`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }).then((payload) => payload.data)
}

function fetchSetupItemByBarcode(barcode) {
  return request(`/setup/items/by-barcode/${encodeURIComponent(barcode)}`).then(
    (payload) => payload.data,
  )
}

function fetchBillings() {
  return request('/billings?all=1').then((payload) => payload.data ?? [])
}

function createBilling(data) {
  return request('/billings', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

function recordBillingPayment(id, data) {
  return request(`/billings/${encodeURIComponent(id)}/payments`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export {
  approveOutslip,
  cancelQuotation,
  confirmReceiving,
  convertQuotationToPo,
  createBilling,
  createDeliveryReceipt,
  createOutslip,
  createQuotation,
  createReceivingFromPo,
  deletePurchaseOrder,
  dispatchOutslip,
  fetchBillings,
  fetchDeliveryReceipt,
  fetchDeliveryReceipts,
  fetchGatePass,
  fetchOutslips,
  fetchPurchaseOrder,
  fetchPurchaseOrders,
  fetchQuotation,
  fetchQuotations,
  fetchReceivings,
  fetchSetupItemByBarcode,
  markGatePassExit,
  recordBillingPayment,
  saveGatePass,
  submitOutslip,
  updateDeliverySerials,
  updateDeliveryStatus,
  updateOutslip,
  updateQuotation,
  voidGatePass,
}
