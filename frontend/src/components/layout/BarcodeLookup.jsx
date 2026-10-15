import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { useTransactions } from '@/context/TransactionContext'
import { usePhysicalBarcodeScan } from '@/hooks/usePhysicalBarcodeScan'
import { fetchSetupItemByBarcode } from '@/lib/transactionApi'
import {
  BARCODE_SCAN_EVENT,
  findTransactionByCode,
} from '@/lib/transactionBarcode'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function BarcodeLookup() {
  const navigate = useNavigate()
  const {
    quotations,
    purchaseOrders,
    receivings,
    outslips,
    deliveryReceipts,
    billingStatements,
  } = useTransactions()

  const [barcode, setBarcode] = useState('')
  const [item, setItem] = useState(null)
  const [transaction, setTransaction] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const open = Boolean(barcode)

  function close() {
    setBarcode('')
    setItem(null)
    setTransaction(null)
    setError(null)
    setLoading(false)
  }

  function openScan(code) {
    setBarcode(code)
    setItem(null)
    setTransaction(null)
    setError(null)
    setLoading(true)
  }

  usePhysicalBarcodeScan(openScan)

  useEffect(() => {
    function handleLookup(event) {
      const code = event.detail
      if (typeof code === 'string' && code.trim()) openScan(code.trim())
    }
    window.addEventListener(BARCODE_SCAN_EVENT, handleLookup)
    return () => window.removeEventListener(BARCODE_SCAN_EVENT, handleLookup)
  }, [])

  useEffect(() => {
    if (!barcode) return

    const match = findTransactionByCode(barcode, {
      quotations,
      purchaseOrders,
      receivings,
      outslips,
      deliveryReceipts,
      billingStatements,
    })

    if (match) {
      setTransaction(match)
      setItem(null)
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setTransaction(null)

    void fetchSetupItemByBarcode(barcode)
      .then((data) => {
        if (cancelled) return
        if (data) {
          setItem(data)
          setError(null)
        } else {
          setItem(null)
          setError(`No transaction or item matches barcode ${barcode}.`)
        }
      })
      .catch((caught) => {
        if (cancelled) return
        setItem(null)
        setError(caught?.message ?? 'Unable to look up the scanned barcode.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [
    barcode,
    quotations,
    purchaseOrders,
    receivings,
    outslips,
    deliveryReceipts,
    billingStatements,
  ])

  return (
    <Modal open={open} onClose={close} title="Barcode lookup">
      {loading ? <p className="text-sm text-text-secondary">Looking up…</p> : null}

      {transaction ? (
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">{transaction.label}</p>
          <p className="text-lg font-semibold text-text-primary">{transaction.title}</p>
          {transaction.party ? (
            <p className="text-sm text-text-secondary">{transaction.party}</p>
          ) : null}
          <Button
            type="button"
            onClick={() => {
              close()
              navigate(transaction.path)
            }}
          >
            Open record
          </Button>
        </div>
      ) : null}

      {!loading && item ? (
        <div className="space-y-2">
          <p className="text-lg font-semibold text-text-primary">
            {item.item_name ?? item.name ?? 'Item'}
          </p>
          <p className="text-sm text-text-secondary">Code: {item.item_code ?? '—'}</p>
          <p className="text-sm text-text-secondary">Barcode: {barcode}</p>
        </div>
      ) : null}

      {!loading && error ? (
        <p className="text-sm text-error-text">{error}</p>
      ) : null}
    </Modal>
  )
}
