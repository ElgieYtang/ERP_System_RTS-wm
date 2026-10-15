import { useSetupResource } from '@/hooks/useSetupResource'
import { useMemo } from 'react'

export function useSetupItems() {
  const { rows, loading } = useSetupResource('items')

  const items = useMemo(
    () =>
      rows
        .filter((row) => row.status !== 'Inactive')
        .map((item) => ({
          id: item.id,
          code: item.code ?? '',
          name: item.name ?? '',
          unit: item.unit ?? '',
          unitPrice: Number(item.unitPrice ?? item.price ?? 0) || 0,
          barcode: item.barcode ?? '',
        })),
    [rows],
  )

  return { items, loading }
}
