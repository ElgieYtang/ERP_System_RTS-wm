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
import { fetchSupplierLedger } from '@/lib/reportsApi'
import { Printer } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

export function SupplierLedgerPage() {
  const { showToast } = useToast()
  const { rows: suppliers, loading: suppliersLoading } = useSetupResource('suppliers')
  const [supplierId, setSupplierId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [account, setAccount] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!supplierId && suppliers[0]?.id) {
      setSupplierId(String(suppliers[0].id))
    }
  }, [suppliers, supplierId])

  const loadLedger = useCallback(async () => {
    if (!supplierId) return
    setLoading(true)
    try {
      const data = await fetchSupplierLedger({
        supplierId,
        from: dateFrom || undefined,
        to: dateTo || undefined,
      })
      setAccount(data)
    } catch (caught) {
      showToast('error', caught?.message ?? 'Could not load supplier ledger.')
      setAccount(null)
    } finally {
      setLoading(false)
    }
  }, [supplierId, dateFrom, dateTo, showToast])

  useEffect(() => {
    if (supplierId) loadLedger()
  }, [supplierId, loadLedger])

  const totals = account?.totals ?? { totalDebit: 0, totalCredit: 0, outstanding: 0 }
  const rows = account?.rows ?? []

  return (
    <div>
      <PageHeader
        title="Supplier Ledger"
        description="Running account per supplier from purchase orders and payments."
        action={
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Supplier</label>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="h-9 min-w-[220px] rounded-md border border-border-input bg-surface px-3 text-sm"
            disabled={suppliersLoading}
          >
            <option value="">Select supplier…</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
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
          <p className="text-sm text-text-secondary">Payables and payments for</p>
          <p className="mt-1 font-semibold">{account?.supplierName ?? '—'}</p>
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
                No ledger activity for this supplier.
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
            <p className="text-sm text-text-secondary">Total Payables</p>
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
