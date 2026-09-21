export default function Loading() {
  return (
    <div className="min-h-screen bg-[#fafafa] p-6 sm:p-8" aria-busy="true">
      <div className="mx-auto max-w-6xl animate-pulse space-y-6">
        <div className="space-y-3 border-b border-[#ebebeb] pb-6">
          <div className="h-3 w-28 rounded bg-[#ebebeb]" />
          <div className="h-8 w-52 rounded bg-[#ebebeb]" />
          <div className="h-4 w-96 max-w-full rounded bg-[#ebebeb]" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="h-24 rounded-lg border border-[#ebebeb] bg-white"
            />
          ))}
        </div>
        <div className="h-96 rounded-lg border border-[#ebebeb] bg-white" />
      </div>
      <span className="sr-only">Cargando tus citas</span>
    </div>
  );
}
