import { ItemBarcodeSheet } from '@/components/items/ItemBarcodeSheet'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { useSetupResource } from '@/hooks/useSetupResource'

export function ItemBarcodePrintPage() {
  const items = useSetupResource('items')

  return (
    <div>
      <PageHeader
        title="Item barcodes"
        description="Print barcode labels for setup items (CODE128)."
        breadcrumbs={['Setup', 'Items', 'Barcodes']}
        action={
          <Button type="button" variant="secondary" onClick={() => window.print()}>
            Print
          </Button>
        }
      />

      {items.loading ? <p className="text-sm text-text-secondary">Loading items…</p> : null}

      <div className="item-barcode-preview rounded-lg border border-border bg-surface p-4 print:border-0 print:p-0">
        <ItemBarcodeSheet items={items.rows} />
      </div>
    </div>
  )
}
