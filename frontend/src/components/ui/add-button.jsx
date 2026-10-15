import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export function AddButton({ label = 'Add', onClick }) {
  return (
    <Button type="button" onClick={onClick}>
      <Plus className="h-4 w-4" />
      {label}
    </Button>
  )
}
