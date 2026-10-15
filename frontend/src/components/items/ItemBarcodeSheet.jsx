import { ItemBarcode } from '@/components/ui/item-barcode'

export function ItemBarcodeSheet({ items }) {
  const withBarcode = (items ?? []).filter((row) => String(row.barcode ?? '').trim())

  return (
    <div className="item-barcode-sheet">
      <h1 className="item-barcode-sheet-title">Item Barcodes</h1>
      {withBarcode.length === 0 ? (
        <p className="item-barcode-empty">No items have a barcode yet. Add barcodes in Item Setup.</p>
      ) : (
        <div className="item-barcode-grid">
          {withBarcode.map((item) => (
            <div key={item.id} className="item-barcode-label">
              <div className="item-barcode-name">{item.name ?? item.item_name}</div>
              <div className="item-barcode-code">{item.code ?? item.item_code}</div>
              <div className="item-barcode-graphic">
                <ItemBarcode value={item.barcode} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
