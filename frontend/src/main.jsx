import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from '@/context/AuthContext'
import { ToastProvider } from '@/context/ToastContext'
import { TransactionProvider } from '@/context/TransactionContext'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <ToastProvider>
        <TransactionProvider>
          <App />
        </TransactionProvider>
      </ToastProvider>
    </AuthProvider>
  </StrictMode>,
)
