import { useAuth } from '@/context/AuthContext'
import {
  approveOutslip as approveOutslipRequest,
  cancelQuotation as cancelQuotationRequest,
  confirmReceiving as confirmReceivingRequest,
  convertQuotationToPo as convertQuotationToPoRequest,
  createBilling as createBillingRequest,
  createDeliveryReceipt as createDeliveryReceiptRequest,
  createOutslip as createOutslipRequest,
  createQuotation as createQuotationRequest,
  createReceivingFromPo as createReceivingFromPoRequest,
  deletePurchaseOrder as deletePurchaseOrderRequest,
  dispatchOutslip as dispatchOutslipRequest,
  fetchBillings,
  fetchDeliveryReceipts,
  fetchOutslips,
  fetchPurchaseOrders,
  fetchQuotations,
  fetchReceivings,
  recordBillingPayment as recordBillingPaymentRequest,
  submitOutslip as submitOutslipRequest,
  updateDeliveryStatus as updateDeliveryStatusRequest,
  updateOutslip as updateOutslipRequest,
  updateQuotation as updateQuotationRequest,
  voidGatePass as voidGatePassRequest,
} from '@/lib/transactionApi'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const TransactionContext = createContext(null)

function TransactionProvider({ children }) {
  const { isAuthenticated, isBootstrapping } = useAuth()
  const [quotations, setQuotations] = useState([])
  const [purchaseOrders, setPurchaseOrders] = useState([])
  const [receivings, setReceivings] = useState([])
  const [outslips, setOutslips] = useState([])
  const [deliveryReceipts, setDeliveryReceipts] = useState([])
  const [billingStatements, setBillingStatements] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const refreshAll = useCallback(async () => {
    if (!isAuthenticated) {
      setQuotations([])
      setPurchaseOrders([])
      setReceivings([])
      setOutslips([])
      setDeliveryReceipts([])
      setBillingStatements([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const [
        nextQuotations,
        nextPurchaseOrders,
        nextReceivings,
        nextOutslips,
        nextDeliveries,
        nextBillings,
      ] = await Promise.all([
        fetchQuotations(),
        fetchPurchaseOrders(),
        fetchReceivings(),
        fetchOutslips(),
        fetchDeliveryReceipts(),
        fetchBillings(),
      ])

      setQuotations(nextQuotations)
      setPurchaseOrders(nextPurchaseOrders)
      setReceivings(nextReceivings)
      setOutslips(nextOutslips)
      setDeliveryReceipts(nextDeliveries)
      setBillingStatements(nextBillings)
    } catch (caught) {
      setError(caught?.message ?? 'Could not load transactions.')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (isBootstrapping) return
    refreshAll()
  }, [isBootstrapping, refreshAll])

  const addQuotation = useCallback(async (data) => {
    const payload = await createQuotationRequest({
      customerId: Number(data.customerId),
      date: data.dateIso ?? data.date ?? undefined,
      items: (data.items ?? []).map((item) => ({
        productId: Number(item.productId),
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
      })),
    })

    await refreshAll()
    return payload.data
  }, [refreshAll])

  const updateQuotation = useCallback(async (id, data) => {
    const body = {}

    if (data.customerId != null) body.customerId = Number(data.customerId)
    if (data.dateIso || data.date) body.date = data.dateIso ?? data.date
    if (data.status) body.status = data.status
    if (data.items) {
      body.items = data.items.map((item) => ({
        productId: Number(item.productId),
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
      }))
    }

    await updateQuotationRequest(id, body)
    await refreshAll()
  }, [refreshAll])

  const cancelQuotation = useCallback(async (id) => {
    await cancelQuotationRequest(id)
    await refreshAll()
  }, [refreshAll])

  const convertQuotationToPO = useCallback(async (quotationId, supplierId) => {
    const payload = await convertQuotationToPoRequest(quotationId, {
      supplierId: Number(supplierId),
    })
    await refreshAll()
    return payload.data?.id ?? null
  }, [refreshAll])

  const createReceiving = useCallback(async (poId, data = {}) => {
    const payload = await createReceivingFromPoRequest(poId, data)
    await refreshAll()
    return payload.data
  }, [refreshAll])

  const confirmReceiving = useCallback(async (id) => {
    await confirmReceivingRequest(id)
    await refreshAll()
  }, [refreshAll])

  const createOutslip = useCallback(async (data) => {
    const body = {
      customerId: Number(data.customerId),
      date: data.dateIso ?? data.date ?? undefined,
      branchId: data.branchId ? Number(data.branchId) : undefined,
    }

    if (data.receivingId) {
      body.receivingId = Number(data.receivingId)
    }

    if (data.items?.length) {
      body.items = data.items.map((item) => ({
        productId: Number(item.productId),
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice ?? 0),
      }))
    }

    if (data.asDraft) {
      body.asDraft = true
    }

    const payload = await createOutslipRequest(body)
    await refreshAll()
    return payload.data
  }, [refreshAll])

  const updateOutslip = useCallback(async (id, data) => {
    const body = {}
    if (data.dateIso || data.date) body.date = data.dateIso ?? data.date
    if (data.items?.length) {
      body.items = data.items.map((item) => ({
        productId: Number(item.productId),
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice ?? 0),
      }))
    }
    await updateOutslipRequest(id, body)
    await refreshAll()
  }, [refreshAll])

  const submitOutslip = useCallback(async (id) => {
    await submitOutslipRequest(id)
    await refreshAll()
  }, [refreshAll])

  const deletePurchaseOrder = useCallback(async (id) => {
    await deletePurchaseOrderRequest(id)
    await refreshAll()
  }, [refreshAll])

  const voidGatePass = useCallback(async (outslipId) => {
    await voidGatePassRequest(outslipId)
    await refreshAll()
  }, [refreshAll])

  const approveOutslip = useCallback(async (id) => {
    await approveOutslipRequest(id)
    await refreshAll()
  }, [refreshAll])

  const forDispatchOutslip = useCallback(async (id) => {
    await dispatchOutslipRequest(id)
    await refreshAll()
  }, [refreshAll])

  const createDeliveryFromOutslip = useCallback(async (outslipId) => {
    const outslip = outslips.find((row) => row.id === outslipId || row.dbId === String(outslipId))
    const payload = await createDeliveryReceiptRequest({
      outslipId: Number(outslip?.dbId ?? outslipId),
    })
    await refreshAll()
    return payload.data?.id ?? null
  }, [outslips, refreshAll])

  const markDeliveryOutForDelivery = useCallback(async (id) => {
    await updateDeliveryStatusRequest(id, 'out_for_delivery')
    await refreshAll()
  }, [refreshAll])

  const markDeliveryDelivered = useCallback(async (id) => {
    await updateDeliveryStatusRequest(id, 'delivered')
    await refreshAll()
  }, [refreshAll])

  const createBillingFromDelivery = useCallback(async (deliveryId) => {
    const delivery = deliveryReceipts.find(
      (row) => row.id === deliveryId || row.dbId === String(deliveryId),
    )
    const payload = await createBillingRequest({
      deliveryId: Number(delivery?.dbId ?? deliveryId),
    })
    await refreshAll()
    return payload.data
  }, [deliveryReceipts, refreshAll])

  const recordPayment = useCallback(async (billingId, amount, date, reference, remarks = '') => {
    const bill = billingStatements.find(
      (row) => row.id === billingId || row.dbId === String(billingId),
    )
    await recordBillingPaymentRequest(bill?.id ?? billingId, {
      amount: Number(amount),
      date: date || undefined,
      reference: reference || undefined,
      remarks: remarks || undefined,
    })
    await refreshAll()
  }, [billingStatements, refreshAll])

  const value = useMemo(
    () => ({
      quotations,
      purchaseOrders,
      receivings,
      outslips,
      deliveryReceipts,
      billingStatements,
      loading,
      error,
      refreshAll,
      addQuotation,
      updateQuotation,
      cancelQuotation,
      convertQuotationToPO,
      createReceiving,
      confirmReceiving,
      createOutslip,
      updateOutslip,
      submitOutslip,
      deletePurchaseOrder,
      voidGatePass,
      approveOutslip,
      forDispatchOutslip,
      createDeliveryFromOutslip,
      markDeliveryOutForDelivery,
      markDeliveryDelivered,
      createBillingFromDelivery,
      recordPayment,
    }),
    [
      quotations,
      purchaseOrders,
      receivings,
      outslips,
      deliveryReceipts,
      billingStatements,
      loading,
      error,
      refreshAll,
      addQuotation,
      updateQuotation,
      cancelQuotation,
      convertQuotationToPO,
      createReceiving,
      confirmReceiving,
      createOutslip,
      updateOutslip,
      submitOutslip,
      deletePurchaseOrder,
      voidGatePass,
      approveOutslip,
      forDispatchOutslip,
      createDeliveryFromOutslip,
      markDeliveryOutForDelivery,
      markDeliveryDelivered,
      createBillingFromDelivery,
      recordPayment,
    ],
  )

  return (
    <TransactionContext.Provider value={value}>{children}</TransactionContext.Provider>
  )
}

function useTransactions() {
  const context = useContext(TransactionContext)

  if (!context) {
    throw new Error('useTransactions must be used within TransactionProvider')
  }

  return context
}

export { TransactionProvider, useTransactions }
