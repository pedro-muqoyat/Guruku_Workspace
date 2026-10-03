'use client'

import { useState } from 'react'
import GradeMatrixForm from '@/app/components/apps/grades/GradeMatrixForm'
import DataIngestion from '@/app/components/features/DataIngestion'

export default function GradesEntryTabs() {
  const [mode, setMode] = useState<'manual' | 'upload'>('manual')

  return (
    <div className="space-y-6">
      <div className="inline-flex rounded-md border border-border bg-muted p-1">
        <button
          className={`rounded-md px-4 py-2 text-sm font-medium transition ${mode === 'manual' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
          onClick={() => setMode('manual')}
          type="button"
        >
          Input Manual
        </button>
        <button
          className={`rounded-md px-4 py-2 text-sm font-medium transition ${mode === 'upload' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
          onClick={() => setMode('upload')}
          type="button"
        >
          Upload CSV
        </button>
      </div>

      {mode === 'manual' ? <GradeMatrixForm /> : <DataIngestion />}
    </div>
  )
}
