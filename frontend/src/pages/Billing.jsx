import { PageHeader } from '@/components/layout/PageHeader'
import { ModuleStatusFilters } from '@/components/transactions/ModuleStatusFilters'
import { TABLE_ACTIONS_CELL_CLASS, TABLE_ACTIONS_HEAD_CLASS, TableActions } from '@/components/ui/action-menu'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FormField, Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
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
import { useTransactions } from '@/context/TransactionContext'
import { filterByDateRange } from '@/lib/dateFilter'
import { formatCurrency } from '@/lib/format'
import { getStatusDisplay } from '@/lib/status'
import { Pagination } from '@/components/ui/pagination'
import { paginateItems } from '@/lib/quotations'
import { useEffect, useMemo, useState } from 'react'

const PAGE_SIZE = 10

export function BillingPage() {
  const { showToast } = useToast()
  const { billingStatements, loading, recordPayment } = useTransactions()
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [paymentId, setPaymentId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [page, setPage] = useState(1)
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    reference: '',
    remarks: '',
  })

  const filtered = useMemo(() => {
    let list = billingStatements
    const q = search.toLowerCase()
    if (q) {
      list = list.filter(
        (b) =>
          b.id.toLowerCase().includes(q) ||
          (b.customerName ?? '').toLowerCase().includes(q) ||
          (b.referenceDrId ?? '').toLowerCase().includes(q),
      )
    }
    if (statusFilter !== 'all') {
      list = list.filter((b) => b.paymentStatus === statusFilter)
    }
    list = filterByDateRange(list, dateFrom, dateTo, 'billingDate')
    return list
  }, [billingStatements, search, statusFilter, dateFrom, dateTo])

  const pagination = useMemo(
    () => paginateItems(filtered, page, PAGE_SIZE),
    [filtered, page],
  )

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, dateFrom, dateTo])

  const paymentBill = paymentId
    ? billingStatements.find((b) => b.id === paymentId)
    : null

  const savePayment = async () => {
    if (!paymentId || !paymentForm.amount) return
    setBusy(true)
    try {
      await recordPayment(
        paymentId,
        Number(paymentForm.amount),
        paymentForm.date,
        paymentForm.reference || undefined,
        paymentForm.remarks || undefined,
      )
      showToast('success', 'Payment recorded successfully.')
      setPaymentId(null)
      setPaymentForm({
        amount: '',
        date: new Date().toISOString().slice(0, 10),
        reference: '',
        remarks: '',
      })
    } catch (caught) {
      showToast('error', caught?.message ?? 'Could not record payment.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader title="Billing" description="Generate and manage billing records." />

      {loading ? (
        <p className="mb-4 text-sm text-text-secondary">Loading billing…</p>
      ) : null}

      <ModuleStatusFilters
        active={statusFilter}
        onChange={setStatusFilter}
        tabs={[
          { key: 'all', label: 'All', count: billingStatements.length },
          {
            key: 'unpaid',
            label: 'Unpaid',
            count: billingStatements.filter((b) => b.paymentStatus === 'unpaid').length,
          },
          {
            key: 'partially_paid',
            label: 'Partially Paid',
            count: billingStatements.filter((b) => b.paymentStatus === 'partially_paid').length,
          },
          {
            key: 'paid',
            label: 'Paid',
            count: billingStatements.filter((b) => b.paymentStatus === 'paid').length,
          },
        ]}
      />

      <TableFilters
        search={search}
        onSearchChange={setSearch}
        showDateRange
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
      />

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>BS No.</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>Billing Date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Payment Status</TableHead>
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
            pagination.items.map((b) => {
              const st = getStatusDisplay(b.paymentStatus)
              const balance = b.amount - (b.paidAmount ?? 0)
              return (
                <TableRow key={b.id}>
                  <TableCell>
                    <TableLink onClick={() => setPaymentId(b.paymentStatus === 'paid' ? null : b.id)}>
                      {b.id}
                    </TableLink>
                  </TableCell>
                  <TableCell>{b.customerName || b.customerId}</TableCell>
                  <TableCell>{b.referenceDrId ?? '—'}</TableCell>
                  <TableCell>{b.displayDate || b.billingDate}</TableCell>
                  <TableCell>
                    {formatCurrency(b.amount)}
                    {b.paymentStatus === 'partially_paid' ? (
                      <span className="text-xs text-text-secondary">
                        {' '}
                        (Bal: {formatCurrency(balance)})
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge variant={st.variant}>{st.label}</Badge>
                  </TableCell>
                  <TableCell className={TABLE_ACTIONS_CELL_CLASS}>
                    <div className="flex items-center justify-center gap-2">
                      {b.paymentStatus !== 'paid' ? (
                        <Button size="sm" variant="secondary" onClick={() => setPaymentId(b.id)}>
                          Pay
                        </Button>
                      ) : null}
                      <TableActions onPrint={() => window.print()} />
                    </div>
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

      <Modal open={!!paymentBill} onClose={() => setPaymentId(null)} title="Record Payment" size="md">
        {paymentBill ? (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              {paymentBill.id} — Balance:{' '}
              {formatCurrency(paymentBill.amount - (paymentBill.paidAmount ?? 0))}
            </p>
            <FormField label="Amount">
              <Input
                type="number"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              />
            </FormField>
            <FormField label="Payment Date">
              <Input
                type="date"
                value={paymentForm.date}
                onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
              />
            </FormField>
            <FormField label="Reference">
              <Input
                value={paymentForm.reference}
                onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
              />
            </FormField>
            <FormField label="Remarks">
              <Input
                value={paymentForm.remarks}
                onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
              />
            </FormField>
            <Button disabled={busy} onClick={savePayment}>
              {busy ? 'Saving…' : 'Save Payment'}
            </Button>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
