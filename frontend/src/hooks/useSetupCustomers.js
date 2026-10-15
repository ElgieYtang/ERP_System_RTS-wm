import { useSetupResource } from '@/hooks/useSetupResource'
import { useMemo } from 'react'

export function useSetupCustomers() {
  const { rows, loading } = useSetupResource('customers')

  const customers = useMemo(
    () =>
      rows
        .filter((row) => row.status !== 'Inactive')
        .map((customer) => ({
          id: customer.id,
          name: customer.name ?? '',
          code: customer.code ?? '',
          address: customer.address ?? '',
          phone: customer.phone ?? '',
          tin: customer.tinNo ?? customer.tin ?? '',
          contactPerson: customer.contactPerson ?? '',
        })),
    [rows],
  )

  return { customers, loading }
}
