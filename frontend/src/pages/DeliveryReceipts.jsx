import { DeliveryReceiptDetailModal } from '@/components/delivery-receipts/DeliveryReceiptDetailModal'
import { DeliveryReceiptFiltersBar } from '@/components/delivery-receipts/DeliveryReceiptFiltersBar'
import { DeliveryReceiptTable } from '@/components/delivery-receipts/DeliveryReceiptTable'
import { MarkDeliveredConfirmDialog } from '@/components/delivery-receipts/MarkDeliveredConfirmDialog'
import { DeliveryReceiptDocument } from '@/components/documents/DeliveryReceiptDocument'
import { PageHeader } from '@/components/layout/PageHeader'
import { TransactionLoadError } from '@/components/transactions/TransactionLoadError'
import { useToast } from '@/context/ToastContext'
import { useTransactions } from '@/context/TransactionContext'
import {
  apiDeliveryReceiptToView,
  countDeliveryReceiptStatuses,
  filterDeliveryReceipts,
} from '@/lib/deliveryReceiptList'
import {
  canCreateBillingFromDelivery,
  canMarkDeliveryDelivered,
  deliverySerialsComplete,
} from '@/lib/transactionRules'
import { Pagination } from '@/components/ui/pagination'
import { useServerPagedList } from '@/hooks/useServerPagedList'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const PAGE_SIZE = 10

const defaultFilters = {
  status: 'all',
  search: '',
  dateFrom: '',
  dateTo: '',
}

