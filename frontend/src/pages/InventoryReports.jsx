import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/context/ToastContext'
import { fetchInventoryReport } from '@/lib/reportsApi'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function InventoryReportsPage() {
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)

  const loadReport = useCallback(async (q = '') => {
    setLoading(true)
    try {
      const data = await fetchInventoryReport({ q: q || undefined })
      setReport(data)
    } catch (caught) {
      showToast('error', caught?.message ?? 'Could not load inventory report.')
      setReport(null)
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    loadReport('')
  }, [loadReport])

  useEffect(() => {
    const handle = setTimeout(() => {
      loadReport(query.trim())
    }, 300)
    return () => clearTimeout(handle)
  }, [query, loadReport])

  const summary = report?.summary ?? {
    itemCount: 0,
    totalQuantity: 0,
    movementCount: 0,
  }
  const stock = report?.stock ?? []
  const movements = report?.movements ?? []

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Current stock and inventory movements from receiving and outslip dispatch."
      />

      {loading && !report ? (
        <p className="mb-4 text-sm text-text-secondary">Loading inventory…</p>
      ) : null}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-text-secondary">Items</p>
            <p className="mt-2 text-3xl font-semibold text-text-primary">{summary.itemCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-text-secondary">Total quantity on hand</p>
            <p className="mt-2 text-3xl font-semibold text-text-primary">
              {summary.totalQuantity}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-text-secondary">Inventory records</p>
            <p className="mt-2 text-3xl font-semibold text-text-primary">
              {summary.movementCount}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-text-primary">Current stock</h2>
          <button
            type="button"
            className="text-sm text-maroon hover:underline"
            onClick={() => navigate('/inventory/receiving')}
          >
            Go to Receiving
          </button>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Item Code</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Unit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stock.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="text-text-secondary">
                  No stock movements yet. Confirm a receiving or dispatch an outslip.
                </TableCell>
              </TableRow>
            ) : (
              stock.map((row) => (
                <TableRow key={row.itemId}>
                  <TableCell>{row.itemCode}</TableCell>
                  <TableCell>{row.itemName}</TableCell>
                  <TableCell>{row.quantity}</TableCell>
                  <TableCell>{row.unit}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-text-primary">Inventory records</h2>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search movements…"
          className="max-w-xs"
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Date</TableHead>
            <TableHead>Item</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Trans ID</TableHead>
            <TableHead>In</TableHead>
            <TableHead>Out</TableHead>
            <TableHead>Change</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movements.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={7} className="text-text-secondary">
                No inventory records found.
              </TableCell>
            </TableRow>
          ) : (
            movements.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.displayDate || row.date}</TableCell>
                <TableCell>
                  {row.itemName}
                  <span className="block text-xs text-text-secondary">{row.itemCode}</span>
                </TableCell>
                <TableCell>{row.transType}</TableCell>
                <TableCell>{row.transId}</TableCell>
                <TableCell>{row.in || '—'}</TableCell>
                <TableCell>{row.out || '—'}</TableCell>
                <TableCell>{row.change > 0 ? `+${row.change}` : row.change}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
