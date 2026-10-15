import { cn } from '@/lib/utils'
import { Check, CheckCircle2 } from 'lucide-react'

/** Magsayo-style status chips (read-only; PO status is set by receiving workflow). */
export function PoStatusChips({ status }) {
  const normalized = status === 'completed' ? 'completed' : 'approved'

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium',
          normalized === 'approved'
            ? 'border-success-text bg-success-bg text-success-text'
            : 'border-border text-text-secondary',
        )}
      >
        <Check className="h-3.5 w-3.5" />
        Approved
      </span>
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium',
          normalized === 'completed'
            ? 'border-maroon bg-maroon-light text-maroon'
            : 'border-border text-text-secondary',
        )}
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        Completed
      </span>
    </div>
  )
}
