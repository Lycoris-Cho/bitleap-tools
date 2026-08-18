'use client'

import { Suspense } from 'react'
import GradientClient from './GradientClient'

export const dynamic = 'force-dynamic'

export default function GradientPage() {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto py-12 px-4 text-app-muted text-sm">加载中...</div>}>
      <GradientClient />
    </Suspense>
  )
}