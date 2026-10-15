import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'
import { Eye, EyeOff, FileText, Package, ShoppingCart, Truck } from 'lucide-react'
import { Fragment, useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'

const quickModules = [
  { label: 'Quotations', icon: FileText, accent: 'bg-maroon' },
  { label: 'Purchase Orders', icon: ShoppingCart, accent: 'bg-brand-orange' },
  { label: 'Receiving', icon: Package, accent: 'bg-maroon-dark' },
  { label: 'Delivery Receipts', icon: Truck, accent: 'bg-[#9B2335]' },
]

function LoginForm({
  username,
  password,
  showPassword,
  error,
  isSubmitting,
  variant,
  onUsernameChange,
  onPasswordChange,
  onTogglePassword,
  onForgotPassword,
  onSubmit,
}) {
  const isMobile = variant === 'mobile'
  const labelClass = isMobile
    ? 'mb-1.5 block text-sm font-medium text-white/90'
    : 'mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary'
  const inputClass = isMobile
    ? 'login-field h-12 rounded-xl border border-white/10 bg-white px-4 text-text-primary placeholder:text-text-secondary/70'
    : 'login-field h-12 rounded-xl border-0 bg-[#f3ecec] px-4 text-text-primary placeholder:text-text-secondary focus:bg-[#efe6e6] focus:ring-2 focus:ring-maroon/25'

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor={`username-${variant}`} className={labelClass}>
          Username or email
        </label>
        <Input
          id={`username-${variant}`}
          type="text"
          autoComplete="username"
          value={username}
          onChange={(event) => onUsernameChange(event.target.value)}
          className={inputClass}
          placeholder="admin or admin@responsivcode.com"
          required
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label htmlFor={`password-${variant}`} className={labelClass}>
          Password
        </label>
        <div className="relative">
          <Input
            id={`password-${variant}`}
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            className={cn(inputClass, 'pr-11')}
            placeholder="Enter your password"
            required
            disabled={isSubmitting}
          />
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-maroon"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {!isMobile ? (
          <div className="mt-2 text-right">
            <button
              type="button"
              className="text-xs font-medium italic text-maroon hover:underline"
              onClick={onForgotPassword}
            >
              Forgot password?
            </button>
          </div>
        ) : null}
      </div>

      {error ? (
        <p
          className={cn(
            'rounded-lg px-3 py-2 text-sm',
            isMobile ? 'bg-error-bg/90 text-error-text' : 'bg-error-bg text-error-text',
          )}
        >
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting}
        className={cn(
          'h-12 w-full rounded-xl text-sm font-semibold shadow-md',
          isMobile ? 'mt-2' : 'uppercase tracking-wide',
        )}
      >
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  )
}

export function LoginPage() {
  const { login, isAuthenticated, isBootstrapping } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from ?? '/'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    document.documentElement.classList.add('login-route')
    return () => document.documentElement.classList.remove('login-route')
  }, [])

  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-text-secondary">
        Checking session…
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to={from} replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await login(username, password)
      navigate(from, { replace: true })
    } catch (caught) {
      setError(caught?.message ?? 'Invalid username or password.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleForgotPassword() {
    setError('Please contact your system administrator to reset your password.')
  }

  const formProps = {
    username,
    password,
    showPassword,
    error,
    isSubmitting,
    onUsernameChange: setUsername,
    onPasswordChange: setPassword,
    onTogglePassword: () => setShowPassword((value) => !value),
    onForgotPassword: handleForgotPassword,
    onSubmit: handleSubmit,
  }

  return (
    <Fragment>
      <div className="flex min-h-screen items-center justify-center bg-[#141018] px-4 py-8 lg:hidden">
        <div className="w-full max-w-[400px] rounded-2xl border border-white/10 bg-[#1f1619] p-6 shadow-2xl sm:p-8">
          <div className="mb-6 flex items-center gap-2.5">
            <img src="/logo.png" alt="" className="h-9 w-9 object-contain mix-blend-lighten" />
            <span className="text-lg font-bold text-maroon-light">ResponsivCode</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Sign in</h1>
          <p className="mt-1 text-sm text-white/55">Secure ERP access</p>
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-white/45">Sign in with your account</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>
          <LoginForm {...formProps} variant="mobile" />
          <p className="mt-8 text-center text-[10px] font-semibold uppercase tracking-widest text-white/35">
            Authorized personnel only
          </p>
        </div>
      </div>

      <div className="hidden min-h-screen lg:flex">
        <aside className="relative flex w-[58%] flex-col justify-between bg-[#1a1214] px-14 py-12 text-white">
          <div>
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="" className="h-11 w-11 object-contain mix-blend-lighten" />
              <div>
                <p className="text-lg font-bold tracking-wide">RESPONSIVCODE</p>
                <p className="text-xs font-medium uppercase tracking-widest text-maroon-light/80">
                  ERP System
                </p>
              </div>
            </div>
            <h1 className="mt-16 max-w-lg text-4xl font-bold leading-tight xl:text-5xl">
              Streamlined operations for{' '}
              <span className="bg-gradient-to-r from-maroon-light via-brand-orange to-maroon-light bg-clip-text text-transparent">
                your business.
              </span>
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-white/60">
              Manage quotations, purchase orders, inventory movement, and delivery workflows from one
              secure workspace.
            </p>
            <div className="mt-14 grid grid-cols-2 gap-3">
              {quickModules.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 backdrop-blur-sm"
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white',
                      item.accent,
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-white/90">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} ResponsivCode. Internal use only.
          </p>
        </aside>

        <main className="flex flex-1 flex-col items-center justify-center bg-surface px-12">
          <div className="w-full max-w-md">
            <div className="mb-10">
              <h2 className="text-3xl font-bold tracking-tight text-[#1a1214]">Sign in</h2>
              <p className="mt-1 text-sm text-text-secondary">Secure ERP access</p>
            </div>
            <LoginForm {...formProps} variant="desktop" />
            <p className="mt-10 text-center text-[10px] font-semibold uppercase tracking-widest text-text-secondary/70">
              Authorized personnel only
            </p>
          </div>
        </main>
      </div>
    </Fragment>
  )
}
