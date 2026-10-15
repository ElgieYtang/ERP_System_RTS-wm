import { Button } from '@/components/ui/button'

export function DeleteQuotationDialog({ quotation, onCancel, onConfirm }) {
  if (!quotation) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-text-primary">Cancel quotation?</h2>
        <p className="mt-2 text-sm text-text-secondary">
          This will cancel {quotation.quotationNo}. You can still view it in the list with a
          rejected/cancelled status.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Keep
          </Button>
          <Button type="button" onClick={onConfirm}>
            Cancel quotation
          </Button>
        </div>
      </div>
    </div>
  )
}
