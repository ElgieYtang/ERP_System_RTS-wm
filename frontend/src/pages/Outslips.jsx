import { CreateOutslipFromReceivingDialog } from '@/components/outslips/CreateOutslipFromReceivingDialog'
import { DispatchConfirmDialog } from '@/components/outslips/DispatchConfirmDialog'
import { OutslipDetailModal } from '@/components/outslips/OutslipDetailModal'
import { ModuleStatusFilters } from '@/components/transactions/ModuleStatusFilters'
import { PageHeader } from '@/components/layout/PageHeader'
import { TABLE_ACTIONS_CELL_CLASS, TABLE_ACTIONS_HEAD_CLASS, TableActions } from '@/components/ui/action-menu'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Pagination } from '@/components/ui/pagination'
import { ResponsiveTable } from '@/components/ui/responsive-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableLink,
  TableRow,
} from '@/components/ui/table'
import { EmptyState, TableFilters } from '@/components/ui/table-filters'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { useTransactions } from '@/context/TransactionContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useSetupResource } from '@/hooks/useSetupResource'
import { filterByDateRange } from '@/lib/dateFilter'
import { formatCurrency } from '@/lib/format'
import { canPrintGatePass } from '@/lib/gatePass'
import { getStatusDisplay } from '@/lib/status'
import {
  canApproveOutslipForUser,
  canCreateDrFromOutslip,
  canDispatchOutslipForUser,
  findDrForOutslip,
} from '@/lib/transactionRules'
import { paginateItems } from '@/lib/quotations'
import { useMemo, useState, useEffect } from 'react'

const PAGE_SIZE = 10
import { useNavigate, useSearchParams } from 'react-router-dom'

const STATUS_ORDER = ['pending', 'approved', 'for_dispatch', 'released']

function receivingKey(receiving) {
  return receiving?.dbId?.toString() ?? receiving?.id?.toString() ?? ''
}

function outslipUsesReceiving(outslip, receiving) {
  const key = receivingKey(receiving)
  return key !== '' && outslip.receivingId?.toString() === key
}

