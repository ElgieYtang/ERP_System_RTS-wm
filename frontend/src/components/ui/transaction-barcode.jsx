export function TransactionBarcode({ value }) {
  const code = String(value ?? '').trim()
  if (!code) return null

  return (
    <p className="mt-1 font-mono text-xs tracking-wide text-text-secondary" aria-label={`Reference ${code}`}>
      {code}
    </p>
  )
}