export function DeliveryReceiptsPage() {
  const {
    deliveryReceipts: allDeliveryReceipts,
    billingStatements,
    loading: contextLoading,
    error,
    refreshAll,
    markDeliveryOutForDelivery,
    markDeliveryDelivered,
    createBillingFromDelivery,
  } = useTransactions()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const [filters, setFilters] = useState(defaultFilters)
  const [selectedId, setSelectedId] = useState(null)
  const [detailId, setDetailId] = useState(null)
  const [confirmDelivered, setConfirmDelivered] = useState(false)
  const [printTarget, setPrintTarget] = useState(null)
  const [busy, setBusy] = useState(false)
  const [page, setPage] = useState(1)

  const listFilters = useMemo(
    () => ({
      status: filters.status,
      search: filters.search.trim() || undefined,
      date_from: filters.dateFrom || undefined,
      date_to: filters.dateTo || undefined,
    }),
    [filters],
  )

  const {
    items: pagedReceipts,
    meta,
    loading: listLoading,
    reload: reloadList,
  } = useServerPagedList('/delivery-receipts', {
    page,
    perPage: PAGE_SIZE,
    filters: listFilters,
  })

  const deliveryReceipts = allDeliveryReceipts

  const statusCounts = useMemo(
    () => countDeliveryReceiptStatuses(deliveryReceipts),
    [deliveryReceipts],
  )

  const filteredReceipts = useMemo(
    () => pagedReceipts.map(apiDeliveryReceiptToView),
    [pagedReceipts],
  )

  useEffect(() => {
    setPage(1)
  }, [filters.status, filters.search, filters.dateFrom, filters.dateTo])

  useEffect(() => {
    if (page > meta.totalPages) {
      setPage(Math.max(1, meta.totalPages))
    }
  }, [page, meta.totalPages])

  const detailReceiptRaw = useMemo(
    () =>
      deliveryReceipts.find((row) => row.id === detailId) ??
      pagedReceipts.find((row) => row.id === detailId) ??
      null,
    [deliveryReceipts, detailId, pagedReceipts],
  )

  const loading = contextLoading || listLoading

  const detailReceipt = detailReceiptRaw ? apiDeliveryReceiptToView(detailReceiptRaw) : null

  const serialsPending =
    detailReceiptRaw &&
    canMarkDeliveryDelivered(detailReceiptRaw) &&
    !deliverySerialsComplete(detailReceiptRaw)

  useEffect(() => {
    const state = location.state
    if (state?.toast) {
      showToast('success', state.toast)
      navigate('.', { replace: true, state: null })
    }
  }, [location.state, navigate, showToast])

  function openDetails(receipt) {
    setSelectedId(receipt.id)
    setDetailId(receipt.id)
    setConfirmDelivered(false)
  }

  function closeDetails() {
    setDetailId(null)
    setConfirmDelivered(false)
  }

  function openView(receipt) {
    navigate(`/delivery-receipt/${encodeURIComponent(receipt.id)}`)
  }

  function handlePrint(receipt) {
    const raw = deliveryReceipts.find((row) => row.id === receipt.id) ?? receipt
    setPrintTarget(raw)
    const clearPrint = () => {
      setPrintTarget(null)
      window.removeEventListener('afterprint', clearPrint)
    }
    window.addEventListener('afterprint', clearPrint)
    requestAnimationFrame(() => {
      window.print()
      window.setTimeout(clearPrint, 1000)
    })
  }

  async function handleMarkOutForDelivery() {
    if (!detailReceiptRaw) return
    setBusy(true)
    try {
      await markDeliveryOutForDelivery(detailReceiptRaw.id)
      reloadList()
      showToast('success', 'Delivery marked as out for delivery.')
    } catch (caught) {
      showToast('error', caught?.message ?? 'Could not update delivery.')
    } finally {
      setBusy(false)
    }
  }

  async function handleConfirmDelivered() {
    if (!detailReceiptRaw) return
    setBusy(true)
    try {
      await markDeliveryDelivered(detailReceiptRaw.id)
      reloadList()
      showToast('success', 'Delivery marked as completed.')
      setConfirmDelivered(false)
    } catch (caught) {
      showToast('error', caught?.message ?? 'Could not mark delivered.')
    } finally {
      setBusy(false)
    }
  }

  async function handleCreateBilling() {
    if (!detailReceiptRaw) return
    setBusy(true)
    try {
      const bill = await createBillingFromDelivery(detailReceiptRaw.id)
      closeDetails()
      navigate('/billing', {
        state: {
          toast: `Billing ${bill?.id ?? ''} created successfully.`,
        },
      })
    } catch (caught) {
      showToast('error', caught?.message ?? 'Could not create billing.')
    } finally {
      setBusy(false)
    }
  }

  const showEmpty =
    !loading &&
    deliveryReceipts.length === 0 &&
    filters.status === 'all' &&
    !filters.search &&
    !filters.dateFrom &&
    !filters.dateTo

  return (
    <div>
      <div className="no-print">
        <PageHeader
          title="Delivery Receipt"
          description="Track and confirm customer deliveries."
          breadcrumbs={['Transaction', 'Delivery Receipt']}
        />

        {loading ? (
          <p className="mb-4 text-sm text-text-secondary">Loading delivery receipts…</p>
        ) : null}

        {error ? <TransactionLoadError message={error} onRetry={refreshAll} /> : null}

        <DeliveryReceiptFiltersBar
          filters={filters}
          counts={statusCounts}
          onChange={setFilters}
        />

        {showEmpty ? (
          <div className="rounded-lg border border-border bg-surface px-6 py-10 text-center">
            <p className="text-sm font-medium text-text-primary">No delivery receipts yet.</p>
            <p className="mt-1 text-sm text-text-secondary">
              Create a Gate Pass from a released Outslip, then generate the Delivery Receipt.
            </p>
          </div>
        ) : (
          <>
            <DeliveryReceiptTable
              receipts={filteredReceipts}
              selectedId={selectedId}
              onSelect={openDetails}
              onView={openView}
              onPrint={handlePrint}
            />
            {meta.totalPages > 1 ? (
              <div className="mt-4 flex justify-center">
                <Pagination
                  currentPage={meta.page}
                  totalPages={meta.totalPages}
                  onPageChange={setPage}
                />
              </div>
            ) : null}
          </>
        )}

        {detailReceipt && detailReceiptRaw ? (
          <DeliveryReceiptDetailModal
            receipt={detailReceipt}
            rawReceipt={detailReceiptRaw}
            escapeDisabled={confirmDelivered || busy}
            serialsPending={Boolean(serialsPending)}
            onClose={closeDetails}
            onMarkOutForDelivery={handleMarkOutForDelivery}
            onRequestMarkDelivered={() => setConfirmDelivered(true)}
            onCreateBilling={
              canCreateBillingFromDelivery(detailReceiptRaw, billingStatements)
                ? handleCreateBilling
                : () => showToast('info', 'Billing already exists for this delivery.')
            }
            onOpenFullView={() => openView(detailReceipt)}
          />
        ) : null}

        <MarkDeliveredConfirmDialog
          open={confirmDelivered}
          onCancel={() => setConfirmDelivered(false)}
          onConfirm={handleConfirmDelivered}
        />
      </div>

      <div className="dr-print-root">
        {printTarget ? <DeliveryReceiptDocument receipt={printTarget} /> : null}
      </div>
    </div>
  )
}
