import { PurchaseOrderDetailModal } from '@/components/purchase-orders/PurchaseOrderDetailModal'
import { PurchaseOrderFiltersBar } from '@/components/purchase-orders/PurchaseOrderFiltersBar'
import { PurchaseOrderTable } from '@/components/purchase-orders/PurchaseOrderTable'
import { PageHeader } from '@/components/layout/PageHeader'
import { Pagination } from '@/components/ui/pagination'
import { useToast } from '@/context/ToastContext'
import { useTransactions } from '@/context/TransactionContext'
import { useSetupSuppliers } from '@/hooks/useSetupSuppliers'
import { useIsMobile } from '@/hooks/useIsMobile'
import {
  apiPurchaseOrderToView,
  filterPurchaseOrders,
  sortPurchaseOrders,
} from '@/lib/purchaseOrderViewModel'
import { paginateItems } from '@/lib/quotations'
import { findReceivingForPo } from '@/lib/receiving'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const PAGE_SIZE = 10
const defaultFilters = { status: 'all', search: '', dateFrom: '', dateTo: '' }

export function PurchaseOrdersPage() {
  const { showToast } = useToast()
  const { purchaseOrders, receivings, loading, createReceiving, deletePurchaseOrder } =
    useTransactions()
  const [deleteBusy, setDeleteBusy] = useState(false)
  const { suppliers } = useSetupSuppliers()
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const supplierById = useMemo(() => {
    const map = new Map()
    suppliers.forEach((row) => map.set(row.id, row))
    return map
  }, [suppliers])

  const viewOrders = useMemo(
    () =>
      purchaseOrders.map((po) =>
        apiPurchaseOrderToView(po, supplierById.get(String(po.supplierId ?? ''))),
      ),
    [purchaseOrders, supplierById],
  )

  const [filters, setFilters] = useState(defaultFilters)
  const [sortField, setSortField] = useState('date')
  const [sortDirection, setSortDirection] = useState('desc')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState(null)
  const [detailId, setDetailId] = useState(null)

  const statusCounts = useMemo(() => {
    const counts = { all: viewOrders.length, approved: 0, completed: 0 }
    viewOrders.forEach((row) => {
      if (row.status === 'approved') counts.approved += 1
      if (row.status === 'completed') counts.completed += 1
    })
    return counts
  }, [viewOrders])

  const filtered = useMemo(() => {
    const list = filterPurchaseOrders(viewOrders, filters)
    return sortPurchaseOrders(list, sortField, sortDirection)
  }, [viewOrders, filters, sortField, sortDirection])

  const pagination = useMemo(
    () => paginateItems(filtered, page, PAGE_SIZE),
    [filtered, page],
  )

  const detailOrder = useMemo(
    () => (detailId ? viewOrders.find((row) => row.id === detailId) ?? null : null),
    [detailId, viewOrders],
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

  function openDetail(order) {
    if (isMobile) {
      navigate(`/purchase-order/${order.poNo}`)
      return
    }
    setSelectedId(order.id)
    setDetailId(order.id)
  }

  function closeDetail() {
    setDetailId(null)
  }

  async function handleDeletePo(order) {
    if (!window.confirm(`Delete purchase order ${order.poNo}? This cannot be undone.`)) return
    setDeleteBusy(true)
    try {
      await deletePurchaseOrder(order.poNo)
      showToast('success', 'Purchase order deleted.')
      closeDetail()
    } catch (caught) {
      showToast('error', caught?.message ?? 'Could not delete purchase order.')
    } finally {
      setDeleteBusy(false)
    }
  }

  function handlePrint(order) {
    navigate(`/purchase-order/${order.poNo}/preview`)
    setTimeout(() => window.print(), 300)
  }

  async function handleReceive(order) {
    const po = purchaseOrders.find((p) => p.id === order.poNo)
    if (po?.status === 'fully_received') {
      showToast('info', 'All items have been received.')
      return
    }
    const existing = findReceivingForPo(receivings, po)
    if (existing) {
      navigate(`/inventory/receiving?po=${order.poNo}&receiving=${encodeURIComponent(existing.id)}`)
      return
    }
    try {
      await createReceiving(order.poNo)
      showToast('success', 'Receiving created.')
      navigate(`/inventory/receiving?po=${order.poNo}`)
    } catch (caught) {
      showToast('error', caught?.message ?? 'Could not create receiving.')
    }
  }

  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        description="Supplier purchase orders linked to approved quotations."
        breadcrumbs={['Transaction', 'Purchase Orders']}
      />

      {loading ? <p className="mb-4 text-sm text-text-secondary">Loading purchase orders…</p> : null}

      <PurchaseOrderFiltersBar filters={filters} counts={statusCounts} onChange={setFilters} />

      <PurchaseOrderTable
        orders={pagination.items}
        selectedId={selectedId}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
        onSelect={openDetail}
        onPrint={handlePrint}
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

      {detailOrder ? (
        <PurchaseOrderDetailModal
          order={detailOrder}
          onClose={closeDetail}
          onOpenReceiving={handleReceive}
          onDelete={handleDeletePo}
          deleteBusy={deleteBusy}
        />
      ) : null}
    </div>
  )
}
