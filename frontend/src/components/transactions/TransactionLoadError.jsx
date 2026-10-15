import { Button } from '@/components/ui/button'

export function TransactionLoadError({ message, onRetry }) {
  if (!message) return null

  return (
    <div
      className="mb-4 flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between"
      role="alert"
    >
      <p className="text-sm text-red-800">{message}</p>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  )
}
