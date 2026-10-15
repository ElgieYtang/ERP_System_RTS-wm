import logo from '@/assets/logo.png'
import { printCompanyInfo } from '@/config/printCompany'
import { formatPrintMoney } from '@/lib/printFormat'

const MIN_ITEM_ROWS = 8

function formatDrDate(value) {
  if (!value) return '—'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function lineAmount(item) {
  if (item.amount != null) return Number(item.amount)
  return Number(item.quantity ?? 0) * Number(item.unitPrice ?? 0)
}

function brandSerialParts(item) {
  const brand = (item.brand ?? item.brandName ?? '').trim()
  const serial =
    (item.brandSerial ?? '').trim() ||
    (Array.isArray(item.serialNumbers)
      ? item.serialNumbers.map((s) => String(s).trim()).filter(Boolean).join(', ')
      : '')

  return { brand, serial }
}

export function DeliveryReceiptDocument({ receipt }) {
  const items = receipt.items ?? []
  const emptyRows = Math.max(0, MIN_ITEM_ROWS - items.length)
  const total =
    receipt.total ?? items.reduce((sum, item) => sum + lineAmount(item), 0)

  const deliveredToName = receipt.customerName ?? ''
  const deliveredToAddress = receipt.customerAddress ?? receipt.deliveryAddress ?? ''
  const referenceParts = [receipt.referenceOutslipId, receipt.referencePoId].filter(Boolean)
  const reference =
    receipt.reference ??
    (referenceParts.length ? referenceParts.join(' / ') : '—')

  const deliveredByName = receipt.deliveredByName ?? 'Larke Gelbolingo'
  const deliveredByTitle = receipt.deliveredByTitle ?? 'Project Manager'

  return (
    <div className="dr-document">
      <div className="dr-head">
        <img src={logo} alt="" className="dr-logo" />
        <div className="dr-company">
          <div className="dr-company-name">{printCompanyInfo.name}</div>
          {printCompanyInfo.addressLines.map((line) => (
            <div key={line} className="dr-company-meta">{line}</div>
          ))}
          <div className="dr-company-meta">Tel no: {printCompanyInfo.phone}</div>
          <div className="dr-company-meta">VAT REG. TIN.: {printCompanyInfo.vatTin}</div>
        </div>
      </div>

      <h1 className="dr-title">DELIVERY RECEIPT</h1>

      <div className="dr-meta-row">
        <div className="dr-delivered-to">
          <div className="dr-label">Delivered to:</div>
          <div className="dr-customer-name">{deliveredToName || '—'}</div>
          {deliveredToAddress ? (
            <div className="dr-customer-address">{deliveredToAddress}</div>
          ) : null}
        </div>
        <div className="dr-right-meta">
          <div className="dr-meta-line">
            <span>Date:</span>
            <span>{formatDrDate(receipt.date)}</span>
          </div>
          <div className="dr-meta-line">
            <span>Delivery No.:</span>
            <span>{receipt.id}</span>
          </div>
        </div>
      </div>

      <div className="dr-reference">
        <span className="dr-label">Reference:</span>
        <span>{reference}</span>
      </div>

      <table className="dr-items-table">
        <thead>
          <tr>
            <th className="dr-col-no">NO.</th>
            <th className="dr-col-desc">ITEM DESCRIPTION</th>
            <th className="dr-col-brand">BRAND/SERIAL NO.</th>
            <th className="dr-col-qty">QTY.</th>
            <th className="dr-col-unit">UNIT</th>
            <th className="dr-col-price">Unit Price</th>
            <th className="dr-col-total">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const { brand, serial } = brandSerialParts(item)
            const unit = (item.unit ?? 'UNITS').toString().toUpperCase()
            return (
              <tr key={item.productId ?? index}>
                <td className="dr-col-no">{index + 1}</td>
                <td className="dr-col-desc">{item.productName ?? item.description ?? '—'}</td>
                <td className="dr-col-brand">
                  {brand ? <div className="dr-brand-name">{brand}</div> : null}
                  {serial ? (
                    <div className="dr-brand-serials">{serial}</div>
                  ) : (
                    !brand && '\u00A0'
                  )}
                </td>
                <td className="dr-col-qty">{item.quantity ?? '—'}</td>
                <td className="dr-col-unit">{unit}</td>
                <td className="dr-col-price">{formatPrintMoney(item.unitPrice)}</td>
                <td className="dr-col-total">{formatPrintMoney(lineAmount(item))}</td>
              </tr>
            )
          })}
          {Array.from({ length: emptyRows }).map((_, index) => (
            <tr key={`empty-${index}`} className="dr-empty-row">
              <td className="dr-col-no">&nbsp;</td>
              <td className="dr-col-desc">&nbsp;</td>
              <td className="dr-col-brand">&nbsp;</td>
              <td className="dr-col-qty">&nbsp;</td>
              <td className="dr-col-unit">&nbsp;</td>
              <td className="dr-col-price">&nbsp;</td>
              <td className="dr-col-total">&nbsp;</td>
            </tr>
          ))}
          <tr>
            <td colSpan={7} className="dr-nothing-follows">****NOTHING FOLLOWS****</td>
          </tr>
          <tr className="dr-table-total-row">
            <td colSpan={5} />
            <td className="dr-table-total-label">TOTAL AMOUNT</td>
            <td className="dr-table-total-value">{formatPrintMoney(total)}</td>
          </tr>
        </tbody>
      </table>

      <p className="dr-acknowledge">
        I/We acknowledged to have received in good order and condition the above merchandise(s) in
        accordance to the specifications stated subject to the terms and conditions.
      </p>

      <div className="dr-signatures">
        <div className="dr-signature">
          <div className="dr-signature-label">Delivered by:</div>
          <div className="dr-signature-line" />
          <div className="dr-signature-name">{deliveredByName}</div>
          <div className="dr-signature-role">{deliveredByTitle}</div>
        </div>
        <div className="dr-signature">
          <div className="dr-signature-label">Received by:</div>
          <div className="dr-signature-line" />
          <div className="dr-signature-role">Signature Over Printed Name</div>
        </div>
      </div>
    </div>
  )
}
