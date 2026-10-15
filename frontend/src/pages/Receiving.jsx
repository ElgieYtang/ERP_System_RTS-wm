import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TABLE_ACTIONS_CELL_CLASS, TABLE_ACTIONS_HEAD_CLASS, TableActions } from '@/components/ui/action-menu'
import { Pagination } from '@/components/ui/pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableLink,
  TableRow,
} from '@/components/ui/table'
import { ReceivingDetailModal } from '@/components/receiving/ReceivingDetailModal'
import { ReceivingFiltersBar } from '@/components/receiving/ReceivingFiltersBar'
import { EmptyState } from '@/components/ui/table-filters'
import { useToast } from '@/context/ToastContext'
import { useTransactions } from '@/context/TransactionContext'
import { filterByDateRange } from '@/lib/dateFilter'
import { findReceivingForPo } from '@/lib/receiving'
import { getStatusDisplay } from '@/lib/status'
import { paginateItems } from '@/lib/quotations'
import { useEffect, useMemo, useState } from 'react'

const PAGE_SIZE = 10
import { useNavigate, useSearchParams } from 'react-router-dom'

export function ReceivingPage() {
  const { showToast } = useToast()
  const {
    receivings,
    purchaseOrders,
    loading,
    createReceiving,
    confirmReceiving,
  } = useTransactions()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const poFromUrl = searchParams.get('po')
  const receivingFromUrl = searchParams.get('receiving')
  const [filters, setFilters] = useState({
    search: '',
    dateFrom: '',
    dateTo: '',
    status: 'all',
  })
  const [viewId, setViewId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    let list = receivings
    const q = filters.search.toLowerCase()
    if (q) {
      list = list.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          (r.purchaseOrderId ?? '').toLowerCase().includes(q) ||
          (r.supplierName ?? '').toLowerCase().includes(q),
      )
    }
    if (filters.status !== 'all') {
      list = list.filter((r) => r.status === filters.status)
    }
    list = filterByDateRange(list, filters.dateFrom, filters.dateTo, 'date')
    return list
  }, [receivings, filters])

  const pagination = useMemo(
    () => paginateItems(filtered, page, PAGE_SIZE),
    [filtered, page],
  )

  useEffect(() => {
    setPage(1)
  }, [filters])

  const viewRec = viewId ? receivings.find((r) => r.id === viewId) : null
  const linkedPo = poFromUrl ? purchaseOrders.find((p) => p.id === poFromUrl) : null
  const existingReceivingForPo = useMemo(
    () => findReceivingForPo(receivings, linkedPo),
    [receivings, linkedPo],
  )

  useEffect(() => {
    if (receivingFromUrl) {
      setViewId(receivingFromUrl)
      return
    }
    if (poFromUrl && existingReceivingForPo) {
      setViewId(existingReceivingForPo.id)
    }
  }, [poFromUrl, receivingFromUrl, existingReceivingForPo])

  const handleConfirm = async (recId) => {
    const rec = receivings.find((r) => r.id === recId)
    if (!rec) return
    if (rec.status === 'completed') {
      showToast('info', 'Receiving already completed.')
      return
    }

    setBusy(true)
    try {
      await confirmReceiving(recId)
      showToast('success', 'Receiving completed successfully. Inventory has been updated.')
    } catch (caught) {
      showToast('error', caught?.message ?? 'Could not confirm receiving.')
    } finally {
      setBusy(false)
    }
  }

  const handleCreateFromPo = async () => {
    if (!linkedPo) return
    if (existingReceivingForPo) {
      setViewId(existingReceivingForPo.id)
      return
    }
    setBusy(true)
    try {
      const created = await createReceiving(linkedPo.id)
      showToast('success', `Receiving ${created?.id ?? ''} created.`)
      if (created?.id) setViewId(created.id)
    } catch (caught) {
      showToast('error', caught?.message ?? 'Could not create receiving.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Receiving"
        description="Incoming goods from supplier POs. Posts to inventory (in)."
        breadcrumbs={['Transaction', 'Receiving']}
      />

      {loading ? (
        <p className="mb-4 text-sm text-text-secondary">Loading receivings…</p>
      ) : null}

      {linkedPo ? (
        <div className="mb-4 rounded-lg border border-maroon/30 bg-maroon-light p-4 text-sm">
          <strong>PO selected:</strong> {linkedPo.id} —{' '}
          {linkedPo.items.map((item) => item.productName).join(', ')}
          {existingReceivingForPo ? (
            <>
              <span className="ml-4 text-text-secondary">
                Receiving {existingReceivingForPo.id} (
                {existingReceivingForPo.status === 'completed' ? 'completed' : 'pending'}).
              </span>
              <Button
                size="sm"
                variant="secondary"
                className="ml-4"
                onClick={() => setViewId(existingReceivingForPo.id)}
              >
                {existingReceivingForPo.status === 'completed'
                  ? 'View Receiving'
                  : 'Continue Receiving'}
              </Button>
            </>
          ) : (
            <Button size="sm" className="ml-4" onClick={handleCreateFromPo} disabled={busy}>
              {busy ? 'Creating…' : 'New Receiving'}
            </Button>
          )}
        </div>
      ) : null}

      <ReceivingFiltersBar filters={filters} onChange={setFilters} />

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Receiving No.</TableHead>
            <TableHead>Purchase Order</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className={TABLE_ACTIONS_HEAD_CLASS}>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={6}>
                <EmptyState />
              </TableCell>
            </TableRow>
          ) : (
            pagination.items.map((r) => {
              const st = getStatusDisplay(r.status)
              return (
                <TableRow key={r.id}>
                  <TableCell>
                    <TableLink onClick={() => setViewId(r.id)}>{r.id}</TableLink>
                  </TableCell>
                  <TableCell>{r.purchaseOrderId}</TableCell>
                  <TableCell>{r.supplierName}</TableCell>
                  <TableCell>{r.displayDate ?? r.date}</TableCell>
                  <TableCell>
                    <Badge variant={st.variant}>{st.label}</Badge>
                  </TableCell>
                  <TableCell className={TABLE_ACTIONS_CELL_CLASS}>
                    <TableActions onPrint={() => window.print()} />
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
      </div>

      {pagination.totalPages > 1 ? (
        <div className="mt-4 flex justify-center">
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
          />
        </div>
      ) : null}

      <ReceivingDetailModal
        receiving={viewRec}
        busy={busy}
        onClose={() => setViewId(null)}
        onConfirm={() => viewRec && handleConfirm(viewRec.id)}
        onCreateOutslip={() => {
          if (!viewRec) return
          setViewId(null)
          navigate(`/outslip?receiving=${encodeURIComponent(viewRec.id)}`)
        }}
      />
    </div>
  )
}
