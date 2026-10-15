import { fetchTransactionList } from '@/lib/transactionListApi'
import { useCallback, useEffect, useState } from 'react'

export function useServerPagedList(
  path,
  { page, perPage = 10, filters = {}, all = false, enabled = true } = {},
) {
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    perPage,
    totalPages: 1,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(null)
    try {
      const result = await fetchTransactionList(path, {
        page,
        perPage,
        all,
        ...filters,
      })
      setItems(result.items)
      setMeta(result.meta)
    } catch (caught) {
      setError(caught?.message ?? 'Could not load list.')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [path, page, perPage, all, enabled, JSON.stringify(filters)])

  useEffect(() => {
    reload()
  }, [reload])

  return { items, meta, loading, error, reload }
}
