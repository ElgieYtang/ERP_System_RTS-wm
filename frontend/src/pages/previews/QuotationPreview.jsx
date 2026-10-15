import { QuotationDocument } from '@/components/documents/QuotationDocument'
import { PrintActions } from '@/components/documents/DocumentLayout'
import { useTransactions } from '@/context/TransactionContext'
import { useSetupResource } from '@/hooks/useSetupResource'
import { apiQuotationToView } from '@/lib/quotationViewModel'
import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

export function QuotationPreviewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { quotations, loading } = useTransactions()
  const customers = useSetupResource('customers')
  const quotation = quotations.find((q) => q.id === id)

  const viewQuotation = useMemo(() => {
    if (!quotation) return null
    const customer = customers.rows.find((c) => c.id === quotation.customerId)
    return apiQuotationToView(quotation, customer)
  }, [quotation, customers.rows])

  if (loading) {
    return <p className="text-text-secondary">Loading quotation…</p>
  }

  if (!viewQuotation) {
    return <p className="text-text-secondary">Quotation not found.</p>
  }

  return (
    <div className="quotation-print-page">
      <QuotationDocument quotation={viewQuotation} />
      <PrintActions onBack={() => navigate('/quotations')} />
    </div>
  )
}
