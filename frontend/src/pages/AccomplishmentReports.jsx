import { PageHeader } from '@/components/layout/PageHeader'
import { TABLE_ACTIONS_CELL_CLASS, TABLE_ACTIONS_HEAD_CLASS, TableActions } from '@/components/ui/action-menu'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FormField, Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableLink,
  TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/components/ui/table-filters'
import { useToast } from '@/context/ToastContext'
import { useSetupResource } from '@/hooks/useSetupResource'
import {
  createAccomplishment,
  fetchAccomplishments,
  updateAccomplishment,
} from '@/lib/accomplishmentApi'
import { getStatusDisplay } from '@/lib/status'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function AccomplishmentReportsPage() {
  const { showToast } = useToast()
  const { rows: projects, loading: projectsLoading } = useSetupResource('projects')
  const navigate = useNavigate()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({
    projectId: '',
    date: new Date().toISOString().slice(0, 10),
    remarks: '',
    status: 'pending',
  })

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchAccomplishments()
      setReports(data.filter((row) => row.status !== 'inactive'))
    } catch (caught) {
      showToast('error', caught?.message ?? 'Could not load accomplishment reports.')
      setReports([])
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    refresh()
  }, [refresh])

  const openPrint = (reportId) => {
    navigate(`/reports/accomplishment/${reportId}/preview`)
  }

  const handleCreate = async () => {
    if (!form.projectId) {
      showToast('error', 'Select a project.')
      return
    }

    setBusy(true)
    try {
      const payload = await createAccomplishment({
        projectId: Number(form.projectId),
        date: form.date || undefined,
        remarks: form.remarks || undefined,
        status: form.status,
      })
      showToast('success', `Report ${payload.data?.id ?? ''} created.`)
      setCreateOpen(false)
      setForm({
        projectId: '',
        date: new Date().toISOString().slice(0, 10),
        remarks: '',
        status: 'pending',
      })
      await refresh()
      if (payload.data?.id) openPrint(payload.data.id)
    } catch (caught) {
      showToast('error', caught?.message ?? 'Could not create report.')
    } finally {
      setBusy(false)
    }
  }

  const handleApprove = async (report) => {
    setBusy(true)
    try {
      await updateAccomplishment(report.id, { status: 'approved' })
      showToast('success', 'Report approved.')
      await refresh()
    } catch (caught) {
      showToast('error', caught?.message ?? 'Could not update report.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Accomplishment Reports"
        description="Project accomplishment reports with server-stored pictures."
        action={<Button onClick={() => setCreateOpen(true)}>New Report</Button>}
      />

      {loading ? (
        <p className="mb-4 text-sm text-text-secondary">Loading reports…</p>
      ) : null}

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Report No.</TableHead>
            <TableHead>Project Name</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Pictures</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className={TABLE_ACTIONS_HEAD_CLASS}>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={6}>
                <EmptyState message="No accomplishment reports yet." />
              </TableCell>
            </TableRow>
          ) : (
            reports.map((report) => {
              const st = getStatusDisplay(report.status)
              return (
                <TableRow key={report.id}>
                  <TableCell>
                    <TableLink onClick={() => openPrint(report.id)}>{report.id}</TableLink>
                  </TableCell>
                  <TableCell>{report.projectName}</TableCell>
                  <TableCell>{report.displayDate || report.date}</TableCell>
                  <TableCell>{report.images?.length ?? 0}</TableCell>
                  <TableCell>
                    <Badge variant={st.variant}>{st.label}</Badge>
                  </TableCell>
                  <TableCell className={TABLE_ACTIONS_CELL_CLASS}>
                    <div className="flex items-center justify-center gap-2">
                      {report.status !== 'approved' ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busy}
                          onClick={() => handleApprove(report)}
                        >
                          Approve
                        </Button>
                      ) : null}
                      <TableActions onPrint={() => openPrint(report.id)} />
                    </div>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Accomplishment Report" size="md">
        <div className="space-y-4">
          <FormField label="Project">
            <select
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={form.projectId}
              disabled={projectsLoading}
              onChange={(e) => setForm({ ...form, projectId: e.target.value })}
            >
              <option value="">Select project…</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Date">
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </FormField>
          <FormField label="Remarks">
            <Input
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
            />
          </FormField>
          <FormField label="Status">
            <select
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
            </select>
          </FormField>
          <Button disabled={busy} onClick={handleCreate}>
            {busy ? 'Creating…' : 'Create Report'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
