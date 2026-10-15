import { AccomplishmentReport } from '@/components/documents/AccomplishmentReport'
import { PrintActions } from '@/components/documents/DocumentLayout'
import { useToast } from '@/context/ToastContext'
import {
  deleteAccomplishmentPhoto,
  fetchAccomplishment,
  hydrateAccomplishmentImages,
  revokeHydratedImages,
  uploadAccomplishmentPhotos,
} from '@/lib/accomplishmentApi'
import { optimizeImageFile } from '@/lib/optimizeImage'
import { IMAGES_PER_PAGE, pageCountForImages } from '@/lib/reportPages'
import { Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

export function AccomplishmentPreviewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [report, setReport] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const reportRef = useRef(null)

  reportRef.current = report

  useEffect(() => {
    if (!id) {
      setIsLoading(false)
      return undefined
    }

    let cancelled = false

    setIsLoading(true)
    fetchAccomplishment(id)
      .then((data) => hydrateAccomplishmentImages(data))
      .then((hydrated) => {
        if (!cancelled) setReport(hydrated)
        else revokeHydratedImages(hydrated?.images)
      })
      .catch((caught) => {
        if (!cancelled) {
          setUploadError(caught?.message ?? 'Report could not be loaded.')
          setReport(null)
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
      revokeHydratedImages(reportRef.current?.images)
    }
  }, [id])

  const imageCount = report?.images?.length ?? 0
  const pageCount = pageCountForImages(imageCount)

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, pageCount))
  }, [pageCount])

  async function handleUpload(event) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!files.length || !report) return

    setIsOptimizing(true)
    setUploadError(null)

    try {
      const optimizedFiles = []
      for (const file of files) {
        const blob = await optimizeImageFile(file)
        const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
        optimizedFiles.push(new File([blob], name, { type: 'image/jpeg' }))
      }

      await uploadAccomplishmentPhotos(report.dbId || report.id, optimizedFiles)
      const refreshed = await hydrateAccomplishmentImages(
        await fetchAccomplishment(report.dbId || report.id),
      )
      revokeHydratedImages(report.images)
      setReport(refreshed)
      showToast('success', 'Pictures uploaded to the server.')
    } catch (caught) {
      setUploadError(caught?.message ?? 'One or more pictures could not be uploaded.')
    } finally {
      setIsOptimizing(false)
    }
  }

  async function handleRemoveImage(imageId) {
    if (!report) return

    try {
      await deleteAccomplishmentPhoto(report.dbId || report.id, imageId)
      const removed = report.images.find((image) => image.id === imageId)
      if (removed) revokeHydratedImages([removed])
      setReport((current) => ({
        ...current,
        images: (current?.images ?? []).filter((image) => image.id !== imageId),
      }))
      showToast('success', 'Picture removed.')
    } catch (caught) {
      setUploadError(caught?.message ?? 'Could not delete picture from the server.')
    }
  }

  if (isLoading) {
    return <p className="text-text-secondary">Loading accomplishment report…</p>
  }

  if (!report) {
    return (
      <p className="text-text-secondary">
        {uploadError || 'Accomplishment report not found.'}
      </p>
    )
  }

  const previewReport = {
    ...report,
    date: report.displayDate || report.date,
  }

  return (
    <div className="quotation-print-page">
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-secondary">
          {previewReport.id}: {imageCount} picture{imageCount === 1 ? '' : 's'} across {pageCount}{' '}
          page{pageCount === 1 ? '' : 's'} (maximum {IMAGES_PER_PAGE} pictures per page).
          {isOptimizing ? ' Optimizing and uploading…' : ''}
        </p>
        <label
          className={`inline-flex cursor-pointer items-center gap-2 rounded-md border border-maroon bg-surface px-4 py-2 text-sm font-medium text-maroon hover:bg-maroon-light ${
            isOptimizing ? 'pointer-events-none opacity-60' : ''
          }`}
        >
          <Upload className="h-4 w-4" />
          {isOptimizing ? 'Uploading…' : 'Upload pictures'}
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            disabled={isOptimizing}
            onChange={handleUpload}
          />
        </label>
      </div>

      {uploadError ? <p className="no-print mb-4 text-sm text-error-text">{uploadError}</p> : null}

      {pageCount > 1 ? (
        <nav
          className="no-print mb-4 flex flex-wrap items-center justify-center gap-2"
          aria-label="Report pages"
        >
          {Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => {
            const isActive = page === currentPage

            return (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                aria-current={isActive ? 'page' : undefined}
                className={`min-w-[2.25rem] rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-maroon text-white'
                    : 'border border-maroon text-maroon hover:bg-maroon-light'
                }`}
              >
                {page}
              </button>
            )
          })}
        </nav>
      ) : null}

      <div className="report-preview-frame report-preview-frame--paginated">
        <AccomplishmentReport
          report={previewReport}
          previewPage={currentPage}
          onRemoveImage={handleRemoveImage}
        />
      </div>

      <PrintActions onBack={() => navigate('/reports/accomplishment')} />
    </div>
  )
}
