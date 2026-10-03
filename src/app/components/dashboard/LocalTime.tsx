'use client'

import { useEffect, useState } from 'react'

type LocalTimeProps = {
  date?: string | null
}

export function LocalTime({ date }: LocalTimeProps) {
  const [label, setLabel] = useState('—')

  useEffect(() => {
    if (!date) {
      setLabel('—')
      return
    }

    const parsed = new Date(date)
    if (Number.isNaN(parsed.getTime())) {
      setLabel('—')
      return
    }

    setLabel(
      new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(parsed)
    )
  }, [date])

  return <time dateTime={date ?? undefined}>{label}</time>
}
