import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { TABLE_ACTIONS_CELL_CLASS, TABLE_ACTIONS_HEAD_CLASS, TableActions } from '@/components/ui/action-menu'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FormField, Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { EmptyState, TableFilters } from '@/components/ui/table-filters'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/context/ToastContext'
import { getStatusDisplay } from '@/lib/status'
import { Eye, EyeOff } from 'lucide-react'

function emptyForm(fields) {
  return Object.fromEntries(fields.map((field) => [field.key, '']))
}

function resolveSelectOptions(field, optionSources = {}) {
  if (field.options?.length) {
    return field.options.map((option) => ({
      value: option,
      label: option,
    }))
  }

  const sourceRows = optionSources[field.optionSource] ?? []

  return sourceRows
    .filter((row) => row.status !== 'Inactive')
    .map((row) => ({
      value: String(row[field.optionValueKey ?? 'id'] ?? ''),
      label: row[field.optionLabelKey ?? 'name'] ?? row.name ?? row.id,
    }))
}

function formatStockQuantity(value) {
  const qty = Number(value ?? 0)
  if (!Number.isFinite(qty)) return '0'
  return Number.isInteger(qty) ? String(qty) : qty.toFixed(2)
}

export function SetupListPage({
  title,
  description,
  breadcrumbs,
  actionLabel = '+ Add',
  columns,
  rows,
  formFields = [],
  rowIdKey = 'id',
  statusKey = 'status',
  searchPlaceholder = 'Search...',
  loading = false,
  loadError = null,
  optionSources = {},
  onAdd,
  onEdit,
  onDelete,
}) {
  const { showToast } = useToast()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(() => emptyForm(formFields))
  const [visiblePasswords, setVisiblePasswords] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  const isFieldRequired = (field) =>
    field.required || (field.requiredOnCreate && editingId == null)

  const statusOptions = useMemo(() => {
    const values = [...new Set(rows.map((row) => row[statusKey]).filter(Boolean))]
    return values.map((value) => ({ value, label: value }))
  }, [rows, statusKey])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (statusFilter !== 'all' && row[statusKey] !== statusFilter) return false
      if (!q) return true
      return columns.some((col) => String(row[col.key] ?? '').toLowerCase().includes(q))
    })
  }, [rows, search, statusFilter, columns, statusKey])

  const openAddModal = () => {
    setEditingId(null)
    setForm(emptyForm(formFields))
    setVisiblePasswords({})
    setModalOpen(true)
  }

  const openEditModal = (row) => {
    setEditingId(row[rowIdKey])
    setForm(
      Object.fromEntries(
        formFields.map((field) => [field.key, String(row[field.key] ?? '')]),
      ),
    )
    setVisiblePasswords({})
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingId(null)
    setForm(emptyForm(formFields))
    setVisiblePasswords({})
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    for (const field of formFields) {
      const isRequired = isFieldRequired(field)

      if (isRequired && !String(form[field.key] ?? '').trim()) {
        showToast('error', `${field.label} is required.`)
        return
      }
    }

    const payload = Object.fromEntries(
      formFields
        .map((field) => [field.key, String(form[field.key] ?? '').trim()])
        .filter(([key, value]) => {
          if (key === 'password' && editingId != null && !value) {
            return false
          }
          return true
        }),
    )

    setSubmitting(true)

    try {
      if (editingId != null) {
        await onEdit?.(editingId, payload)
        showToast('success', `${title.replace(' Setup', '')} updated successfully.`)
      } else {
        await onAdd?.(payload)
        showToast('success', `${title.replace(' Setup', '')} added successfully.`)
      }

      closeModal()
    } catch (caught) {
      showToast('error', caught?.message ?? 'Could not save the record.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (deleteId == null) return

    try {
      await onDelete?.(deleteId)
      showToast('success', 'Record deactivated successfully.')
      setDeleteId(null)
    } catch (caught) {
      showToast('error', caught?.message ?? 'Could not deactivate the record.')
    }
  }

  const modalTitle = editingId
    ? `Edit ${title.replace(' Setup', '')}`
    : actionLabel.replace(/^\+ /, '')

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={breadcrumbs}
        action={
          formFields.length > 0 ? (
            <Button onClick={openAddModal} disabled={loading}>
              {actionLabel}
            </Button>
          ) : null
        }
      />

      <Card>
        <CardContent className="pt-4">
          <TableFilters
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={searchPlaceholder}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            statusOptions={statusOptions}
          />

          {loadError ? (
            <p className="mb-4 rounded-md bg-error-bg px-3 py-2 text-sm text-error-text">
              {loadError}
            </p>
          ) : null}

          {loading ? (
            <p className="py-10 text-center text-sm text-text-secondary">Loading records…</p>
          ) : filtered.length === 0 ? (
            <EmptyState message="No records found." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {columns.map((col) => (
                      <TableHead key={col.key}>{col.label}</TableHead>
                    ))}
                    <TableHead className={TABLE_ACTIONS_HEAD_CLASS}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => (
                    <TableRow key={row[rowIdKey]}>
                      {columns.map((col) => (
                        <TableCell key={col.key}>
                          {col.key === statusKey && row[col.key] ? (
                            <Badge variant={getStatusDisplay(row[col.key]).variant}>
                              {row[col.key]}
                            </Badge>
                          ) : col.key === 'stock' ? (
                            <div className="flex items-center gap-2">
                              <span className="font-semibold tabular-nums">
                                {formatStockQuantity(row.stock)}
                              </span>
                              {row.unit ? (
                                <span className="text-xs text-text-secondary">{row.unit}</span>
                              ) : null}
                              {row.stockStatus ? (
                                <Badge variant={getStatusDisplay(row.stockStatus).variant}>
                                  {row.stockStatus}
                                </Badge>
                              ) : null}
                            </div>
                          ) : (
                            row[col.key]
                          )}
                        </TableCell>
                      ))}
                      <TableCell className={TABLE_ACTIONS_CELL_CLASS}>
                        <TableActions
                          onEdit={formFields.length > 0 ? () => openEditModal(row) : undefined}
                          onDelete={
                            onDelete && row[statusKey] !== 'Inactive'
                              ? () => setDeleteId(row[rowIdKey])
                              : undefined
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={modalOpen} onClose={closeModal} title={modalTitle} size="md">
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div className="grid gap-4 sm:grid-cols-2">
            {formFields.map((field) => {
              const selectOptions = resolveSelectOptions(field, optionSources)

              return (
                <FormField
                  key={field.key}
                  label={field.label}
                  className={field.className ?? (field.type === 'textarea' ? 'sm:col-span-2' : undefined)}
                >
                  {field.type === 'select' ? (
                    <select
                      value={form[field.key]}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, [field.key]: event.target.value }))
                      }
                      className="flex h-9 w-full rounded-md border border-border-input bg-surface px-3 text-sm text-text-primary focus-visible:border-maroon focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-light"
                      required={isFieldRequired(field)}
                      disabled={submitting}
                    >
                      <option value="">Select...</option>
                      {selectOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'password' ? (
                    <div className="relative">
                      <Input
                        type={visiblePasswords[field.key] ? 'text' : 'password'}
                        value={form[field.key]}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, [field.key]: event.target.value }))
                        }
                        required={isFieldRequired(field)}
                        autoComplete={editingId == null ? 'new-password' : 'off'}
                        className="pr-10"
                        disabled={submitting}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setVisiblePasswords((prev) => ({
                            ...prev,
                            [field.key]: !prev[field.key],
                          }))
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-maroon"
                        aria-label={visiblePasswords[field.key] ? 'Hide password' : 'Show password'}
                      >
                        {visiblePasswords[field.key] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <Input
                      type={field.type ?? 'text'}
                      value={form[field.key]}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, [field.key]: event.target.value }))
                      }
                      required={isFieldRequired(field)}
                      autoComplete={
                        field.key === 'username' && editingId == null
                          ? 'off'
                          : (field.autoComplete ?? 'off')
                      }
                      disabled={submitting}
                    />
                  )}
                </FormField>
              )
            })}
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="secondary" onClick={closeModal} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : editingId ? 'Save Changes' : 'Add Record'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteId != null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Deactivate record?"
        message="This record will be marked as inactive."
        confirmLabel="Deactivate"
      />
    </div>
  )
}
