import { useSetupResource } from '@/hooks/useSetupResource'
import { useMemo } from 'react'

export function useSetupSuppliers() {
  const { rows, loading } = useSetupResource('suppliers')

  const suppliers = useMemo(
    () =>
      rows
        .filter((row) => row.status !== 'Inactive')
        .map((supplier) => ({
          id: supplier.id,
          name: supplier.name ?? '',
          address: supplier.address ?? '',
          phone: supplier.phone ?? supplier.contact ?? '',
        })),
    [rows],
  )

  return { suppliers, loading }
}
