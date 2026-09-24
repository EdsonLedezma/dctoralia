"use client";

import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { api } from "~/trpc/react";
import { unwrapTrpcResult } from "~/types/trpc-response";

const labels = {
  PENDING: "En cola",
  PROCESSING: "Procesando",
  SENT: "Aceptado",
  DELIVERED: "Entregado",
  READ: "Leído",
  FAILED: "Reintentando",
  DEAD_LETTER: "Requiere revisión",
  CANCELLED: "Cancelado",
};

export function MessagingSettings() {
  const query = api.messaging.list.useQuery();
  const test = api.messaging.test.useMutation();
  async function queueTest() {
    try {
      const response = await test.mutateAsync();
      unwrapTrpcResult(response);
      toast.success(response.message);
      await query.refetch();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo preparar la prueba",
      );
    }
  }
  if (query.isLoading) return <Skeleton className="h-24 w-full" />;
  const data = query.data?.result;
  return (
    <section aria-label="Comunicaciones" className="space-y-3 border-b py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium">
            Comunicaciones{" "}
            <span className="text-muted-foreground ml-2 font-normal">
              {data?.enabled ? "Dispatcher habilitado" : "Desactivadas"}
            </span>
          </h2>
          <p className="text-muted-foreground mt-1 text-xs">
            La prueba usa sandbox y tu propio teléfono. No envía mensajes a
            pacientes.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
          >
            Actualizar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void queueTest()}
            disabled={!data?.enabled || test.isPending}
          >
            {test.isPending ? "Preparando…" : "Probar en sandbox"}
          </Button>
        </div>
      </div>
      {!data ? (
        <p role="alert" className="text-muted-foreground text-sm">
          {query.data?.message ?? "No se pudieron cargar las comunicaciones."}
        </p>
      ) : data.messages.length === 0 ? (
        <p className="text-muted-foreground py-4 text-sm">
          No hay mensajes registrados.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plantilla</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Intentos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.messages.map((message) => (
              <TableRow key={message.id}>
                <TableCell className="max-w-52 truncate">
                  {message.template}
                  <span className="text-muted-foreground ml-2 text-xs">
                    {message.sandbox ? "Sandbox" : message.channel}
                  </span>
                </TableCell>
                <TableCell>
                  <span>{labels[message.status]}</span>
                  {message.lastErrorCode && (
                    <p className="text-muted-foreground text-xs">
                      {message.lastErrorCode}
                    </p>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {message.attempts}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
