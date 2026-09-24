import { Skeleton } from "~/components/ui/skeleton";

export default function WorkspaceLoading() {
  return (
    <div className="min-h-[100dvh] bg-[#fafafa] px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-72 w-full rounded-lg" />
      </div>
    </div>
  );
}
