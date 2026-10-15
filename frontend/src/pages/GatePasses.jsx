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
import { Pagination } from '@/components/ui/pagination'
import { EmptyState, TableFilters } from '@/components/ui/table-filters'
import { useToast } from '@/context/ToastContext'
import { useTransactions } from '@/context/TransactionContext'
import { useServerPagedList } from '@/hooks/useServerPagedList'
import { findDrForOutslip } from '@/lib/transactionRules'
import { Ban } from 'lucide-react'
import { getStatusDisplay } from '@/lib/status'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const PAGE_SIZE = 10

export function GatePassesPage() {
  const { deliveryReceipts, voidGatePass, refreshAll } = useTransactions()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [voidBusy, setVoidBusy] = useState(null)

  const listFilters = useMemo(
    () => ({
      gate_pass_eligible: 1,
      search: search.trim() || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    }),
    [search, dateFrom, dateTo],
  )

  const {
    items: pageRows,
    meta,
    loading,
    reload,
  } = useServerPagedList('/outslips', {
    page,
    perPage: PAGE_SIZE,
    filters: listFilters,
  })

  useEffect(() => {
    setPage(1)
  }, [search, dateFrom, dateTo])

  useEffect(() => {
    if (page > meta.totalPages) {
      setPage(Math.max(1, meta.totalPages))
    }
  }, [page, meta.totalPages])

  async function handleVoidGatePass(row) {
    const key = row.dbId ?? row.id
    setVoidBusy(key)
    try {
      await voidGatePass(row.id)
      showToast('success', 'Gate pass voided.')
      await refreshAll()
      reload()
    } catch (caught) {
      showToast('error', caught?.message ?? 'Could not void gate pass.')
    } finally {
      setVoidBusy(null)
    }
  }

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
      ) : pageRows.length === 0 && !loading ? (
        <EmptyState message="No gate passes available yet. Approve or dispatch an outslip first." />
      ) : (
        <>
        <ResponsiveTable
          emptyMessage="No gate passes available yet."
          mobileItems={pageRows.map((row) => {
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
                  {pageRows.map((row) => {
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
                          <div className="flex items-center justify-end gap-1">
                            {findDrForOutslip(row, deliveryReceipts) ? (
                              <button
                                type="button"
                                className="rounded-md p-2 text-text-secondary opacity-40"
                                title="Cannot void gate pass after a delivery receipt exists."
                                disabled
                                aria-label="Gate pass locked"
                              >
                                <Ban className="h-4 w-4" />
                              </button>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                disabled={voidBusy === (row.dbId ?? row.id)}
                                onClick={() => handleVoidGatePass(row)}
                              >
                                Void
                              </Button>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                navigate(
                                  `/outslip/${encodeURIComponent(outslipKey)}/gate-pass/preview`,
                                )
                              }
                            >
                              Gate pass
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          }
        />
        {meta.totalPages > 1 ? (
          <div className="flex justify-center">
            <Pagination
              currentPage={meta.page}
              totalPages={meta.totalPages}
              onPageChange={setPage}
            />
          </div>
        ) : null}
        </>
      )}
    </div>
  )
}
