import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { getStatusDisplay } from '@/lib/status'
import { Package } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function InventoryOverviewPage() {
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchInventoryReport()
      .then((data) => {
        if (!cancelled) setReport(data)
      })
      .catch((caught) => {
        if (!cancelled) showToast('error', caught?.message ?? 'Could not load inventory.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [showToast])

  const summary = report?.summary ?? {
    itemCount: 0,
    totalQuantity: 0,
    lowStock: 0,
    outOfStock: 0,
  }
  const stock = report?.stock ?? []

  return (
    <div>
      <PageHeader
        title="Inventory Overview"
        description="View current stock levels and inventory status."
      />

      {loading ? <p className="mb-4 text-sm text-text-secondary">Loading inventory…</p> : null}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-text-secondary">Total Products</p>
            <p className="mt-2 text-3xl font-semibold">{summary.itemCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-text-secondary">Total Stock</p>
            <p className="mt-2 text-3xl font-semibold">{summary.totalQuantity}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-text-secondary">Low Stock</p>
            <p className="mt-2 text-3xl font-semibold text-[#B45309]">{summary.lowStock}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-text-secondary">Out of Stock</p>
            <p className="mt-2 text-3xl font-semibold">{summary.outOfStock}</p>
          </CardContent>
        </Card>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Product</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Brand</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stock.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={6} className="text-text-secondary">
                No stock on hand yet.
              </TableCell>
            </TableRow>
          ) : (
            stock.map((p) => {
              const st = getStatusDisplay(p.status)
              return (
                <TableRow key={p.itemId}>
                  <TableCell className="font-medium">{p.itemName}</TableCell>
                  <TableCell>{p.itemCode}</TableCell>
                  <TableCell>{p.brand || '—'}</TableCell>
                  <TableCell>{p.unit}</TableCell>
                  <TableCell>{p.quantity}</TableCell>
                  <TableCell>
                    <Badge variant={st.variant}>{st.label}</Badge>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>

      <div className="mt-4 flex gap-3">
        <Button variant="secondary" onClick={() => navigate('/inventory/receiving')}>
          <Package className="h-4 w-4" /> Receiving
        </Button>
        <Button variant="secondary" onClick={() => navigate('/outslip')}>
          Outslips
        </Button>
        <Button variant="secondary" onClick={() => navigate('/reports/inventory')}>
          Full Inventory Report
        </Button>
      </div>
    </div>
  )
}
