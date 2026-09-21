export default function Loading() {
  return (
    <div className="min-h-screen bg-[#fafafa] p-6 sm:p-8" aria-busy="true">
      <div className="mx-auto max-w-6xl animate-pulse space-y-6">
        <div className="space-y-3 border-b border-[#ebebeb] pb-6">
          <div className="h-3 w-32 rounded bg-[#ebebeb]" />
          <div className="h-8 w-48 rounded bg-[#ebebeb]" />
          <div className="h-4 w-[28rem] max-w-full rounded bg-[#ebebeb]" />
        </div>
        <div className="h-11 rounded-md border border-[#ebebeb] bg-white" />
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
      <span className="sr-only">Cargando pacientes</span>
    </div>
  );
}
