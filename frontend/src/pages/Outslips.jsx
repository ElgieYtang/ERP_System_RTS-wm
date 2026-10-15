import { ModuleStatusFilters } from '@/components/transactions/ModuleStatusFilters'
import { PageHeader } from '@/components/layout/PageHeader'
import { TABLE_ACTIONS_CELL_CLASS, TABLE_ACTIONS_HEAD_CLASS, TableActions } from '@/components/ui/action-menu'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FormField } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
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
import { useDemo } from '@/context/DemoContext'
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
import { useMemo, useState, useEffect } from 'react'
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
  const { showToast } = useDemo()
  const { user } = useAuth()
  const {
    outslips,
    receivings,
    deliveryReceipts,
    loading,
    createOutslip,
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

  const handleCreate = async () => {
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
      })
      showToast('success', `Outslip ${created?.id ?? ''} created.`)
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
        mobileItems={filtered.map((o) => {
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
              {filtered.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7}>
                    <EmptyState />
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((o) => {
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

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Outslip" size="lg">
        <div className="space-y-4">
          {completedReceivings.length === 0 ? (
            <p className="text-sm text-text-secondary">
              No completed receivings with a linked quotation customer are available for a new
              outslip.
            </p>
          ) : (
            <>
              <FormField label="From Receiving (completed)">
                <select
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                  value={
                    linkedReceiving?.dbId ??
                    linkedReceiving?.id ??
                    createForm.receivingId
                  }
                  onChange={(e) => handleReceivingChange(e.target.value)}
                >
                  <option value="">Select receiving…</option>
                  {completedReceivings.map((r) => (
                    <option key={r.id} value={r.dbId ?? r.id}>
                      {r.id} — {r.supplierName || 'Receiving'}
                    </option>
                  ))}
                </select>
              </FormField>

              {linkedReceiving ? (
                <div className="space-y-4 rounded-lg border border-border bg-page/60 p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
                        Customer
                      </p>
                      <p className="mt-1 font-medium text-text-primary">{linkedCustomerName}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
                        Receiving
                      </p>
                      <p className="mt-1 font-medium text-text-primary">{linkedReceiving.id}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
                        Purchase Order
                      </p>
                      <p className="mt-1 text-text-primary">
                        {linkedReceiving.purchaseOrderId || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
                        Supplier
                      </p>
                      <p className="mt-1 text-text-primary">
                        {linkedReceiving.supplierName || '—'}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-text-secondary">
                    Customer is set from the quotation linked to this receiving.
                  </p>

                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-secondary">
                      Items to release
                    </p>
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Item</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Unit Price</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(linkedReceiving.items ?? []).length === 0 ? (
                          <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={3} className="text-text-secondary">
                              No items found.
                            </TableCell>
                          </TableRow>
                        ) : (
                          (linkedReceiving.items ?? []).map((item) => (
                            <TableRow key={`${item.productId}-${item.productName}`}>
                              <TableCell>{item.productName}</TableCell>
                              <TableCell>{item.quantity ?? item.received ?? '—'}</TableCell>
                              <TableCell>
                                {item.unitPrice != null ? formatCurrency(item.unitPrice) : '—'}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-border bg-page/40 px-4 py-6 text-center text-sm text-text-secondary">
                  Select a completed receiving to preview customer and items.
                </p>
              )}

              <div className="flex justify-end border-t border-border pt-4">
                <Button disabled={busy || !linkedReceiving?.customerId} onClick={handleCreate}>
                  {busy ? 'Creating…' : 'Create Outslip'}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      <Modal open={!!viewOs} onClose={() => setViewId(null)} title="Outslip Details" size="lg">
        {viewOs ? (
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
                  Outslip No.
                </p>
                <p className="text-lg font-semibold text-text-primary">{viewOs.id}</p>
              </div>
              <Badge variant={getStatusDisplay(viewOs.status).variant}>
                {getStatusDisplay(viewOs.status).label}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-page/60 p-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
                  Customer
                </p>
                <p className="mt-1 font-medium">{viewOs.customerName || viewOs.customerId}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
                  Reference
                </p>
                <p className="mt-1">{viewOs.receivingId ? `RCV #${viewOs.receivingId}` : '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
                  Date
                </p>
                <p className="mt-1">{viewOs.displayDate ?? viewOs.date ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
                  Items
                </p>
                <p className="mt-1">
                  {(viewOs.items ?? []).reduce((sum, item) => sum + Number(item.quantity ?? 0), 0)}{' '}
                  units
                </p>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Item</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(viewOs.items ?? []).map((item) => (
                  <TableRow key={item.productId}>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>
                      {item.unitPrice != null ? formatCurrency(item.unitPrice) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex flex-col gap-3 border-t border-border pt-4">
              {canApproveOutslipForUser(viewOs, user) ? (
                <Button disabled={busy} onClick={() => handleApprove(viewOs.id)}>
                  Approve
                </Button>
              ) : null}
              {canDispatchOutslipForUser(viewOs, user) ? (
                <Button disabled={busy} onClick={() => setDispatchId(viewOs.id)}>
                  For Dispatch
                </Button>
              ) : null}
              {canCreateDrFromOutslip(viewOs, deliveryReceipts) ? (
                <Button disabled={busy} onClick={() => setCreateDrId(viewOs.id)}>
                  Create Delivery Receipt
                </Button>
              ) : null}
              {findDrForOutslip(viewOs, deliveryReceipts) ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    const dr = findDrForOutslip(viewOs, deliveryReceipts)
                    setViewId(null)
                    navigate(`/delivery-receipt/${dr.id}`)
                  }}
                >
                  View Delivery Receipt
                </Button>
              ) : null}
              {canPrintGatePass(viewOs.status) ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setViewId(null)
                    navigate(`/outslip/${viewOs.id}/gate-pass/preview`)
                  }}
                >
                  Print Gate Pass
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={!!dispatchId}
        onClose={() => setDispatchId(null)}
        title="For Dispatch"
        message="Mark this outslip ready for dispatch? Inventory will be updated."
        confirmLabel="Confirm"
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
