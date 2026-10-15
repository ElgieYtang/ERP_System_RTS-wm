import { PageHeader } from '@/components/layout/PageHeader'
import { SoaLedger } from '@/components/soa/SoaLedger'
import { LoadingButton } from '@/components/ui/action-menu'
import { Button } from '@/components/ui/button'
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
import { fetchSoa } from '@/lib/reportsApi'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

export function SOAPage() {
  const { showToast } = useToast()
  const { rows: customers, loading: customersLoading } = useSetupResource('customers')
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [customerId, setCustomerId] = useState(searchParams.get('customerId') ?? '')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [account, setAccount] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!customerId && customers[0]?.id) {
      setCustomerId(String(customers[0].id))
    }
  }, [customers, customerId])

  const loadSoa = useCallback(async () => {
    if (!customerId) return
    setLoading(true)
    try {
      const data = await fetchSoa({
        customerId,
        from: dateFrom || undefined,
        to: dateTo || undefined,
      })
      setAccount(data)
    } catch (caught) {
      showToast('error', caught?.message ?? 'Could not load SOA.')
      setAccount(null)
    } finally {
      setLoading(false)
    }
  }, [customerId, dateFrom, dateTo, showToast])

  useEffect(() => {
    if (customerId) {
      setSearchParams({ customerId: String(customerId) }, { replace: true })
      loadSoa()
    }
  }, [customerId, dateFrom, dateTo, loadSoa, setSearchParams])

  const previewParams = new URLSearchParams({ customerId: String(customerId) })
  if (dateFrom) previewParams.set('from', dateFrom)
  if (dateTo) previewParams.set('to', dateTo)
  const previewPath = `/soa/preview?${previewParams.toString()}`
  const totals = account?.totals ?? { totalDebit: 0, totalCredit: 0, outstanding: 0 }
  const rows = account?.rows ?? []

  return (
    <div>
      <PageHeader
        title="Statement of Account"
        description="Generated from billing statements and payments."
        action={
          <div className="flex flex-wrap gap-2">
            <LoadingButton loading={loading} onClick={loadSoa}>
              Generate SOA
            </LoadingButton>
            <Button variant="secondary" onClick={() => navigate(previewPath)} disabled={!customerId}>
              Preview
            </Button>
            <Button
              variant="secondary"
              disabled={!customerId}
              onClick={() => {
                navigate(previewPath)
                setTimeout(() => window.print(), 300)
              }}
            >
              Print
            </Button>
          </div>
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

      <div className="mb-6">
        <SoaLedger
          customerName={account?.customerName}
          periodLabel={account?.periodLabel}
          totals={totals}
          rows={rows}
        />
      </div>

      {loading ? <p className="mb-4 text-sm text-text-secondary">Loading SOA…</p> : null}

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
                No billing or payment activity for this customer.
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

    </div>
  )
}
