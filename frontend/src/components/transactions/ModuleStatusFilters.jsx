import { cn } from '@/lib/utils'

export function ModuleStatusFilters({ tabs, active, onChange }) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const isActive = active === tab.key
        return (
          <button
            key={tab.key}
            type="button"
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              isActive
                ? 'border-maroon bg-maroon text-white'
                : 'border-border bg-surface text-text-secondary hover:border-maroon hover:text-maroon',
            )}
            onClick={() => onChange(tab.key)}
          >
            {tab.label}
            {tab.count !== undefined ? ` ${tab.count}` : ''}
          </button>
        )
      })}
    </div>
  )
}
