import logo from '@/assets/logo.png'
import { printCompanyInfo } from '@/config/printCompany'
import { formatLongDate, formatPrintMoney } from '@/lib/printFormat'

const EMPTY_ROWS = 12

export function QuotationDocument({ quotation }) {
  const emptyRows = Math.max(0, EMPTY_ROWS - quotation.items.length)

  return (
    <div className="quotation-page">
      <div className="quotation-sheet">
        <div className="q-header">
          <img src={logo} alt="" className="q-logo" />
          <div className="q-company">
            <div className="q-company-name">{printCompanyInfo.name}</div>
            {printCompanyInfo.addressLines.map((line) => (
              <div key={line}>{line}</div>
            ))}
            <div>Tel no: {printCompanyInfo.phone}</div>
            <div>VAT REG. TIN.: {printCompanyInfo.vatTin}</div>
          </div>
        </div>

        <div className="q-title-bar">QUOTATION</div>

        <div className="q-meta">
          <div className="q-meta-left">
            <div className="q-line">
              <span className="q-label">To:</span>
              <span className="q-value">{quotation.customerName}</span>
            </div>
            <div className="q-line">
              <span className="q-label">Address:</span>
              <span className="q-value">{quotation.customerAddress}</span>
            </div>
            <div className="q-line">
              <span className="q-label">Telephone No.:</span>
              <span className="q-value">{quotation.customerPhone}</span>
            </div>
            <div className="q-line">
              <span className="q-label">TIN No.:</span>
              <span className="q-value">{quotation.customerTin}</span>
            </div>
            <div className="q-line q-subject-line">
              <span className="q-label">Subject:</span>
              <span className="q-value">{quotation.subject ?? ''}</span>
            </div>
          </div>
          <div className="q-meta-right">
            <div className="q-line">
              <span className="q-label">No.:</span>
              <span className="q-value">{quotation.quotationNo}</span>
            </div>
            <div className="q-line">
              <span className="q-label">Date:</span>
              <span className="q-value">{formatLongDate(quotation.date)}</span>
            </div>
          </div>
        </div>

        <table className="q-table">
          <thead>
            <tr>
              <th>Item Number</th>
              <th>Item Description</th>
              <th>QTY.</th>
              <th>Unit</th>
              <th>Unit Cost</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {quotation.items.map((item) => (
              <tr key={item.id}>
                <td className="q-c">{item.itemCode || ''}</td>
                <td className="q-l">{item.itemName}</td>
                <td className="q-c">{item.quantity}</td>
                <td className="q-c">{(item.unit || 'PC/S').toUpperCase()}</td>
                <td className="q-r">{formatPrintMoney(item.unitPrice)}</td>
                <td className="q-r">{formatPrintMoney(item.amount)}</td>
              </tr>
            ))}
            {Array.from({ length: emptyRows }).map((_, i) => (
              <tr key={`e-${i}`} className="q-empty">
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
              </tr>
            ))}
            <tr>
              <td colSpan={6} className="q-nothing">****NOTHING FOLLOWS****</td>
            </tr>
          </tbody>
        </table>

        <div className="q-total">
          <span className="q-total-label">TOTAL</span>
          <span className="q-total-amount">{formatPrintMoney(quotation.total)}</span>
        </div>

        <div className="q-signs">
          <div className="q-yours">
            <div>Very truly yours,</div>
            <div className="q-yours-space" />
            <div className="q-yours-name">
              {(quotation.preparedBy || 'LARKE G. GELBOLINGO').toUpperCase()}
            </div>
            <div className="q-yours-title">
              {(quotation.preparedByPosition || 'CEO/PRESIDENT').toUpperCase()}
            </div>
            <div className="q-yours-date">
              Date: <span className="q-date-line" />
            </div>
          </div>
          <div className="q-conforme">
            <div className="q-conforme-title">CONFORME:</div>
            <div className="q-conforme-name">{(quotation.customerName || '').toUpperCase()}</div>
            <div className="q-conforme-caption">Signature Over Printed Name of Customer</div>
            <div className="q-yours-date">
              Date: <span className="q-date-line" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
