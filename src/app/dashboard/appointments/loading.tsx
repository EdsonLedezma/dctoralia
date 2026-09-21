export default function Loading() {
  return (
    <div className="min-h-screen bg-[#fafafa] p-6 sm:p-8" aria-busy="true">
      <div className="mx-auto max-w-6xl animate-pulse space-y-6">
        <div className="space-y-3 border-b border-[#ebebeb] pb-6">
          <div className="h-3 w-28 rounded bg-[#ebebeb]" />
          <div className="h-8 w-64 rounded bg-[#ebebeb]" />
          <div className="h-4 w-96 max-w-full rounded bg-[#ebebeb]" />
        </div>
        <div className="h-20 rounded-lg border border-[#ebebeb] bg-white" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="h-[30rem] rounded-lg border border-[#ebebeb] bg-white lg:col-span-2" />
          <div className="h-[30rem] rounded-lg border border-[#ebebeb] bg-white" />
        </div>
      </div>
      <span className="sr-only">Cargando agenda</span>
    </div>
  );
}
