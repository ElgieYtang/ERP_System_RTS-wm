const ONES = [
  '',
  'ONE',
  'TWO',
  'THREE',
  'FOUR',
  'FIVE',
  'SIX',
  'SEVEN',
  'EIGHT',
  'NINE',
  'TEN',
  'ELEVEN',
  'TWELVE',
  'THIRTEEN',
  'FOURTEEN',
  'FIFTEEN',
  'SIXTEEN',
  'SEVENTEEN',
  'EIGHTEEN',
  'NINETEEN',
]

const TENS = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY']

function convertHundreds(value) {
  if (value === 0) return ''
  if (value < 20) return ONES[value]
  if (value < 100) {
    const remainder = value % 10
    return `${TENS[Math.floor(value / 10)]}${remainder ? `-${ONES[remainder]}` : ''}`
  }
  const remainder = value % 100
  return `${ONES[Math.floor(value / 100)]} HUNDRED${remainder ? ` ${convertHundreds(remainder)}` : ''}`
}

export function amountToWords(amount) {
  const safe = Math.max(0, Math.round(Number(amount) * 100) / 100)
  const pesos = Math.floor(safe)
  const centavos = Math.round((safe - pesos) * 100)

  if (pesos === 0 && centavos === 0) return 'ZERO PESOS ONLY'

  const parts = []
  const billions = Math.floor(pesos / 1_000_000_000)
  const millions = Math.floor((pesos % 1_000_000_000) / 1_000_000)
  const thousands = Math.floor((pesos % 1_000_000) / 1000)
  const remainder = pesos % 1000

  if (billions) parts.push(`${convertHundreds(billions)} BILLION`)
  if (millions) parts.push(`${convertHundreds(millions)} MILLION`)
  if (thousands) parts.push(`${convertHundreds(thousands)} THOUSAND`)
  if (remainder) parts.push(convertHundreds(remainder))

  let words = parts.join(' ').trim()
  if (!words) words = 'ZERO'
  words = `${words} PESO${pesos === 1 ? '' : 'S'}`

  if (centavos > 0) {
    words += ` AND ${convertHundreds(centavos)} CENTAVO${centavos === 1 ? '' : 'S'}`
  }

  return `${words} ONLY`
}
