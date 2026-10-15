import { Button } from '@/components/ui/button'
import { FormField, Input, Label } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { useToast } from '@/context/ToastContext'
import { useTransactions } from '@/context/TransactionContext'
import { useSetupResource } from '@/hooks/useSetupResource'
import { formatCurrency } from '@/lib/format'
import { getCustomerDetails } from '@/lib/quotationHelpers'
import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

const EMPTY_ITEM = { productId: '', quantity: 1, unitPrice: 0 }

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function ReadOnlyField({ label, value }) {
  return (
    <FormField label={label}>
      <Input value={value || '—'} readOnly className="bg-maroon-light/40" />
    </FormField>
  )
}

export function AddQuotationModal({ open, onClose }) {
  const { showToast } = useToast()
  const { addQuotation } = useTransactions()
  const customers = useSetupResource('customers')
  const itemsCatalog = useSetupResource('items')

  const activeCustomers = useMemo(
    () => customers.rows.filter((customer) => customer.status !== 'Inactive'),
    [customers.rows],
  )
  const activeItems = useMemo(
    () => itemsCatalog.rows.filter((item) => item.status !== 'Inactive'),
    [itemsCatalog.rows],
  )
  const itemOptions = useMemo(
    () =>
      activeItems.map((product) => ({
        value: product.id,
        label: `${product.code ? `${product.code} — ` : ''}${product.name}`,
        searchText: [product.code, product.name, product.brand, product.model]
          .filter(Boolean)
          .join(' '),
      })),
    [activeItems],
  )

  const [customerId, setCustomerId] = useState('')
  const [date, setDate] = useState(todayIso())
  const [items, setItems] = useState([{ ...EMPTY_ITEM }])
  const [submitting, setSubmitting] = useState(false)

  const selectedCustomer = activeCustomers.find((customer) => customer.id === customerId)
  const customerDetails = getCustomerDetails(selectedCustomer)

  const total = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
    0,
  )

  useEffect(() => {
    if (!open) return
    setCustomerId(activeCustomers[0]?.id ?? '')
    setDate(todayIso())
    setItems([{ ...EMPTY_ITEM }])
  }, [open, activeCustomers])

  const updateItem = (index, patch) => {
    setItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    )
  }

  const handleProductChange = (index, productId) => {
    updateItem(index, { productId, unitPrice: 0 })
  }

  const addItemRow = () => {
    setItems((current) => [...current, { ...EMPTY_ITEM }])
  }

  const removeItemRow = (index) => {
    setItems((current) => (current.length === 1 ? current : current.filter((_, i) => i !== index)))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!customerId) {
      showToast('error', 'Please select a customer.')
      return
    }

    const lineItems = items.filter((item) => item.productId)

    if (lineItems.length === 0) {
      showToast('error', 'Add at least one item.')
      return
    }

    if (lineItems.some((item) => !item.quantity || item.quantity <= 0)) {
      showToast('error', 'Item quantity must be greater than zero.')
      return
    }

    setSubmitting(true)
    try {
      await addQuotation({
        customerId,
        date,
        items: lineItems,
      })
      showToast('success', 'Quotation created successfully.')
      onClose()
    } catch (caught) {
      showToast('error', caught?.message ?? 'Could not create quotation.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Quotation"
      size="xl"
      footer={
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="add-quotation-form" disabled={submitting}>
            {submitting ? 'Saving…' : 'Add'}
          </Button>
        </div>
      }
    >
      <form id="add-quotation-form" onSubmit={handleSubmit} className="space-y-6">
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-text-primary">Customer</h3>
          <FormField label="Select Customer" required>
            <select
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
              className="h-9 w-full rounded-md border border-border-input bg-surface px-3 text-sm"
              required
            >
              <option value="">Choose customer...</option>
              {activeCustomers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.code ? `${customer.code} — ` : ''}
                  {customer.name}
                </option>
              ))}
            </select>
          </FormField>

          {selectedCustomer ? (
            <div className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-maroon-light/30 p-4 sm:grid-cols-2">
              <ReadOnlyField label="Customer Name" value={customerDetails.name} />
              <ReadOnlyField label="Address" value={customerDetails.address} />
              <ReadOnlyField label="TIN No." value={customerDetails.tinNo} />
              <ReadOnlyField label="Terms" value={customerDetails.terms} />
            </div>
          ) : (
            <p className="text-sm text-text-secondary">
              Add customers under Setup → Customer before creating a quotation.
            </p>
          )}
        </section>

        <section>
          <FormField label="Date">
            <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </FormField>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">Items</h3>
            <Button type="button" variant="secondary" size="sm" onClick={addItemRow}>
              <Plus className="h-4 w-4" />
              Add Item
            </Button>
          </div>

          {activeItems.length === 0 ? (
            <p className="text-sm text-text-secondary">
              Add items under Setup → Item before creating a quotation.
            </p>
          ) : null}

          <div className="space-y-3">
            {items.map((item, index) => {
              const amount = Number(item.quantity || 0) * Number(item.unitPrice || 0)
              return (
                <div
                  key={`item-${index}`}
                  className="grid grid-cols-1 gap-3 rounded-lg border border-border p-3 sm:grid-cols-[minmax(0,2fr)_100px_120px_120px_auto]"
                >
                  <FormField label={index === 0 ? 'Item' : undefined}>
                    <SearchableSelect
                      value={item.productId}
                      onChange={(productId) => handleProductChange(index, productId)}
                      options={itemOptions}
                      placeholder="Type to search item..."
                      emptyMessage="No items match your search"
                    />
                  </FormField>

                  <FormField label={index === 0 ? 'Qty' : undefined}>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(event) => updateItem(index, { quantity: event.target.value })}
                    />
                  </FormField>

                  <FormField label={index === 0 ? 'Unit Price' : undefined}>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(event) => updateItem(index, { unitPrice: event.target.value })}
                    />
                  </FormField>

                  <div className="flex items-end">
                    <div className="w-full">
                      {index === 0 ? (
                        <Label className="mb-1.5 block text-xs text-text-secondary">Amount</Label>
                      ) : null}
                      <div className="flex h-9 items-center text-sm font-medium">
                        {formatCurrency(amount)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-end justify-end">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => removeItemRow(index)}
                      disabled={items.length === 1}
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex justify-end border-t border-border pt-3 text-sm">
            <span className="text-text-secondary">Total:&nbsp;</span>
            <span className="font-semibold text-text-primary">{formatCurrency(total)}</span>
          </div>
        </section>
      </form>
    </Modal>
  )
}
