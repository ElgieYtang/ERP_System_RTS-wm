function idsMatch(a, b) {
  if (a == null || b == null || a === '' || b === '') return false
  return String(a) === String(b)
}

export function rowDbId(row) {
  return row?.dbId?.toString() ?? row?.id?.toString() ?? ''
}

export function userIsAdmin(user) {
  return user?.role === 'admin' || String(user?.type).toUpperCase() === 'ADMIN'
}

export function canApproveOutslip(row) {
  return row?.status === 'pending'
}

export function canDispatchOutslip(row) {
  return row?.status === 'approved'
}

export function canApproveOutslipForUser(row, user) {
  return canApproveOutslip(row) && userIsAdmin(user)
}

export function canDispatchOutslipForUser(row, user) {
  return canDispatchOutslip(row) && userIsAdmin(user)
}

export function isOutslipReadyForDr(status) {
  const value = (status ?? '').toLowerCase()
  return value === 'for_dispatch' || value === 'released'
}

export function hasDrForOutslip(outslip, deliveryReceipts) {
  const osDb = rowDbId(outslip)
  const osNo = outslip?.id?.toString()
  return deliveryReceipts.some(
    (row) =>
      idsMatch(row.referenceOutslipDbId, osDb) || idsMatch(row.referenceOutslipId, osNo),
  )
}

export function canCreateDrFromOutslip(outslip, deliveryReceipts) {
  return isOutslipReadyForDr(outslip?.status) && !hasDrForOutslip(outslip, deliveryReceipts)
}

export function findDrForOutslip(outslip, deliveryReceipts) {
  const osDb = rowDbId(outslip)
  const osNo = outslip?.id?.toString()
  return deliveryReceipts.find(
    (row) =>
      idsMatch(row.referenceOutslipDbId, osDb) || idsMatch(row.referenceOutslipId, osNo),
  )
}

export function canMarkDeliveryOut(row) {
  return row?.status === 'active'
}

export function canMarkDeliveryDelivered(row) {
  const status = row?.status ?? ''
  return status === 'active' || status === 'out_for_delivery'
}

export function deliveryLineSerialCount(item) {
  if (Array.isArray(item?.serialNumbers)) {
    return item.serialNumbers.filter((value) => String(value ?? '').trim() !== '').length
  }
  if (item?.brandSerial) {
    return item.brandSerial
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean).length
  }
  return 0
}

export function deliveryLineSerialProgress(item) {
  const needed = Math.max(0, Math.round(Number(item?.quantity ?? 0)))
  const captured = deliveryLineSerialCount(item)
  return {
    needed,
    captured,
    complete: needed === 0 || captured >= needed,
  }
}

export function deliverySerialsComplete(delivery) {
  const lines = delivery?.items ?? []
  if (!lines.length) return true
  return lines.every((line) => deliveryLineSerialProgress(line).complete)
}

export function canMarkDeliveryDeliveredWithSerials(delivery) {
  return canMarkDeliveryDelivered(delivery) && deliverySerialsComplete(delivery)
}

export function hasBillingForDelivery(delivery, billings) {
  const drDb = rowDbId(delivery)
  const drNo = delivery?.id?.toString()
  return billings.some(
    (row) => idsMatch(row.referenceDrDbId, drDb) || idsMatch(row.referenceDrId, drNo),
  )
}

export function canCreateBillingFromDelivery(delivery, billings) {
  return delivery?.status === 'delivered' && !hasBillingForDelivery(delivery, billings)
}

export function findBillingForDelivery(delivery, billings) {
  const drDb = rowDbId(delivery)
  const drNo = delivery?.id?.toString()
  return billings.find(
    (row) => idsMatch(row.referenceDrDbId, drDb) || idsMatch(row.referenceDrId, drNo),
  )
}
