import { Skeleton } from "~/components/ui/skeleton";

export default function BookingLoading() {
  return (
    <div className="min-h-screen bg-[#fafafa]">
      <header className="border-b border-[#ebebeb] bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-5 w-32" />
        </div>
      </header>
      <main className="mx-auto max-w-2xl space-y-8 px-4 py-8">
        <div className="flex items-center justify-between">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              {index < 3 && <Skeleton className="hidden h-px w-12 sm:block" />}
            </div>
          ))}
        </div>
        <div className="overflow-hidden rounded-lg border border-[#ebebeb] bg-white">
          <div className="border-b border-[#ebebeb] p-5">
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="grid gap-6 p-5 md:grid-cols-[minmax(0,1fr)_220px]">
            <Skeleton className="h-72 w-full rounded-lg" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 8 }).map((_, index) => (
                  <Skeleton key={index} className="h-9 w-full rounded-md" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
