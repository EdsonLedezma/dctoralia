"use client";
import { useCallback, useEffect, useRef } from "react";
import { ShieldCheck } from "lucide-react";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";

export type ConsultationDetails = {
  symptoms: string;
  allergies: string;
  medications: string;
  context: string;
};
export function ConsultationDetailsForm({
  value,
  onChange,
  disabled,
}: {
  value: ConsultationDetails;
  onChange: (value: ConsultationDetails) => void;
  disabled: boolean;
}) {
  const fields = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);
  const revealFocusedField = useCallback(() => {
    if (window.innerWidth >= 768) return;
    const field = document.activeElement;
    if (
      !(field instanceof HTMLElement) ||
      !fields.current?.contains(field) ||
      !field.matches("input,textarea")
    )
      return;
    const viewport = window.visualViewport;
    const top = viewport?.offsetTop ?? 0;
    const bottom = top + (viewport?.height ?? window.innerHeight);
    const actions = document
      .querySelector("[data-booking-actions]")
      ?.getBoundingClientRect();
    const navigation = document
      .querySelector('[aria-label="Navegación móvil"]')
      ?.getBoundingClientRect();
    const visibleBottom =
      Math.min(bottom, actions?.top ?? bottom, navigation?.top ?? bottom) - 16;
    const bounds = field.getBoundingClientRect();
    if (bounds.bottom > visibleBottom || bounds.top < top + 16)
      field.scrollIntoView({ block: "center", behavior: "instant" });
  }, []);
  useEffect(() => {
    window.visualViewport?.addEventListener("resize", revealFocusedField);
    return () => {
      window.visualViewport?.removeEventListener("resize", revealFocusedField);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [revealFocusedField]);
  return (
    <div
      ref={fields}
      className="space-y-5"
      onFocusCapture={() => {
        if (frame.current !== null) cancelAnimationFrame(frame.current);
        frame.current = requestAnimationFrame(revealFocusedField);
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="symptoms">
          Motivo de consulta{" "}
          <span className="text-muted-foreground">(obligatorio)</span>
        </Label>
        <Textarea
          id="symptoms"
          value={value.symptoms}
          disabled={disabled}
          onChange={(event) =>
            onChange({ ...value, symptoms: event.target.value })
          }
          maxLength={2000}
          minLength={3}
          placeholder="Cuéntale al médico qué necesitas atender"
          required
          aria-describedby="symptoms-help"
        />
        <p id="symptoms-help" className="text-muted-foreground text-xs">
          Escribe al menos 3 caracteres.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="allergies">Alergias conocidas</Label>
        <Input
          id="allergies"
          value={value.allergies}
          disabled={disabled}
          onChange={(event) =>
            onChange({ ...value, allergies: event.target.value })
          }
          maxLength={1000}
          placeholder="Medicamentos, alimentos u otras"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="medications">Medicamentos actuales</Label>
        <Input
          id="medications"
          value={value.medications}
          disabled={disabled}
          onChange={(event) =>
            onChange({ ...value, medications: event.target.value })
          }
          maxLength={1000}
          placeholder="Nombre y dosis, si la conoces"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="context">¿Algo más que debamos saber?</Label>
        <Textarea
          id="context"
          value={value.context}
          disabled={disabled}
          onChange={(event) =>
            onChange({ ...value, context: event.target.value })
          }
          maxLength={2000}
          placeholder="Padecimientos, estudios previos o dudas"
        />
      </div>
      <p className="text-muted-foreground bg-muted flex items-start gap-2 rounded-2xl p-4 text-xs leading-5">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" />
        Estas respuestas se comparten con el médico de esta cita. Los permisos
        de tu historial general se gestionan por separado.
      </p>
    </div>
  );
}
