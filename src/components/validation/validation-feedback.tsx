"use client";

import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { api } from "~/trpc/react";
import { unwrapTrpcResult } from "~/types/trpc-response";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";

export function ValidationFeedback() {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const query = api.validationFeedback.list.useInfiniteQuery(
    {},
    {
      getNextPageParam: (lastPage) => lastPage.result?.nextCursor ?? undefined,
      staleTime: 60_000,
    },
  );
  const create = api.validationFeedback.create.useMutation();
  const notes =
    query.data?.pages.flatMap((page) => page.result?.items ?? []) ?? [];
  const first = query.data?.pages[0];
  const closesAt = first?.result?.closesAt;
  async function publish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (create.isPending) return;
    try {
      unwrapTrpcResult(await create.mutateAsync({ body }));
      setBody("");
      await query.refetch();
      toast.success("Gracias por ayudarnos a mejorar Dopilot.");
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo guardar la nota.",
      );
    }
  }
  if (first?.result?.enabled === false) return null;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="gap-1.5 px-2 text-xs"
          aria-label="Notas de la etapa de validación"
        >
          <MessageSquarePlus className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Feedback</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[85dvh] flex-col gap-4 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Estamos construyendo Dopilot contigo</DialogTitle>
          <DialogDescription className="pr-4 leading-6">
            Queremos que tu agenda, avisos y expediente trabajen juntos.
            Cuéntanos qué falta, qué confunde o qué te ahorraría tiempo.
          </DialogDescription>
        </DialogHeader>
        <p className="text-muted-foreground text-xs leading-5">
          Durante esta etapa, las notas son visibles para todos los usuarios de
          prueba. No incluyas datos de pacientes.
          {closesAt &&
            ` Disponible hasta ${new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeZone: "America/Mexico_City" }).format(closesAt)}.`}
        </p>
        <form onSubmit={publish} className="space-y-2 border-b pb-4">
          <Label htmlFor="validation-feedback-note">Tu nota</Label>
          <Textarea
            id="validation-feedback-note"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={2000}
            minLength={3}
            required
            disabled={create.isPending}
            placeholder="Por ejemplo: me ayudaría encontrar al paciente desde…"
            className="min-h-20 resize-y"
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground text-[11px]">
              {body.length}/2000
            </span>
            <Button
              type="submit"
              disabled={create.isPending || body.trim().length < 3}
            >
              {create.isPending ? "Publicando…" : "Publicar nota"}
            </Button>
          </div>
        </form>
        <section
          aria-label="Notas de validación"
          className="min-h-0 space-y-3 overflow-y-auto"
          aria-busy={query.isFetching}
        >
          {query.isLoading ? (
            <p className="text-muted-foreground py-4 text-sm">
              Cargando notas…
            </p>
          ) : query.isError || first?.error ? (
            <div role="alert" className="space-y-2">
              <p className="text-sm">No pudimos cargar las notas.</p>
              <Button
                type="button"
                variant="ghost"
                onClick={() => void query.refetch()}
              >
                Reintentar
              </Button>
            </div>
          ) : notes.length ? (
            notes.map((note) => (
              <article
                key={note.id}
                className="border-border rounded-xl border px-3 py-2.5"
              >
                <div className="text-muted-foreground mb-1 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <span className="text-foreground font-medium">
                    {note.author.name ?? "Usuario de prueba"}
                  </span>
                  <time dateTime={note.createdAt.toISOString()}>
                    {new Intl.DateTimeFormat("es-MX", {
                      dateStyle: "short",
                      timeStyle: "short",
                      timeZone: "America/Mexico_City",
                    }).format(note.createdAt)}
                  </time>
                </div>
                <p className="text-sm leading-6 break-words whitespace-pre-wrap">
                  {note.body}
                </p>
              </article>
            ))
          ) : (
            <p className="text-muted-foreground py-4 text-sm">
              Sé la primera persona en dejarnos una nota.
            </p>
          )}
          {query.hasNextPage && (
            <Button
              type="button"
              variant="ghost"
              className="w-full text-xs"
              disabled={query.isFetchingNextPage}
              onClick={() => void query.fetchNextPage()}
            >
              {query.isFetchingNextPage ? "Cargando…" : "Ver notas anteriores"}
            </Button>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}
