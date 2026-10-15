import { request } from '@/lib/api'

export function buildListQuery({ page = 1, perPage = 10, all = false, ...filters } = {}) {
  const params = new URLSearchParams()

  if (all) {
    params.set('all', '1')
  } else {
    params.set('page', String(page))
    params.set('per_page', String(perPage))
  }

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    if (value === 'all') return
    params.set(key, String(value))
  })

  return params.toString()
}

export async function fetchTransactionList(path, options = {}) {
  const query = buildListQuery(options)
  const payload = await request(`${path}?${query}`)

  return {
    items: payload.data ?? [],
    meta: payload.meta ?? {
      total: payload.data?.length ?? 0,
      page: 1,
      perPage: payload.data?.length ?? 0,
      totalPages: 1,
    },
  }
}

export function fetchDashboardStats() {
  return request('/dashboard/stats').then((payload) => payload.data ?? {})
}
