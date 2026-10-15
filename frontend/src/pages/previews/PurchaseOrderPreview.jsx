import { PurchaseOrderDocument } from '@/components/documents/PurchaseOrderDocument'
import { PrintActions } from '@/components/documents/DocumentLayout'
import { useTransactions } from '@/context/TransactionContext'
import { useSetupResource } from '@/hooks/useSetupResource'
import { apiPurchaseOrderToView } from '@/lib/purchaseOrderViewModel'
import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

export function PurchaseOrderPreviewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { purchaseOrders, loading } = useTransactions()
  const suppliers = useSetupResource('suppliers')
  const purchaseOrder = purchaseOrders.find((po) => po.id === id)

  const viewOrder = useMemo(() => {
    if (!purchaseOrder) return null
    const supplier = suppliers.rows.find((s) => s.id === purchaseOrder.supplierId)
    return apiPurchaseOrderToView(purchaseOrder, supplier)
  }, [purchaseOrder, suppliers.rows])

  if (loading) {
    return <p className="text-text-secondary">Loading purchase order…</p>
  }

  if (!viewOrder) {
    return <p className="text-text-secondary">Purchase order not found.</p>
  }

  return (
    <div className="quotation-print-page">
      <PurchaseOrderDocument order={viewOrder} />
      <PrintActions onBack={() => navigate('/purchase-order')} />
    </div>
  )
}