export function OutslipsPage() {
  const { showToast } = useToast()
  const { user } = useAuth()
  const {
    outslips,
    receivings,
    deliveryReceipts,
    loading,
    createOutslip,
    submitOutslip,
    approveOutslip,
    forDispatchOutslip,
    createDeliveryFromOutslip,
  } = useTransactions()
  const { rows: customers } = useSetupResource('customers')
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [searchParams] = useSearchParams()
  const receivingFromUrl = searchParams.get('receiving')

  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [statusTab, setStatusTab] = useState('all')
  const [viewId, setViewId] = useState(null)
  const [dispatchId, setDispatchId] = useState(null)
  const [createDrId, setCreateDrId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [createOpen, setCreateOpen] = useState(Boolean(receivingFromUrl))
  const [createForm, setCreateForm] = useState({
    customerId: '',
    receivingId: receivingFromUrl ?? '',
  })
  const [page, setPage] = useState(1)

  const linkedReceiving = createForm.receivingId
    ? receivings.find(
        (r) => r.id === createForm.receivingId || r.dbId === String(createForm.receivingId),
      )
    : null

  const counts = useMemo(
    () => ({
      pending: outslips.filter((o) => o.status === 'pending').length,
      approved: outslips.filter((o) => o.status === 'approved').length,
      for_dispatch: outslips.filter((o) => o.status === 'for_dispatch' || o.status === 'released')
        .length,
      all: outslips.length,
    }),
    [outslips],
  )

  const filtered = useMemo(() => {
    let list = [...outslips]
    const q = search.toLowerCase()
    if (q) {
      list = list.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          (o.customerName ?? '').toLowerCase().includes(q),
      )
    }
    if (statusTab !== 'all') {
      if (statusTab === 'for_dispatch') {
        list = list.filter((o) => o.status === 'for_dispatch' || o.status === 'released')
      } else {
        list = list.filter((o) => o.status === statusTab)
      }
    }
    list = filterByDateRange(list, dateFrom, dateTo, 'date')
    list.sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))
    return list
  }, [outslips, search, statusTab, dateFrom, dateTo])

  const pagination = useMemo(
    () => paginateItems(filtered, page, PAGE_SIZE),
    [filtered, page],
  )

  useEffect(() => {
    setPage(1)
  }, [search, statusTab, dateFrom, dateTo])

  useEffect(() => {
    if (page > pagination.totalPages) setPage(Math.max(1, pagination.totalPages))
  }, [page, pagination.totalPages])

  const viewOs = viewId ? outslips.find((o) => o.id === viewId) : null
  const completedReceivings = useMemo(
    () =>
      receivings.filter(
        (r) =>
          r.status === 'completed' &&
          r.customerId &&
          !outslips.some((o) => outslipUsesReceiving(o, r)),
      ),
    [receivings, outslips],
  )
  const linkedCustomerName = linkedReceiving
    ? linkedReceiving.customerName ||
      customers.find((c) => c.id === linkedReceiving.customerId)?.name ||
      'Customer'
    : ''

  useEffect(() => {
    if (!createOpen || !createForm.receivingId) return
    const receiving = receivings.find(
      (r) => r.id === createForm.receivingId || r.dbId === String(createForm.receivingId),
    )
    if (receiving?.customerId && createForm.customerId !== receiving.customerId) {
      setCreateForm((prev) => ({ ...prev, customerId: receiving.customerId }))
    }
  }, [createOpen, createForm.receivingId, createForm.customerId, receivings])

  const handleReceivingChange = (receivingId) => {
    const receiving = receivings.find(
      (r) => r.id === receivingId || r.dbId === String(receivingId),
    )
    setCreateForm({
      receivingId,
      customerId: receiving?.customerId ?? '',
    })
  }

  const openDetail = (id) => {
    if (isMobile) navigate(`/outslip/${id}`)
    else setViewId(id)
  }

  const handleCreate = async (asDraft = false) => {
    if (!createForm.receivingId) {
      showToast('error', 'Select a completed receiving to create an outslip.')
      return
    }
    if (!linkedReceiving?.customerId) {
      showToast(
        'error',
        'This receiving has no quotation customer. Outslip cannot be created.',
      )
      return
    }

    setBusy(true)
    try {
      const created = await createOutslip({
        customerId: linkedReceiving.customerId,
        receivingId: linkedReceiving.dbId ?? createForm.receivingId,
        asDraft,
      })
      showToast(
        'success',
        asDraft
          ? `Draft outslip ${created?.id ?? ''} saved.`
          : `Outslip ${created?.id ?? ''} submitted for approval.`,
      )
      setCreateOpen(false)
      setCreateForm({ customerId: '', receivingId: '' })
      if (created?.id) setViewId(created.id)
    } catch (caught) {
      showToast('error', caught?.message ?? 'Could not create outslip.')
    } finally {
      setBusy(false)
    }
  }

  const handleApprove = async (id) => {
    setBusy(true)
    try {
      await approveOutslip(id)
      showToast('success', 'Outslip approved.')
    } catch (caught) {
      showToast('error', caught?.message ?? 'Could not approve outslip.')
    } finally {
      setBusy(false)
    }
  }

  const handleDispatch = async (id) => {
    setBusy(true)
    try {
      await forDispatchOutslip(id)
      showToast('success', 'Outslip marked for dispatch. Inventory has been updated.')
      setDispatchId(null)
    } catch (caught) {
      showToast('error', caught?.message ?? 'Could not mark for dispatch.')
    } finally {
      setBusy(false)
    }
  }

  const handleCreateDR = async (osId) => {
    setBusy(true)
    try {
      const drId = await createDeliveryFromOutslip(osId)
      showToast('success', 'Delivery Receipt created successfully.')
      setCreateDrId(null)
      if (drId) navigate(`/delivery-receipt/${drId}`)
    } catch (caught) {
      showToast('error', caught?.message ?? 'Could not create delivery receipt.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Outslip"
        description="Outgoing stock to customers. Posts inventory OUT on dispatch."
        breadcrumbs={['Transaction', 'Outslip']}
        action={
          <Button
            onClick={() => {
              setCreateForm({
                customerId: '',
                receivingId: receivingFromUrl ?? '',
              })
              setCreateOpen(true)
            }}
          >
            New Outslip
          </Button>
        }
      />

      {loading ? (
        <p className="mb-4 text-sm text-text-secondary">Loading outslips…</p>
      ) : null}

      <ModuleStatusFilters
        active={statusTab}
        onChange={setStatusTab}
        tabs={[
          { key: 'all', label: 'All', count: counts.all },
          { key: 'pending', label: 'Pending', count: counts.pending },
          { key: 'approved', label: 'Approved', count: counts.approved },
          { key: 'for_dispatch', label: 'For Dispatch', count: counts.for_dispatch },
        ]}
      />

      <TableFilters
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search outslips..."
        showDateRange
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
      />

      <ResponsiveTable
        emptyMessage="No outslips found."
        mobileItems={pagination.items.map((o) => {
          const st = getStatusDisplay(o.status === 'released' ? 'for_dispatch' : o.status)
          const itemCount = (o.items ?? []).reduce((s, i) => s + i.quantity, 0)
          return {
            id: o.id,
            title: o.id,
            subtitle: o.customerName || o.customerId,
            badge: { label: st.label, variant: st.variant },
            fields: [
              { label: 'Date', value: o.displayDate || o.date },
              { label: 'Items', value: `${itemCount} units` },
            ],
            onClick: () => openDetail(o.id),
          }
        })}
        desktop={
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Outslip No.</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className={TABLE_ACTIONS_HEAD_CLASS}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagination.items.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7}>
                    <EmptyState />
                  </TableCell>
                </TableRow>
              ) : (
                pagination.items.map((o) => {
                  const st = getStatusDisplay(o.status === 'released' ? 'for_dispatch' : o.status)
                  const itemCount = (o.items ?? []).reduce((s, i) => s + i.quantity, 0)
                  return (
                    <TableRow key={o.id}>
                      <TableCell>
                        <TableLink onClick={() => openDetail(o.id)}>{o.id}</TableLink>
                      </TableCell>
                      <TableCell>{o.receivingId ? `RCV #${o.receivingId}` : '—'}</TableCell>
                      <TableCell>{o.customerName || o.customerId}</TableCell>
                      <TableCell>{o.displayDate || o.date}</TableCell>
                      <TableCell>{itemCount} items</TableCell>
                      <TableCell>
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </TableCell>
                      <TableCell className={TABLE_ACTIONS_CELL_CLASS}>
                        <TableActions
                          onPrint={
                            canPrintGatePass(o.status)
                              ? () => navigate(`/outslip/${o.id}/gate-pass/preview`)
                              : undefined
                          }
                        />
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        }
      />

      {pagination.totalPages > 1 ? (
        <div className="mt-4 flex justify-center">
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
          />
        </div>
      ) : null}

      <CreateOutslipFromReceivingDialog
        open={createOpen}
        busy={busy}
        receivings={completedReceivings}
        selectedReceivingId={createForm.receivingId}
        linkedReceiving={linkedReceiving}
        linkedCustomerName={linkedCustomerName}
        onReceivingChange={handleReceivingChange}
        onConfirm={() => handleCreate(false)}
        onSaveDraft={() => handleCreate(true)}
        onClose={() => setCreateOpen(false)}
      />

      {viewOs ? (
        <OutslipDetailModal
          outslip={viewOs}
          busy={busy}
          canApprove={canApproveOutslipForUser(viewOs, user)}
          canDispatch={canDispatchOutslipForUser(viewOs, user)}
          canCreateDr={canCreateDrFromOutslip(viewOs, deliveryReceipts)}
          drForOutslip={findDrForOutslip(viewOs, deliveryReceipts)}
          canGatePass={canPrintGatePass(viewOs.status)}
          onClose={() => setViewId(null)}
          onApprove={() => handleApprove(viewOs.id)}
          onDispatch={() => setDispatchId(viewOs.id)}
          onCreateDr={() => setCreateDrId(viewOs.id)}
          onViewDr={() => {
            const dr = findDrForOutslip(viewOs, deliveryReceipts)
            setViewId(null)
            if (dr) navigate(`/delivery-receipt/${dr.id}`)
          }}
          onGatePass={() => {
            setViewId(null)
            navigate(`/outslip/${viewOs.id}/gate-pass/preview`)
          }}
          canSubmit={viewOs.status === 'draft'}
          onSubmit={async () => {
            setBusy(true)
            try {
              await submitOutslip(viewOs.id)
              showToast('success', 'Outslip submitted for approval.')
            } catch (caught) {
              showToast('error', caught?.message ?? 'Could not submit outslip.')
            } finally {
              setBusy(false)
            }
          }}
        />
      ) : null}

      <DispatchConfirmDialog
        open={!!dispatchId}
        onCancel={() => setDispatchId(null)}
        onConfirm={() => {
          if (dispatchId) handleDispatch(dispatchId)
        }}
      />

      <ConfirmDialog
        open={!!createDrId}
        onClose={() => setCreateDrId(null)}
        title="Create delivery receipt?"
        message="Create a delivery receipt from this outslip?"
        confirmLabel="Create DR"
        onConfirm={() => {
          if (createDrId) handleCreateDR(createDrId)
        }}
      />
    </div>
  )
}
