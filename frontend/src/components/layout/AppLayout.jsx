import { ToastContainer } from '@/components/ui/toast'
import { useTransactions } from '@/context/TransactionContext'
import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { BarcodeLookup } from './BarcodeLookup'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

function AppLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const location = useLocation()
  const { error, refreshAll } = useTransactions()
  const isPrintPreview = location.pathname.includes('/preview')
  const isDetailRoute =
    !isPrintPreview &&
    /\/(quotations|purchase-order|outslip|delivery-receipt)\/[^/]+$/.test(location.pathname) &&
    !location.pathname.endsWith('/preview')

  useEffect(() => {
    setMobileNavOpen(false)
  }, [location.pathname])

  if (isPrintPreview) {
    return (
      <div className="document-preview-shell min-h-screen">
        <main className="document-preview-main">
          <Outlet />
        </main>
        <ToastContainer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-page">
      <Sidebar mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />
      <div className="flex min-h-screen flex-col md:ml-[250px]">
        {!isDetailRoute ? <Header onMenuClick={() => setMobileNavOpen(true)} /> : null}
        <main className={cnMain(isDetailRoute)}>
          {error ? (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-[#DC2626]/30 bg-[#FEE2E2] px-3 py-2 text-sm text-[#DC2626]">
              <span>{error}</span>
              <button
                type="button"
                className="font-medium underline"
                onClick={() => refreshAll()}
              >
                Retry
              </button>
            </div>
          ) : null}
          <Outlet />
        </main>
      </div>
      <BarcodeLookup />
      <ToastContainer />
    </div>
  )
}

function cnMain(isDetailRoute) {
  if (isDetailRoute) {
    return 'flex-1 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:p-6'
  }
  return 'flex-1 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:p-6 md:pb-6'
}

export { AppLayout }
