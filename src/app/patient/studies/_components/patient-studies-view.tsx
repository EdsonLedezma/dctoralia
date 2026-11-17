"use client";
import { useRef, useState } from "react";
import { z } from "zod";
import { Upload, FileText } from "lucide-react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { toast } from "sonner";

export function PatientStudiesView() {
  const query = api.patientPortalUploads.spaces.useQuery();
  const [spaceId, setSpaceId] = useState("");
  const [grantId, setGrantId] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [requestId, setRequestId] = useState("");
  const [resume, setResume] = useState<{
    grantId: string;
    requestId: string;
    filename: string;
  } | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const spaces = query.data?.result ?? [];
  const space = spaces.find((item) => item.id === spaceId) ?? spaces[0];
  const selectedGrant =
    space?.grants.find((grant) => grant.id === grantId) ??
    space?.grants.find((grant) => grant.remaining > 0) ??
    space?.grants[0];
  const remaining =
    space?.grants.reduce((sum, grant) => sum + grant.remaining, 0) ?? 0;
  const clearSelection = () => {
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
    setRequestId("");
    setAttempted(false);
    setResume(null);
  };
  async function upload() {
    if (!file || !selectedGrant || !requestId || uploading) return;
    if (resume && file.name !== resume.filename) {
      toast.error(`Selecciona el archivo original: ${resume.filename}`);
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error("El archivo supera los 4 MB.");
      return;
    }
    setGrantId(selectedGrant.id);
    setUploading(true);
    setAttempted(true);
    try {
      const response = await fetch("/api/patient-portal/files/upload", {
        method: "POST",
        headers: {
          "content-type": file.type,
          "x-upload-grant": selectedGrant.id,
          "x-upload-request": requestId,
          "x-file-name": encodeURIComponent(file.name),
        },
        body: file,
      });
      const result = z
        .object({ id: z.string().optional(), error: z.string().optional() })
        .parse(await response.json());
      if (!response.ok || !result.id)
        throw new Error(result.error ?? "No se pudo guardar el documento.");
      toast.success("Documento compartido con tu médico.");
      clearSelection();
      setGrantId("");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo cargar el archivo.",
      );
    } finally {
      setUploading(false);
      await query.refetch();
    }
  }
  return (
    <section className="mx-auto max-w-4xl space-y-5 px-4 py-6 sm:px-7">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Mis estudios</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Comparte archivos con el médico que te atiende. Cada consulta
          finalizada habilita dos espacios.
        </p>
      </header>
      {query.isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : query.isError || query.data?.error ? (
        <div role="alert" className="space-y-3">
          <p className="text-sm">No se pudieron cargar tus documentos.</p>
          <Button variant="outline" onClick={() => void query.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : !space ? (
        <div className="border-border rounded-2xl border p-5 text-sm">
          <p>Aún no tienes un consultorio habilitado.</p>
          <p className="text-muted-foreground mt-2">
            Tu médico puede invitarte después de atenderte; no necesitas crear
            otra cuenta.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-4">
            <div className="min-w-48 flex-1 space-y-2">
              <Label htmlFor="studies-doctor">Mis doctores</Label>
              <select
                id="studies-doctor"
                value={space.id}
                disabled={uploading}
                onChange={(event) => {
                  setSpaceId(event.target.value);
                  setGrantId("");
                  clearSelection();
                }}
                className="border-border bg-background min-h-11 w-full rounded-xl border px-3 text-sm"
              >
                {spaces.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.doctor.user.name} · {item.clinic.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-sm">
              <span className="text-lg font-semibold tabular-nums">
                {remaining}
              </span>
              <span className="text-muted-foreground ml-2">
                espacios disponibles
              </span>
            </div>
          </div>
          {space.pendingUploads.length > 0 && (
            <section
              aria-label="Envíos pendientes"
              className="border-border space-y-2 rounded-2xl border p-4"
            >
              <h2 className="text-sm font-medium">Retomar un envío</h2>
              <p className="text-muted-foreground text-xs">
                Selecciona el mismo archivo para continuar sin reservar otro
                espacio.
              </p>
              {space.pendingUploads.map((upload) => (
                <div
                  key={upload.id}
                  className="flex min-h-11 items-center justify-between gap-3 text-sm"
                >
                  <span className="min-w-0 truncate">{upload.filename}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={uploading}
                    onClick={() => {
                      clearSelection();
                      setGrantId(upload.grantId);
                      setRequestId(upload.requestId);
                      setAttempted(true);
                      setResume(upload);
                    }}
                  >
                    Retomar
                  </Button>
                </div>
              ))}
            </section>
          )}
          <div className="border-border space-y-4 rounded-2xl border p-4">
            <div className="space-y-2">
              <Label htmlFor="studies-consultation">
                Consulta de referencia
              </Label>
              <select
                id="studies-consultation"
                value={selectedGrant?.id ?? ""}
                disabled={uploading}
                onChange={(event) => {
                  setGrantId(event.target.value);
                  clearSelection();
                }}
                className="border-border bg-background min-h-11 w-full rounded-xl border px-3 text-sm"
              >
                {space.grants.map((grant) => (
                  <option key={grant.id} value={grant.id}>
                    {new Intl.DateTimeFormat("es-MX", {
                      dateStyle: "medium",
                    }).format(grant.consultationAt)}{" "}
                    · {grant.remaining} de 2 disponibles
                  </option>
                ))}
                {!space.grants.length && (
                  <option value="">Sin consultas finalizadas</option>
                )}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="patient-study-file">Archivo</Label>
              <Input
                ref={inputRef}
                id="patient-study-file"
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                disabled={
                  uploading ||
                  !selectedGrant ||
                  (!selectedGrant.remaining && !resume)
                }
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                  setRequestId(resume?.requestId ?? crypto.randomUUID());
                  setAttempted(Boolean(resume));
                }}
              />
            </div>
            <p className="text-muted-foreground text-xs leading-5">
              PDF, JPG, PNG o WebP; máximo 4 MB. Un archivo ocupa un espacio. Si
              el envío falla después de reservarlo, puedes reintentar el mismo
              archivo sin gastar otro espacio; para cambiarlo contacta a tu
              médico.
            </p>
            {file && <p className="text-sm">Seleccionado: {file.name}</p>}
            <Button
              onClick={() => void upload()}
              disabled={
                uploading ||
                !file ||
                !selectedGrant ||
                (!selectedGrant.remaining && !attempted)
              }
            >
              <Upload className="size-4" />
              {uploading
                ? "Guardando…"
                : attempted
                  ? "Reintentar envío"
                  : "Compartir con mi médico"}
            </Button>
          </div>
          <section
            aria-label="Documentos compartidos"
            className="divide-border divide-y rounded-2xl border"
          >
            {!space.files.length ? (
              <p className="text-muted-foreground p-5 text-sm">
                Todavía no has compartido archivos con este médico.
              </p>
            ) : (
              space.files.map((item) => (
                <a
                  key={item.id}
                  href={`/api/patient-portal/files/${item.id}`}
                  className="hover:bg-muted/40 flex min-h-16 items-center gap-3 px-4 py-3 transition-colors"
                >
                  <FileText className="text-muted-foreground size-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {item.originalFilename}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {Math.ceil(item.sizeBytes / 1024)} KB ·{" "}
                      {new Intl.DateTimeFormat("es-MX", {
                        dateStyle: "medium",
                      }).format(item.createdAt)}
                    </p>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    Descargar
                  </span>
                </a>
              ))
            )}
          </section>
        </>
      )}
    </section>
  );
}
