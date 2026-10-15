import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ResponsiveTable } from '@/components/ui/responsive-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState, TableFilters } from '@/components/ui/table-filters'
import { useTransactions } from '@/context/TransactionContext'
import { filterByDateRange } from '@/lib/dateFilter'
import { canPrintGatePass } from '@/lib/gatePass'
import { getStatusDisplay } from '@/lib/status'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function GatePassesPage() {
  const { outslips, loading } = useTransactions()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const rows = useMemo(() => {
    let list = outslips.filter((row) => canPrintGatePass(row.status))
    list = filterByDateRange(list, dateFrom, dateTo, 'date')
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (row) =>
          String(row.id ?? '').toLowerCase().includes(q) ||
          String(row.customerName ?? '').toLowerCase().includes(q),
      )
    }
    return list
  }, [outslips, search, dateFrom, dateTo])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gate Passes"
        description="Approved and dispatched outslips ready for gate pass printing."
      />

      <TableFilters
        search={search}
        onSearchChange={setSearch}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        showDateRange
        searchPlaceholder="Search outslip or customer…"
      />

      {loading ? (
        <p className="text-sm text-text-secondary">Loading…</p>
      ) : rows.length === 0 ? (
        <EmptyState message="No gate passes available yet. Approve or dispatch an outslip first." />
      ) : (
        <ResponsiveTable
          emptyMessage="No gate passes available yet."
          mobileItems={rows.map((row) => {
            const st = getStatusDisplay(row.status)
            const outslipKey = row.id
            return {
              id: row.dbId ?? row.id,
              title: row.id,
              subtitle: row.customerName ?? '—',
              badge: { label: st.label, variant: st.variant },
              fields: [
                { label: 'Date', value: row.displayDate ?? row.date ?? '—' },
              ],
              onClick: () =>
                navigate(`/outslip/${encodeURIComponent(outslipKey)}/gate-pass/preview`),
            }
          })}
          desktop={
            <div className="overflow-x-auto rounded-lg border border-border bg-surface">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Outslip</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const status = getStatusDisplay(row.status)
                    const outslipKey = row.id
                    return (
                      <TableRow key={row.dbId ?? row.id}>
                        <TableCell className="font-medium">{row.id}</TableCell>
                        <TableCell>{row.customerName ?? '—'}</TableCell>
                        <TableCell>{row.displayDate ?? row.date ?? '—'}</TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              navigate(`/outslip/${encodeURIComponent(outslipKey)}/gate-pass/preview`)
                            }
                          >
                            Gate pass
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          }
        />
      )}
    </div>
  )
}
