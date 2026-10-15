import { DeleteQuotationDialog } from '@/components/quotations/DeleteQuotationDialog'
import { QuotationDetailModal } from '@/components/quotations/QuotationDetailModal'
import { QuotationFiltersBar } from '@/components/quotations/QuotationFiltersBar'
import { QuotationFormModal } from '@/components/quotations/QuotationFormModal'
import { QuotationTable } from '@/components/quotations/QuotationTable'
import { PageHeader } from '@/components/layout/PageHeader'
import { AddButton } from '@/components/ui/add-button'
import { Pagination } from '@/components/ui/pagination'
import { useDemo } from '@/context/DemoContext'
import { useTransactions } from '@/context/TransactionContext'
import { useSetupCustomers } from '@/hooks/useSetupCustomers'
import { useIsMobile } from '@/hooks/useIsMobile'
import {
  apiQuotationToView,
  enrichCustomerFields,
  recalculateViewQuotation,
  viewQuotationToApiItems,
} from '@/lib/quotationViewModel'
import {
  createEmptyQuotation,
  filterQuotations,
  generateQuotationNo,
  paginateItems,
  sortQuotations,
} from '@/lib/quotations'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const PAGE_SIZE = 10
const LIST_PATH = '/quotations'
const CREATE_PATH = '/quotations/create'

const defaultFilters = {
  status: 'all',
  search: '',
  dateFrom: '',
  dateTo: '',
}

function isCreatePath(pathname) {
  return pathname.replace(/\/$/, '') === CREATE_PATH
}

