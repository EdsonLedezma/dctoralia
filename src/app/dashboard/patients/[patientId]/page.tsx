"use client";

import {
  use,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Activity,
  ArrowLeft,
  CalendarClock,
  Check,
  FilePlus2,
  FolderPlus,
  PencilLine,
} from "lucide-react";

import DashboardWrapper from "~/components/auth/DashboardWrapper";
import { ProductShell } from "~/components/shell/product-shell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Skeleton } from "~/components/ui/skeleton";
import { Textarea } from "~/components/ui/textarea";
import { api, type RouterOutputs } from "~/trpc/react";

type Props = { params: Promise<{ patientId: string }> };
type ClinicalTimeline = NonNullable<
  RouterOutputs["clinical"]["patientTimeline"]["result"]
>;
type OutcomePoint = ClinicalTimeline["outcomeAssessments"][number];

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function ClinicalPatientPage({ params }: Props) {
  const { patientId } = use(params);
  const utils = api.useUtils();
  const timeline = api.clinical.patientTimeline.useQuery({ patientId });
  const [episodeId, setEpisodeId] = useState("");
  const [episodeTitle, setEpisodeTitle] = useState("");
  const [encounterId, setEncounterId] = useState("");
  const [signingEncounterId, setSigningEncounterId] = useState("");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [subjective, setSubjective] = useState("");
  const [objective, setObjective] = useState("");
  const [assessment, setAssessment] = useState("");
  const [plan, setPlan] = useState("");
  const [amendingEncounterId, setAmendingEncounterId] = useState("");
  const [amendmentReason, setAmendmentReason] = useState("");
  const [amendmentAssessment, setAmendmentAssessment] = useState("");
  const [amendmentPlan, setAmendmentPlan] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDetails, setTaskDetails] = useState("");
  const [taskDueAt, setTaskDueAt] = useState("");
  const [instrumentCode, setInstrumentCode] = useState("");
  const [instrumentVersion, setInstrumentVersion] = useState("");
  const [score, setScore] = useState("");
  const [scoreMin, setScoreMin] = useState("");
  const [scoreMax, setScoreMax] = useState("");

  useEffect(() => {
    const activeEpisode = timeline.data?.result?.episodes.find(
      (episode) => episode.status === "ACTIVE",
    );
    if (!episodeId && activeEpisode) {
      setEpisodeId(activeEpisode.id);
    }
  }, [episodeId, timeline.data?.result?.episodes]);

  const invalidateTimeline = async () => {
    await Promise.all([
      utils.clinical.patientTimeline.invalidate({ patientId }),
      utils.clinical.operationalAnalytics.invalidate(),
      utils.clinical.listFollowUpTasks.invalidate(),
    ]);
  };

  const openEpisode = api.clinical.openEpisode.useMutation({
    onSuccess: async (response) => {
      if (response.error || !response.result) {
        toast.error(response.message);
        return;
      }
      setEpisodeId(response.result.id);
      setEpisodeTitle("");
      toast.success("Episodio de atención abierto");
      await invalidateTimeline();
    },
    onError: (error) => toast.error(error.message),
  });

  const createEncounter = api.clinical.createEncounterDraft.useMutation();
  const updateEncounter = api.clinical.updateEncounterDraft.useMutation();
  const signEncounter = api.clinical.signEncounter.useMutation({
    onSuccess: async (response) => {
      if (response.error) {
        toast.error(response.message);
        return;
      }
      setEncounterId("");
      setChiefComplaint("");
      setSubjective("");
      setObjective("");
      setAssessment("");
      setPlan("");
      toast.success("Consulta firmada y cerrada");
      await invalidateTimeline();
    },
    onError: (error) => toast.error(error.message),
  });
  const amendEncounter = api.clinical.amendEncounter.useMutation({
    onSuccess: async (response) => {
      if (response.error) {
        toast.error(response.message);
        return;
      }
      setAmendingEncounterId("");
      setAmendmentReason("");
      setAmendmentAssessment("");
      setAmendmentPlan("");
      toast.success("Enmienda agregada al expediente");
      await invalidateTimeline();
    },
    onError: (error) => toast.error(error.message),
  });
  const createTask = api.clinical.createFollowUpTask.useMutation({
    onSuccess: async (response) => {
      if (response.error) {
        toast.error(response.message);
        return;
      }
      setTaskTitle("");
      setTaskDetails("");
      setTaskDueAt("");
      toast.success("Seguimiento agregado");
      await invalidateTimeline();
    },
    onError: (error) => toast.error(error.message),
  });
  const recordAssessment = api.clinical.recordOutcomeAssessment.useMutation({
    onSuccess: async (response) => {
      if (response.error) {
        toast.error(response.message);
        return;
      }
      setScore("");
      toast.success("Medición registrada");
      await invalidateTimeline();
    },
    onError: (error) => toast.error(error.message),
  });

  const submitEpisode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (episodeTitle.trim().length < 2) return;
    openEpisode.mutate({ patientId, title: episodeTitle.trim() });
  };

  const submitEncounter = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = {
      chiefComplaint: chiefComplaint.trim() || null,
      subjective: subjective.trim() || null,
      objective: objective.trim() || null,
      assessment: assessment.trim() || null,
      plan: plan.trim() || null,
    };
    try {
      const response = encounterId
        ? await updateEncounter.mutateAsync({ encounterId, ...values })
        : await createEncounter.mutateAsync({
            patientId,
            episodeId: episodeId || undefined,
            ...values,
          });
      if (response.error || !response.result) {
        toast.error(response.message);
        return;
      }
      setEncounterId(response.result.id);
      toast.success("Borrador guardado");
      await invalidateTimeline();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo guardar",
      );
    }
  };

  const startEditingDraft = (encounter: {
    id: string;
    chiefComplaint: string | null;
    subjective: string | null;
    objective: string | null;
    assessment: string | null;
    plan: string | null;
  }) => {
    setEncounterId(encounter.id);
    setChiefComplaint(encounter.chiefComplaint ?? "");
    setSubjective(encounter.subjective ?? "");
    setObjective(encounter.objective ?? "");
    setAssessment(encounter.assessment ?? "");
    setPlan(encounter.plan ?? "");
    document.getElementById("encounter-form")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const submitTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!episodeId || !taskTitle.trim()) {
      toast.error("Abre o selecciona un episodio y escribe el siguiente paso.");
      return;
    }
    createTask.mutate({
      patientId,
      episodeId,
      title: taskTitle.trim(),
      details: taskDetails.trim() || undefined,
      type: "OTHER",
      priority: "NORMAL",
      dueAt: taskDueAt ? new Date(taskDueAt) : undefined,
    });
  };

  const submitOutcome = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const numericScore = Number(score);
    if (!episodeId || !instrumentCode.trim() || !instrumentVersion.trim()) {
      toast.error(
        "Selecciona un episodio e indica el instrumento y su versión.",
      );
      return;
    }
    if (!Number.isFinite(numericScore)) {
      toast.error("Escribe una puntuación numérica válida.");
      return;
    }
    recordAssessment.mutate({
      episodeId,
      instrumentCode: instrumentCode.trim(),
      instrumentVersion: instrumentVersion.trim(),
      score: numericScore,
      scoreMin: scoreMin === "" ? undefined : Number(scoreMin),
      scoreMax: scoreMax === "" ? undefined : Number(scoreMax),
      responses: { score: numericScore },
      completedItemCount: 1,
      totalItemCount: 1,
    });
  };

  const result = timeline.data?.result;

  return (
    <DashboardWrapper allowedRoles={["DOCTOR"]}>
      <ProductShell role="DOCTOR">
        <main className="min-h-[calc(100dvh-3.5rem)] bg-[#fafafa] px-4 py-8 sm:px-8">
          <div className="mx-auto max-w-6xl space-y-7">
            <Link
              href="/dashboard/patients"
              className="inline-flex items-center gap-2 text-xs text-[#737373] hover:text-[#171717]"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Pacientes
            </Link>

            {timeline.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-60 w-full" />
              </div>
            ) : timeline.error || timeline.data?.error || !result ? (
              <section className="rounded-lg border border-[#ebebeb] bg-white p-8">
                <h1 className="text-lg font-semibold text-[#171717]">
                  No se pudo abrir la ficha clínica
                </h1>
                <p className="mt-2 text-sm text-[#737373]">
                  Confirma que el paciente pertenece a tu seguimiento y vuelve a
                  intentarlo.
                </p>
              </section>
            ) : (
              <>
                <header className="flex flex-col gap-3 border-b border-[#ebebeb] pb-6 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="mb-2 font-mono text-[11px] tracking-[0.08em] text-[#888] uppercase">
                      Expediente de seguimiento
                    </p>
                    <h1 className="text-[26px] leading-8 font-semibold tracking-[-0.8px] text-[#171717]">
                      {result.patient.user.name}
                    </h1>
                    <p className="mt-2 text-sm text-[#737373]">
                      {result.patient.birthDate
                        ? `Nacimiento ${new Intl.DateTimeFormat("es-MX", { dateStyle: "long" }).format(new Date(result.patient.birthDate))}`
                        : "Fecha de nacimiento no registrada"}
                      {result.patient.gender
                        ? ` · ${result.patient.gender}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded border border-[#ebebeb] bg-white px-2.5 py-1.5 text-[#525252]">
                      {
                        result.episodes.filter(
                          (episode) => episode.status === "ACTIVE",
                        ).length
                      }{" "}
                      episodios activos
                    </span>
                    <span className="rounded border border-[#ebebeb] bg-white px-2.5 py-1.5 text-[#525252]">
                      {
                        result.followUpTasks.filter(
                          (task) =>
                            task.status === "OPEN" ||
                            task.status === "IN_PROGRESS",
                        ).length
                      }{" "}
                      seguimientos abiertos
                    </span>
                  </div>
                </header>

                <section className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
                  <div className="space-y-6">
                    <section className="rounded-lg border border-[#ebebeb] bg-white">
                      <div className="border-b border-[#ebebeb] px-5 py-4">
                        <div className="flex items-center gap-2">
                          <FolderPlus className="h-4 w-4 text-[#737373]" />
                          <h2 className="text-sm font-semibold text-[#171717]">
                            Episodios de atención
                          </h2>
                        </div>
                      </div>
                      <div className="space-y-4 p-5">
                        {result.episodes.some(
                          (episode) => episode.status === "ACTIVE",
                        ) && (
                          <label className="block max-w-lg">
                            <span className="mb-1.5 block text-xs text-[#737373]">
                              Episodio activo
                            </span>
                            <select
                              value={episodeId}
                              onChange={(event) =>
                                setEpisodeId(event.target.value)
                              }
                              className="h-9 w-full rounded-md border border-[#ebebeb] bg-white px-3 text-sm text-[#171717] outline-none focus-visible:ring-2 focus-visible:ring-[#171717]/20"
                            >
                              {result.episodes
                                .filter(
                                  (episode) => episode.status === "ACTIVE",
                                )
                                .map((episode) => (
                                  <option key={episode.id} value={episode.id}>
                                    {episode.title} · Activo
                                  </option>
                                ))}
                            </select>
                          </label>
                        )}
                        <form
                          onSubmit={submitEpisode}
                          className="flex flex-col gap-2 sm:flex-row"
                        >
                          <Input
                            value={episodeTitle}
                            onChange={(event) =>
                              setEpisodeTitle(event.target.value)
                            }
                            placeholder="Ej. Seguimiento de tratamiento"
                            aria-label="Nombre del episodio"
                            className="h-9 max-w-lg"
                            maxLength={160}
                          />
                          <Button
                            type="submit"
                            variant="outline"
                            className="h-9"
                            disabled={
                              openEpisode.isPending ||
                              episodeTitle.trim().length < 2
                            }
                          >
                            <FolderPlus className="mr-1.5 h-4 w-4" />
                            Abrir episodio
                          </Button>
                        </form>
                      </div>
                    </section>

                    <section
                      id="encounter-form"
                      className="scroll-mt-8 rounded-lg border border-[#ebebeb] bg-white"
                    >
                      <div className="border-b border-[#ebebeb] px-5 py-4">
                        <div className="flex items-center gap-2">
                          <FilePlus2 className="h-4 w-4 text-[#737373]" />
                          <h2 className="text-sm font-semibold text-[#171717]">
                            {encounterId
                              ? "Editar borrador clínico"
                              : "Registrar consulta"}
                          </h2>
                        </div>
                        <p className="mt-1 text-xs text-[#737373]">
                          El borrador sólo queda firmado cuando confirmas la
                          acción.
                        </p>
                      </div>
                      <form
                        onSubmit={submitEncounter}
                        className="space-y-4 p-5"
                      >
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field
                            id="encounter-chief-complaint"
                            label="Motivo de consulta"
                          >
                            <Textarea
                              id="encounter-chief-complaint"
                              value={chiefComplaint}
                              onChange={(event) =>
                                setChiefComplaint(event.target.value)
                              }
                              maxLength={12_000}
                            />
                          </Field>
                          <Field
                            id="encounter-subjective"
                            label="Subjetivo / evolución"
                          >
                            <Textarea
                              id="encounter-subjective"
                              value={subjective}
                              onChange={(event) =>
                                setSubjective(event.target.value)
                              }
                              maxLength={12_000}
                            />
                          </Field>
                          <Field
                            id="encounter-objective"
                            label="Objetivo / hallazgos"
                          >
                            <Textarea
                              id="encounter-objective"
                              value={objective}
                              onChange={(event) =>
                                setObjective(event.target.value)
                              }
                              maxLength={12_000}
                            />
                          </Field>
                          <Field
                            id="encounter-assessment"
                            label="Evaluación clínica"
                          >
                            <Textarea
                              id="encounter-assessment"
                              value={assessment}
                              onChange={(event) =>
                                setAssessment(event.target.value)
                              }
                              maxLength={12_000}
                            />
                          </Field>
                        </div>
                        <Field id="encounter-plan" label="Plan de atención">
                          <Textarea
                            id="encounter-plan"
                            value={plan}
                            onChange={(event) => setPlan(event.target.value)}
                            maxLength={12_000}
                          />
                        </Field>
                        <div className="flex flex-wrap justify-end gap-2">
                          {encounterId && (
                            <Button
                              type="button"
                              variant="outline"
                              className="h-9"
                              disabled={signEncounter.isPending}
                              onClick={() => setSigningEncounterId(encounterId)}
                            >
                              <Check className="mr-1.5 h-4 w-4" /> Firmar
                              consulta
                            </Button>
                          )}
                          <Button
                            type="submit"
                            className="h-9"
                            disabled={
                              createEncounter.isPending ||
                              updateEncounter.isPending
                            }
                          >
                            <PencilLine className="mr-1.5 h-4 w-4" />
                            Guardar borrador
                          </Button>
                        </div>
                      </form>
                    </section>

                    <section className="rounded-lg border border-[#ebebeb] bg-white">
                      <div className="border-b border-[#ebebeb] px-5 py-4">
                        <h2 className="text-sm font-semibold text-[#171717]">
                          Línea de tiempo
                        </h2>
                        <p className="mt-1 text-xs text-[#737373]">
                          Consultas profesionales, tareas y mediciones
                          registradas.
                        </p>
                      </div>
                      <div className="divide-y divide-[#ebebeb]">
                        {result.encounters.map((encounter) => (
                          <article key={encounter.id} className="px-5 py-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium text-[#171717]">
                                  {encounter.chiefComplaint || "Consulta"}
                                </p>
                                <p className="mt-1 font-mono text-[10px] text-[#888]">
                                  {formatDate(encounter.encounterAt)} ·{" "}
                                  {encounter.status === "SIGNED"
                                    ? "Firmada"
                                    : "Borrador"}
                                </p>
                              </div>
                              {encounter.status === "DRAFT" && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => startEditingDraft(encounter)}
                                >
                                  Editar borrador
                                </Button>
                              )}
                              {encounter.status === "SIGNED" && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setAmendingEncounterId(encounter.id);
                                    setAmendmentReason("");
                                    setAmendmentAssessment("");
                                    setAmendmentPlan("");
                                  }}
                                >
                                  Registrar enmienda
                                </Button>
                              )}
                            </div>
                            {encounter.assessment && (
                              <p className="mt-3 text-sm leading-6 text-[#404040]">
                                <strong className="font-medium text-[#171717]">
                                  Evaluación:
                                </strong>{" "}
                                {encounter.assessment}
                              </p>
                            )}
                            {encounter.plan && (
                              <p className="mt-2 text-sm leading-6 text-[#404040]">
                                <strong className="font-medium text-[#171717]">
                                  Plan:
                                </strong>{" "}
                                {encounter.plan}
                              </p>
                            )}
                            {encounter.amendments.map((amendment) => (
                              <div
                                key={amendment.id}
                                className="mt-3 border-l-2 border-[#b8b8b8] pl-3 text-xs leading-5 text-[#737373]"
                              >
                                Enmienda del {formatDate(amendment.createdAt)}:{" "}
                                {amendment.reason}
                                {formatAmendmentChanges(amendment.changes).map(
                                  ([field, value]) => (
                                    <p
                                      key={field}
                                      className="mt-1 text-[#525252]"
                                    >
                                      {field}: {value}
                                    </p>
                                  ),
                                )}
                              </div>
                            ))}
                            {amendingEncounterId === encounter.id && (
                              <form
                                className="mt-4 space-y-3 rounded-md border border-[#ebebeb] bg-[#fafafa] p-4"
                                onSubmit={(event) => {
                                  event.preventDefault();
                                  const changes = {
                                    ...(amendmentAssessment.trim()
                                      ? {
                                          assessment:
                                            amendmentAssessment.trim(),
                                        }
                                      : {}),
                                    ...(amendmentPlan.trim()
                                      ? { plan: amendmentPlan.trim() }
                                      : {}),
                                  };
                                  if (
                                    !amendmentReason.trim() ||
                                    Object.keys(changes).length === 0
                                  ) {
                                    toast.error(
                                      "Explica el motivo y agrega la corrección.",
                                    );
                                    return;
                                  }
                                  amendEncounter.mutate({
                                    encounterId: encounter.id,
                                    reason: amendmentReason.trim(),
                                    changes,
                                  });
                                }}
                              >
                                <p className="text-xs leading-5 text-[#737373]">
                                  La nota firmada se conserva. La corrección
                                  quedará como un registro separado con autor y
                                  fecha.
                                </p>
                                <div className="space-y-1.5">
                                  <Label
                                    htmlFor={`amendment-reason-${encounter.id}`}
                                  >
                                    Motivo de la enmienda
                                  </Label>
                                  <Textarea
                                    id={`amendment-reason-${encounter.id}`}
                                    value={amendmentReason}
                                    onChange={(event) =>
                                      setAmendmentReason(event.target.value)
                                    }
                                    maxLength={1_000}
                                    required
                                  />
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div className="space-y-1.5">
                                    <Label
                                      htmlFor={`amendment-assessment-${encounter.id}`}
                                    >
                                      Corrección de evaluación
                                    </Label>
                                    <Textarea
                                      id={`amendment-assessment-${encounter.id}`}
                                      value={amendmentAssessment}
                                      onChange={(event) =>
                                        setAmendmentAssessment(
                                          event.target.value,
                                        )
                                      }
                                      maxLength={12_000}
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label
                                      htmlFor={`amendment-plan-${encounter.id}`}
                                    >
                                      Corrección del plan
                                    </Label>
                                    <Textarea
                                      id={`amendment-plan-${encounter.id}`}
                                      value={amendmentPlan}
                                      onChange={(event) =>
                                        setAmendmentPlan(event.target.value)
                                      }
                                      maxLength={12_000}
                                    />
                                  </div>
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setAmendingEncounterId("")}
                                  >
                                    Cerrar
                                  </Button>
                                  <Button
                                    type="submit"
                                    size="sm"
                                    disabled={amendEncounter.isPending}
                                  >
                                    Guardar enmienda
                                  </Button>
                                </div>
                              </form>
                            )}
                          </article>
                        ))}
                        {result.followUpTasks.map((task) => (
                          <article
                            key={task.id}
                            className="flex items-start gap-3 px-5 py-4"
                          >
                            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-[#737373]" />
                            <div>
                              <p className="text-sm font-medium text-[#171717]">
                                {task.title}
                              </p>
                              <p className="mt-1 text-xs text-[#737373]">
                                {task.dueAt
                                  ? `Fecha límite ${formatDate(task.dueAt)}`
                                  : "Sin fecha límite"}{" "}
                                ·{" "}
                                {task.status === "COMPLETED"
                                  ? "Resuelto"
                                  : task.status === "CANCELLED"
                                    ? "Cancelado"
                                    : "Pendiente"}
                              </p>
                              {task.details && (
                                <p className="mt-2 text-sm leading-6 text-[#525252]">
                                  {task.details}
                                </p>
                              )}
                            </div>
                          </article>
                        ))}
                        {result.outcomeAssessments.map((assessment) => (
                          <article
                            key={assessment.id}
                            className="flex items-start gap-3 px-5 py-4"
                          >
                            <Activity className="mt-0.5 h-4 w-4 shrink-0 text-[#737373]" />
                            <div>
                              <p className="text-sm font-medium text-[#171717]">
                                {assessment.instrumentCode} · versión{" "}
                                {assessment.instrumentVersion}
                              </p>
                              <p className="mt-1 text-xs text-[#737373]">
                                Puntuación{" "}
                                {assessment.score ?? "sin puntuación"} ·{" "}
                                {formatDate(assessment.measuredAt)}
                              </p>
                            </div>
                          </article>
                        ))}
                        {result.encounters.length +
                          result.followUpTasks.length +
                          result.outcomeAssessments.length ===
                          0 && (
                          <p className="px-5 py-10 text-center text-sm text-[#737373]">
                            Aún no hay actividad clínica registrada.
                          </p>
                        )}
                      </div>
                    </section>

                    <OutcomeTrendPanel
                      episodeId={episodeId}
                      assessments={result.outcomeAssessments}
                    />
                  </div>

                  <aside className="space-y-6">
                    <section className="rounded-lg border border-[#ebebeb] bg-white">
                      <div className="border-b border-[#ebebeb] px-5 py-4">
                        <h2 className="text-sm font-semibold text-[#171717]">
                          Siguiente paso
                        </h2>
                        <p className="mt-1 text-xs text-[#737373]">
                          Crea una tarea concreta con responsable y fecha.
                        </p>
                      </div>
                      <form onSubmit={submitTask} className="space-y-4 p-5">
                        <div className="space-y-1.5">
                          <Label htmlFor="follow-up-title">Tarea</Label>
                          <Input
                            id="follow-up-title"
                            value={taskTitle}
                            onChange={(event) =>
                              setTaskTitle(event.target.value)
                            }
                            placeholder="Ej. Revisar resultado"
                            maxLength={160}
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="follow-up-due">Fecha límite</Label>
                          <Input
                            id="follow-up-due"
                            type="datetime-local"
                            value={taskDueAt}
                            onChange={(event) =>
                              setTaskDueAt(event.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="follow-up-details">
                            Nota interna
                          </Label>
                          <Textarea
                            id="follow-up-details"
                            value={taskDetails}
                            onChange={(event) =>
                              setTaskDetails(event.target.value)
                            }
                            maxLength={4_000}
                            placeholder="Contexto para el equipo clínico"
                          />
                        </div>
                        <Button
                          type="submit"
                          className="h-9 w-full"
                          disabled={
                            createTask.isPending ||
                            !episodeId ||
                            !taskTitle.trim()
                          }
                        >
                          <CalendarClock className="mr-1.5 h-4 w-4" /> Agregar
                          seguimiento
                        </Button>
                      </form>
                    </section>

                    <section className="rounded-lg border border-[#ebebeb] bg-white">
                      <div className="border-b border-[#ebebeb] px-5 py-4">
                        <h2 className="text-sm font-semibold text-[#171717]">
                          Registrar medición
                        </h2>
                        <p className="mt-1 text-xs leading-5 text-[#737373]">
                          Captura el mismo instrumento y versión para comparar
                          su trayectoria.
                        </p>
                      </div>
                      <form onSubmit={submitOutcome} className="space-y-4 p-5">
                        <div className="space-y-1.5">
                          <Label htmlFor="instrument-code">
                            Código del instrumento
                          </Label>
                          <Input
                            id="instrument-code"
                            value={instrumentCode}
                            onChange={(event) =>
                              setInstrumentCode(event.target.value)
                            }
                            placeholder="Código acordado por el consultorio"
                            maxLength={80}
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="instrument-version">Versión</Label>
                          <Input
                            id="instrument-version"
                            value={instrumentVersion}
                            onChange={(event) =>
                              setInstrumentVersion(event.target.value)
                            }
                            placeholder="Ej. 1.0"
                            maxLength={40}
                            required
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1.5">
                            <Label htmlFor="score">Puntuación</Label>
                            <Input
                              id="score"
                              type="number"
                              step="any"
                              value={score}
                              onChange={(event) => setScore(event.target.value)}
                              required
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="score-min">Mín.</Label>
                            <Input
                              id="score-min"
                              type="number"
                              step="any"
                              value={scoreMin}
                              onChange={(event) =>
                                setScoreMin(event.target.value)
                              }
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="score-max">Máx.</Label>
                            <Input
                              id="score-max"
                              type="number"
                              step="any"
                              value={scoreMax}
                              onChange={(event) =>
                                setScoreMax(event.target.value)
                              }
                            />
                          </div>
                        </div>
                        <p className="text-[11px] leading-5 text-[#888]">
                          El sistema sólo compara puntuaciones del mismo código
                          y versión; no determina si el cambio es clínicamente
                          favorable.
                        </p>
                        <Button
                          type="submit"
                          variant="outline"
                          className="h-9 w-full"
                          disabled={recordAssessment.isPending || !episodeId}
                        >
                          <Activity className="mr-1.5 h-4 w-4" /> Guardar
                          medición
                        </Button>
                      </form>
                    </section>

                    <section className="rounded-lg border border-[#ebebeb] bg-[#fafafa] p-5">
                      <p className="text-xs font-medium text-[#404040]">
                        Antecedentes informados por el paciente
                      </p>
                      <p className="mt-1 text-[11px] text-[#888]">
                        Esta ficha es independiente de las notas profesionales.
                        Última actualización:{" "}
                        {result.patient.medicalHistory
                          ? formatDate(
                              result.patient.medicalHistory.lastUpdated,
                            )
                          : "sin registro"}
                        .
                      </p>
                      {result.patient.medicalHistory ? (
                        <div className="mt-3 space-y-2 text-xs leading-5 text-[#525252]">
                          <p>
                            <strong className="font-medium text-[#171717]">
                              Alergias:
                            </strong>{" "}
                            {result.patient.medicalHistory.allergies.join(
                              ", ",
                            ) || "No informadas"}
                          </p>
                          <p>
                            <strong className="font-medium text-[#171717]">
                              Medicamentos:
                            </strong>{" "}
                            {result.patient.medicalHistory.medications.join(
                              ", ",
                            ) || "No informados"}
                          </p>
                          <p>
                            <strong className="font-medium text-[#171717]">
                              Padecimientos:
                            </strong>{" "}
                            {result.patient.medicalHistory.chronicDiseases.join(
                              ", ",
                            ) || "No informados"}
                          </p>
                        </div>
                      ) : (
                        <p className="mt-3 text-xs text-[#737373]">
                          No hay antecedentes capturados.
                        </p>
                      )}
                    </section>
                  </aside>
                </section>
              </>
            )}
          </div>
          <AlertDialog
            open={Boolean(signingEncounterId)}
            onOpenChange={(open) => {
              if (!open) setSigningEncounterId("");
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Firmar esta consulta</AlertDialogTitle>
                <AlertDialogDescription>
                  Al firmarla, la nota queda cerrada. Las correcciones
                  posteriores se agregan como enmiendas con motivo y fecha.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={signEncounter.isPending}>
                  Volver al borrador
                </AlertDialogCancel>
                <AlertDialogAction
                  disabled={signEncounter.isPending}
                  onClick={() => {
                    const id = signingEncounterId;
                    setSigningEncounterId("");
                    signEncounter.mutate({ encounterId: id });
                  }}
                >
                  Firmar consulta
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </main>
      </ProductShell>
    </DashboardWrapper>
  );
}

function OutcomeTrendPanel({
  episodeId,
  assessments,
}: {
  episodeId: string;
  assessments: OutcomePoint[];
}) {
  const episodeAssessments = assessments.filter(
    (assessment) => assessment.episodeId === episodeId,
  );
  const instruments = Array.from(
    new Map(
      episodeAssessments.map((assessment) => [
        JSON.stringify([
          assessment.instrumentCode,
          assessment.instrumentVersion,
        ]),
        {
          key: JSON.stringify([
            assessment.instrumentCode,
            assessment.instrumentVersion,
          ]),
          code: assessment.instrumentCode,
          version: assessment.instrumentVersion,
        },
      ]),
    ).values(),
  );
  const [selectedKey, setSelectedKey] = useState("");
  const selected =
    instruments.find((item) => item.key === selectedKey) ?? instruments[0];
  const trend = api.clinical.outcomeTrend.useQuery(
    {
      episodeId,
      instrumentCode: selected?.code ?? "",
      instrumentVersion: selected?.version ?? "",
    },
    { enabled: Boolean(episodeId && selected) },
  );
  const points =
    trend.data?.result?.points.filter((point) => point.score !== null) ?? [];
  const scores = points.map((point) => point.score ?? 0);
  const lowest = Math.min(...scores);
  const highest = Math.max(...scores);
  const spread = highest - lowest || 1;
  const chartPoints = points
    .map((point, index) => {
      const x =
        points.length === 1 ? 50 : 5 + (index / (points.length - 1)) * 90;
      const y = 34 - (((point.score ?? lowest) - lowest) / spread) * 28;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <section className="rounded-lg border border-[#ebebeb] bg-white">
      <div className="border-b border-[#ebebeb] px-5 py-4">
        <h2 className="text-sm font-semibold text-[#171717]">
          Trayectoria de resultados
        </h2>
        <p className="mt-1 text-xs leading-5 text-[#737373]">
          Compara mediciones del mismo instrumento y versión.
        </p>
      </div>
      {instruments.length === 0 ? (
        <p className="px-5 py-8 text-sm text-[#737373]">
          Registra mediciones para ver su evolución.
        </p>
      ) : (
        <div className="space-y-4 p-5">
          <label className="block max-w-sm">
            <span className="mb-1.5 block text-xs text-[#737373]">
              Instrumento
            </span>
            <select
              value={selected?.key ?? ""}
              onChange={(event) => setSelectedKey(event.target.value)}
              className="h-9 w-full rounded-md border border-[#ebebeb] bg-white px-3 text-sm text-[#171717] outline-none focus-visible:ring-2 focus-visible:ring-[#171717]/20"
            >
              {instruments.map((instrument) => (
                <option key={instrument.key} value={instrument.key}>
                  {instrument.code} · v{instrument.version}
                </option>
              ))}
            </select>
          </label>
          {trend.isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : points.length === 0 ? (
            <p className="text-sm text-[#737373]">
              No hay puntuaciones completas para comparar.
            </p>
          ) : (
            <>
              <div className="rounded-md border border-[#ebebeb] bg-[#fafafa] px-3 py-2">
                <svg
                  viewBox="0 0 100 40"
                  role="img"
                  aria-label={`Trayectoria de ${selected?.code}, ${points.length} mediciones`}
                  className="h-24 w-full overflow-visible"
                  preserveAspectRatio="none"
                >
                  {points.length > 1 && (
                    <polyline
                      points={chartPoints}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      vectorEffect="non-scaling-stroke"
                      className="text-[#525252]"
                    />
                  )}
                  {points.map((point, index) => {
                    const x =
                      points.length === 1
                        ? 50
                        : 5 + (index / (points.length - 1)) * 90;
                    const y =
                      34 - (((point.score ?? lowest) - lowest) / spread) * 28;
                    return (
                      <circle
                        key={point.id}
                        cx={x}
                        cy={y}
                        r="2.2"
                        className="fill-[#171717]"
                      />
                    );
                  })}
                </svg>
                <div className="flex justify-between font-mono text-[10px] text-[#888]">
                  <span>
                    {new Intl.DateTimeFormat("es-MX", {
                      dateStyle: "medium",
                    }).format(new Date(points[0]!.measuredAt))}
                  </span>
                  <span>
                    {new Intl.DateTimeFormat("es-MX", {
                      dateStyle: "medium",
                    }).format(new Date(points.at(-1)!.measuredAt))}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-[#888]">Inicial</p>
                  <p className="mt-1 font-mono text-sm text-[#171717]">
                    {trend.data?.result?.baselineScore ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[#888]">Actual</p>
                  <p className="mt-1 font-mono text-sm text-[#171717]">
                    {trend.data?.result?.latestScore ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[#888]">Cambio</p>
                  <p className="mt-1 font-mono text-sm text-[#171717]">
                    {trend.data?.result?.changeFromBaseline === null ||
                    trend.data?.result?.changeFromBaseline === undefined
                      ? "—"
                      : `${trend.data.result.changeFromBaseline > 0 ? "+" : ""}${trend.data.result.changeFromBaseline}`}
                  </p>
                </div>
              </div>
              <p className="text-[11px] leading-5 text-[#888]">
                La gráfica muestra la variación numérica; el sentido clínico
                depende del instrumento y del criterio del profesional.
              </p>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function formatAmendmentChanges(value: unknown): Array<[string, string]> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return [];
  }
  const labels: Record<string, string> = {
    chiefComplaint: "Motivo",
    subjective: "Subjetivo",
    objective: "Objetivo",
    assessment: "Evaluación",
    plan: "Plan",
  };
  return Object.entries(value as Record<string, unknown>).map(
    ([key, entry]) =>
      [
        labels[key] ?? key,
        typeof entry === "string"
          ? entry
          : (JSON.stringify(entry) ?? String(entry)),
      ] as [string, string],
  );
}
