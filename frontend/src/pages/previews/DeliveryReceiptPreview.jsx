import { DeliveryReceiptDocument } from '@/components/documents/DeliveryReceiptDocument'
import { PrintActions } from '@/components/documents/DocumentLayout'
import { useTransactions } from '@/context/TransactionContext'
import { useNavigate, useParams } from 'react-router-dom'

export function DeliveryReceiptPreviewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { deliveryReceipts, outslips, loading } = useTransactions()
  const deliveryReceipt = deliveryReceipts.find((dr) => dr.id === id)

  if (loading && !deliveryReceipt) {
    return <p className="text-text-secondary">Loading…</p>
  }

  if (!deliveryReceipt) {
    return <p className="text-text-secondary">Delivery receipt not found.</p>
  }

  const outslip = outslips.find(
    (o) =>
      o.id === deliveryReceipt.referenceOutslipId ||
      o.dbId === String(deliveryReceipt.referenceOutslipDbId),
  )

  return (
    <div className="quotation-print-page">
      <DeliveryReceiptDocument
        receipt={{
          ...deliveryReceipt,
          items: deliveryReceipt.items ?? outslip?.items ?? [],
          referencePoId: outslip?.referencePoId ?? outslip?.poId,
          customerAddress: deliveryReceipt.customerAddress ?? outslip?.customerAddress,
        }}
      />
      <PrintActions onBack={() => navigate('/delivery-receipt')} />
    </div>
  )
}
