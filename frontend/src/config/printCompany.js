import { RTS_LETTERHEAD } from '@/config/companyLetterhead'

export const printCompanyInfo = {
  name: RTS_LETTERHEAD.name,
  addressLines: [RTS_LETTERHEAD.address],
  phone: RTS_LETTERHEAD.phone.replace(/^Tel no:\s*/i, ''),
  email: 'info@responsivcode.com',
  vatTin: RTS_LETTERHEAD.tin.replace(/^VAT REG\. TIN\.:\s*/i, ''),
}
