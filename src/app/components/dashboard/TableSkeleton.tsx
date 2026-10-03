import { Skeleton } from '@/components/ui/skeleton'

export function TableSkeleton() {
  return (
    <section
      aria-busy="true"
      aria-label="Loading dashboard data"
      className="min-h-[350px] rounded-xl border bg-card p-6 shadow-sm"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-40" />
        </div>
      </div>

      <div aria-hidden="true" className="overflow-x-auto">
        <div className="min-w-[42rem] space-y-3">
          <div className="grid grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={`head-${index}`} className="h-4 w-full" />
            ))}
          </div>

          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`row-${index}`} className="grid grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((__, cellIndex) => (
                <Skeleton key={`cell-${index}-${cellIndex}`} className="h-10 w-full" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