export function QuotationsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const creating = isCreatePath(location.pathname)
  const wasCreatingRef = useRef(creating)
  const isMobile = useIsMobile()
  const { showToast } = useDemo()
  const {
    quotations: apiQuotations,
    loading,
    addQuotation,
    updateQuotation,
    cancelQuotation,
    convertQuotationToPO,
  } = useTransactions()
  const { customers } = useSetupCustomers()

  const customerById = useMemo(() => {
    const map = new Map()
    customers.forEach((row) => map.set(row.id, row))
    return map
  }, [customers])

  const viewQuotations = useMemo(
    () =>
      apiQuotations.map((row) =>
        apiQuotationToView(row, customerById.get(String(row.customerId ?? ''))),
      ),
    [apiQuotations, customerById],
  )

  const [filters, setFilters] = useState(defaultFilters)
  const [sortField, setSortField] = useState('date')
  const [sortDirection, setSortDirection] = useState('desc')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState(null)
  const [detailId, setDetailId] = useState(null)
  const [draft, setDraft] = useState(null)
  const [editorMode, setEditorMode] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (creating) {
      if (!wasCreatingRef.current) {
        setSelectedId(null)
        setDetailId(null)
        setEditorMode('create')
        setDraft(
          createEmptyQuotation(generateQuotationNo(viewQuotations)),
        )
      }
      wasCreatingRef.current = true
      return
    }

    if (wasCreatingRef.current) {
      wasCreatingRef.current = false
      if (editorMode === 'create') {
        setDraft(null)
        setEditorMode(null)
      }
    }
  }, [creating, viewQuotations, editorMode])

  const statusCounts = useMemo(() => {
    const counts = { all: viewQuotations.length, draft: 0, pending: 0, approved: 0, rejected: 0 }
    viewQuotations.forEach((row) => {
      if (counts[row.status] !== undefined) counts[row.status] += 1
    })
    return counts
  }, [viewQuotations])

  const filteredQuotations = useMemo(() => {
    const filtered = filterQuotations(viewQuotations, filters)
    return sortQuotations(filtered, sortField, sortDirection)
  }, [viewQuotations, filters, sortField, sortDirection])

  const pagination = useMemo(
    () => paginateItems(filteredQuotations, page, PAGE_SIZE),
    [filteredQuotations, page],
  )

  const detailQuotation = useMemo(
    () => (detailId ? viewQuotations.find((row) => row.id === detailId) ?? null : null),
    [detailId, viewQuotations],
  )

  useEffect(() => {
    setPage(1)
  }, [filters, sortField, sortDirection])

  useEffect(() => {
    if (page > pagination.totalPages) setPage(pagination.totalPages)
  }, [page, pagination.totalPages])

  function handleSort(field) {
    if (sortField === field) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortField(field)
    setSortDirection('asc')
  }

  function openCreate() {
    setSelectedId(null)
    setDetailId(null)
    setEditorMode('create')
    setDraft(createEmptyQuotation(generateQuotationNo(viewQuotations)))
    navigate(CREATE_PATH)
  }

  function closeEditor() {
    setDraft(null)
    setEditorMode(null)
    if (creating) navigate(LIST_PATH, { replace: true })
  }

  function openEdit(quotation) {
    setDetailId(null)
    setEditorMode('edit')
    setDraft(structuredClone(quotation))
    setSelectedId(quotation.id)
    if (creating) navigate(LIST_PATH, { replace: true })
  }

  function openDetail(quotation) {
    if (isMobile) {
      navigate(`/quotations/${quotation.quotationNo}`)
      return
    }
    setSelectedId(quotation.id)
    setDetailId(quotation.id)
  }

  function closeDetail() {
    setDetailId(null)
  }

  async function handleSave() {
    if (!draft) return
    if (!draft.customerId) {
      showToast('error', 'Please select a customer before saving.')
      return
    }

    const normalized = recalculateViewQuotation(draft)
    const lineItems = viewQuotationToApiItems(normalized.items)
    if (lineItems.length === 0) {
      showToast('error', 'Please add at least one item before saving.')
      return
    }

    setSaving(true)
    try {
      if (editorMode === 'create') {
        await addQuotation({
          customerId: normalized.customerId,
          date: normalized.date,
          items: lineItems.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
          })),
        })
        showToast('success', 'Quotation created.')
      } else {
        await updateQuotation(normalized.quotationNo, {
          customerId: normalized.customerId,
          date: normalized.date,
          items: lineItems.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
          })),
        })
        showToast('success', `Quotation ${normalized.quotationNo} updated.`)
      }
      setDraft(null)
      setEditorMode(null)
      if (creating) navigate(LIST_PATH, { replace: true })
    } catch (caught) {
      showToast('error', caught?.message ?? 'Could not save quotation.')
    } finally {
      setSaving(false)
    }
  }

  async function confirmCancel() {
    if (!deleteTarget) return
    try {
      await cancelQuotation(deleteTarget.quotationNo)
      showToast('success', `Quotation ${deleteTarget.quotationNo} cancelled.`)
      if (detailId === deleteTarget.id) setDetailId(null)
      setDeleteTarget(null)
    } catch (caught) {
      showToast('error', caught?.message ?? 'Could not cancel quotation.')
    }
  }

  function handlePrint(quotation) {
    navigate(`/quotations/${quotation.quotationNo}/preview`)
    setTimeout(() => window.print(), 300)
  }

  function openPreview(quotation) {
    setDetailId(null)
    navigate(`/quotations/${quotation.quotationNo}/preview`)
  }

  async function handleStatusChange(quotation, status) {
    try {
      await updateQuotation(quotation.quotationNo, { status })
      showToast('success', `Quotation ${quotation.quotationNo} ${status}.`)
    } catch (caught) {
      showToast('error', caught?.message ?? 'Could not update status.')
    }
  }

  async function handleApprove(quotation) {
    await handleStatusChange(quotation, 'approved')
  }

  async function handleConvertToPo(quotation, supplier) {
    try {
      const poId = await convertQuotationToPO(quotation.quotationNo, supplier.id)
      setDetailId(null)
      showToast('success', `Purchase order ${poId ?? ''} created.`)
      navigate('/purchase-order')
    } catch (caught) {
      showToast('error', caught?.message ?? 'Could not convert to PO.')
    }
  }

  return (
    <div>
      <PageHeader
        title="Quotations"
        description="Manage and track customer quotations."
        breadcrumbs={['Transaction', 'Quotations']}
        action={<AddButton label="Add Quotation" onClick={openCreate} />}
      />

      {loading ? (
        <p className="mb-4 text-sm text-text-secondary">Loading quotations…</p>
      ) : null}

      <QuotationFiltersBar filters={filters} counts={statusCounts} onChange={setFilters} />

      <QuotationTable
        quotations={pagination.items}
        selectedId={selectedId}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
        onSelect={openDetail}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
        onPrint={handlePrint}
        onApprove={handleApprove}
      />

      {pagination.totalPages > 1 ? (
        <div className="mt-4">
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
          />
        </div>
      ) : null}

      <DeleteQuotationDialog
        quotation={deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmCancel}
      />

      {detailQuotation ? (
        <QuotationDetailModal
          quotation={detailQuotation}
          onClose={closeDetail}
          onStatusChange={handleStatusChange}
          onPreview={openPreview}
          onConvertToPo={handleConvertToPo}
        />
      ) : null}

      {draft && editorMode ? (
        <QuotationFormModal
          open
          title={editorMode === 'create' ? 'New Quotation' : 'Edit Quotation'}
          quotation={draft}
          onChange={(next) => {
            const customer = customerById.get(next.customerId)
            setDraft(enrichCustomerFields(next, customer))
          }}
          onSave={handleSave}
          onClose={closeEditor}
        />
      ) : null}

      {saving ? (
        <p className="fixed bottom-4 right-4 rounded-md bg-surface px-3 py-2 text-sm shadow-lg">
          Saving…
        </p>
      ) : null}
    </div>
  )
}
