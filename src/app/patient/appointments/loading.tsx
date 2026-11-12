export default function Loading() {
  return (
    <div className="bg-background min-h-screen p-6 sm:p-8" aria-busy="true">
      <div className="mx-auto max-w-6xl animate-pulse space-y-6">
        <div className="border-border space-y-3 border-b pb-6">
          <div className="h-3 w-28 rounded bg-[#ebebeb]" />
          <div className="h-8 w-52 rounded bg-[#ebebeb]" />
          <div className="h-4 w-96 max-w-full rounded bg-[#ebebeb]" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="border-border bg-card h-24 rounded-lg border"
            />
          ))}
        </div>
        <div className="border-border bg-card h-96 rounded-lg border" />
      </div>
      <span className="sr-only">Cargando tus citas</span>
    </div>
  );
}
