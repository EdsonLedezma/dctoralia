"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { api } from "~/trpc/react";
import { unwrapTrpcResult } from "~/types/trpc-response";

const statusLabels = {
  ACTIVE: "Activa",
  TRIALING: "En prueba",
  PAUSED: "Sin activar",
  PAST_DUE: "Pago pendiente",
  CANCELED: "Cancelada",
};

export function BillingSettings() {
  const query = api.billing.summary.useQuery();
  const checkout = api.billing.checkout.useMutation();
  const portal = api.billing.portal.useMutation();
  const [plan, setPlan] = useState<"PRO" | "ENTERPRISE" | "CUSTOM">("PRO");
  const pending = checkout.isPending || portal.isPending;
  async function openBilling(kind: "checkout" | "portal") {
    try {
      const result = unwrapTrpcResult(
        kind === "checkout"
          ? await checkout.mutateAsync({ plan })
          : await portal.mutateAsync(),
      );
      window.location.assign(result.url);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo abrir facturación",
      );
    }
  }
  if (query.isLoading) return <Skeleton className="h-24 w-full" />;
  const data = query.data?.result;
  if (!data)
    return (
      <div
        role="alert"
        className="text-muted-foreground flex flex-wrap items-center gap-3 border-b py-4 text-sm"
      >
        {query.data?.message ?? "No se pudo cargar facturación."}
        <Button variant="ghost" size="sm" onClick={() => void query.refetch()}>
          Reintentar
        </Button>
      </div>
    );
  const canCheckout = !data.hasSubscription || data.status === "CANCELED";
  return (
    <section
      aria-label="Suscripción y facturación"
      className="space-y-4 border-b py-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1 text-sm">
          <p className="font-medium">
            {data.plan === "PRO"
              ? "Pro"
              : data.plan === "ENTERPRISE"
                ? "Enterprise"
                : "Custom"}
            <span className="text-muted-foreground ml-2 font-normal">
              {statusLabels[data.status]}
            </span>
          </p>
          <p className="text-muted-foreground text-xs">
            {data.monthlyPriceMxn !== null
              ? `$${data.monthlyPriceMxn.toLocaleString("es-MX")} MXN / mes`
              : "Precio según contrato"}{" "}
            ·{" "}
            {data.includedMessagingMxn !== null
              ? `$${data.includedMessagingMxn} MXN de mensajería incluidos`
              : "Mensajería según contrato"}
          </p>
          {data.currentPeriodEnd && (
            <p className="text-muted-foreground text-xs">
              {data.cancelAtPeriodEnd ? "Finaliza" : "Próximo periodo"}:{" "}
              {new Date(data.currentPeriodEnd).toLocaleDateString("es-MX")}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            Actualizar estado
          </Button>
          {data.hasCustomer && (
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => void openBilling("portal")}
            >
              Administrar pagos
            </Button>
          )}
        </div>
      </div>
      {canCheckout && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select
            value={plan}
            onValueChange={(value) => {
              if (
                value === "PRO" ||
                value === "ENTERPRISE" ||
                value === "CUSTOM"
              )
                setPlan(value);
            }}
            disabled={pending}
          >
            <SelectTrigger
              aria-label="Plan de suscripción"
              className="w-full sm:w-72"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PRO">Pro · doctor independiente</SelectItem>
              <SelectItem value="ENTERPRISE">
                Enterprise · clínica u hospital
              </SelectItem>
              <SelectItem value="CUSTOM">
                Custom · desarrollo y mensajería extendida
              </SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            disabled={pending}
            onClick={() => void openBilling("checkout")}
          >
            {checkout.isPending ? "Abriendo…" : "Continuar a Stripe"}
          </Button>
          <p className="text-muted-foreground text-xs">
            Se activa al confirmar el pago.
          </p>
        </div>
      )}
    </section>
  );
}
