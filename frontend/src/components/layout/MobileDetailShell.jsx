import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function MobileDetailShell({ title, backTo, children, actions }) {
  const navigate = useNavigate()

  return (
    <div className="md:hidden">
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(backTo)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-maroon-light text-maroon"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="truncate text-lg font-semibold text-text-primary">{title}</h1>
      </div>
      <div className={actions ? 'pb-24' : undefined}>{children}</div>
      {actions ? (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur-md">
          <div className="flex flex-col gap-2">{actions}</div>
        </div>
      ) : null}
    </div>
  )
}

export function MobileDetailField({ label, value }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-text-secondary">{label}</p>
      <div className="mt-1 text-sm font-medium text-text-primary">{value}</div>
    </div>
  )
}

export function MobileStickyActions({ children }) {
  return <div className="flex flex-col gap-2 sm:flex-row">{children}</div>
}

export function MobileViewButton({ onClick, label = 'View' }) {
  return (
    <Button variant="ghost" size="sm" className="h-8 px-0 text-maroon" onClick={onClick}>
      {label}
    </Button>
  )
}
