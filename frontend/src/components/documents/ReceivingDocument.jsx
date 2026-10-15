import logo from '@/assets/logo.png'
import { printCompanyInfo } from '@/config/printCompany'
import { formatDisplayDate } from '@/lib/quotations'

export function ReceivingDocument({ receiving }) {
  return (
    <div className="outslip-document">
      <div className="outslip-head">
        <div className="outslip-company-wrap">
          <img src={logo} alt="" className="outslip-logo" />
          <div>
            <div className="outslip-company-name">{printCompanyInfo.name}</div>
            {printCompanyInfo.addressLines.map((line) => (
              <div key={line} className="outslip-company-meta">{line}</div>
            ))}
            <div className="outslip-company-meta">Tel: {printCompanyInfo.phone}</div>
          </div>
        </div>
      </div>

      <h1 className="outslip-title">RECEIVING</h1>

      <div className="outslip-reference-head">
        <div className="outslip-reference-left">
          <div className="outslip-reference-label">Supplier:</div>
          <div className="outslip-reference-value outslip-reference-value--strong">
            {receiving.supplierName || '—'}
          </div>
        </div>
        <div className="outslip-reference-right">
          <div className="outslip-meta-row">
            <span>Date:</span>
            <span>{formatDisplayDate(receiving.date)}</span>
          </div>
          <div className="outslip-meta-row">
            <span>Receiving No.:</span>
            <span>{receiving.id}</span>
          </div>
          <div className="outslip-meta-row">
            <span>PO No.:</span>
            <span>{receiving.purchaseOrderId || '—'}</span>
          </div>
        </div>
      </div>

      <table className="outslip-items-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Ordered</th>
            <th>Received</th>
          </tr>
        </thead>
        <tbody>
          {(receiving.items ?? []).map((item) => (
            <tr key={item.productId}>
              <td>{item.productName}</td>
              <td className="text-center">{item.ordered ?? item.quantity}</td>
              <td className="text-center">{item.received ?? item.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
