import { Skeleton } from "~/components/ui/skeleton";

export default function DoctorsLoading() {
  return (
    <div className="min-h-screen bg-[#fafafa] px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="flex flex-wrap gap-2 border-b border-[#ebebeb] pb-4">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center gap-4 border-b border-[#ebebeb] bg-white p-4"
            >
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-9 w-28" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
