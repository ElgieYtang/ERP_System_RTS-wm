import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DateRangeFilter } from '@/components/ui/table-filters'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/context/ToastContext'
import { useSetupResource } from '@/hooks/useSetupResource'
import { formatCurrency } from '@/lib/format'
import { fetchCustomerLedger } from '@/lib/reportsApi'
import { Printer } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

export function CustomerLedgerPage() {
  const { showToast } = useToast()
  const { rows: customers, loading: customersLoading } = useSetupResource('customers')
  const [customerId, setCustomerId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [account, setAccount] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!customerId && customers[0]?.id) {
      setCustomerId(String(customers[0].id))
    }
  }, [customers, customerId])

  const loadLedger = useCallback(async () => {
    if (!customerId) return
    setLoading(true)
    try {
      const data = await fetchCustomerLedger({
        customerId,
        from: dateFrom || undefined,
        to: dateTo || undefined,
      })
      setAccount(data)
    } catch (caught) {
      showToast('error', caught?.message ?? 'Could not load customer ledger.')
      setAccount(null)
    } finally {
      setLoading(false)
    }
  }, [customerId, dateFrom, dateTo, showToast])

  useEffect(() => {
    if (customerId) loadLedger()
  }, [customerId, loadLedger])

  const totals = account?.totals ?? { totalDebit: 0, totalCredit: 0, outstanding: 0 }
  const rows = account?.rows ?? []

  return (
    <div>
      <PageHeader
        title="Customer Ledger"
        description="Running account per customer — charges, payments, and balance."
        action={
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Customer</label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="h-9 min-w-[220px] rounded-md border border-border-input bg-surface px-3 text-sm"
            disabled={customersLoading}
          >
            <option value="">Select customer…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <DateRangeFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
        />
      </div>

      <Card className="mb-6">
        <CardContent className="pt-4">
          <p className="text-sm text-text-secondary">Account for</p>
          <p className="mt-1 font-semibold">{account?.customerName ?? '—'}</p>
        </CardContent>
      </Card>

      {loading ? <p className="mb-4 text-sm text-text-secondary">Loading ledger…</p> : null}

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Date</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Debit</TableHead>
            <TableHead>Credit</TableHead>
            <TableHead>Balance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={6} className="text-text-secondary">
                No ledger activity for this customer.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, index) => (
              <TableRow key={`${row.ref}-${index}`}>
                <TableCell>{row.date}</TableCell>
                <TableCell>{row.ref}</TableCell>
                <TableCell>{row.description}</TableCell>
                <TableCell>{row.debit ? formatCurrency(row.debit) : '—'}</TableCell>
                <TableCell>{row.credit ? formatCurrency(row.credit) : '—'}</TableCell>
                <TableCell>{formatCurrency(row.balance)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-text-secondary">Total Charges</p>
            <p className="text-xl font-semibold">{formatCurrency(totals.totalDebit)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-text-secondary">Total Payments</p>
            <p className="text-xl font-semibold">{formatCurrency(totals.totalCredit)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-text-secondary">Outstanding Balance</p>
            <p className="text-xl font-semibold text-maroon">
              {formatCurrency(totals.outstanding)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
