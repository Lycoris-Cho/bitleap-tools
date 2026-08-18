import { tools } from '@/app/tools'
import { usePathname } from 'next/navigation'

export function useCurrentTool() {
  const pathname = usePathname()
  return tools.find((tool) => tool.href === pathname) || null
}