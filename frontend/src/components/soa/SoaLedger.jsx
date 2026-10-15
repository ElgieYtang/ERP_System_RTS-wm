import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/format'

export function SoaLedger({ customerName, periodLabel, totals, rows }) {
  const debit = totals?.totalDebit ?? 0
  const credit = totals?.totalCredit ?? 0
  const outstanding = totals?.outstanding ?? 0

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="grid gap-4 pt-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase text-text-secondary">Total debit</p>
            <p className="mt-1 text-lg font-semibold">{formatCurrency(debit)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-text-secondary">Total credit</p>
            <p className="mt-1 text-lg font-semibold">{formatCurrency(credit)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-text-secondary">Outstanding</p>
            <p className="mt-1 text-lg font-semibold text-maroon">{formatCurrency(outstanding)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <p className="text-sm text-text-secondary">Period: {periodLabel ?? '—'}</p>
          <p className="mt-1 font-semibold">{customerName ?? '—'}</p>
          {rows?.length ? (
            <p className="mt-2 text-xs text-text-secondary">{rows.length} ledger line(s)</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
