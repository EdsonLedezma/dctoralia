"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { api, type RouterInputs, type RouterOutputs } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  FileText,
  Heart,
  Pill,
  AlertTriangle,
  Download,
  Edit,
  Save,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { ProductShell } from "~/components/shell/product-shell";

type Appointment = Exclude<
  RouterOutputs["appointments"]["listMine"]["result"],
  null
>[number];
type MedicalHistoryInput = RouterInputs["patients"]["upsertMedicalHistory"];
type BloodType = NonNullable<MedicalHistoryInput["bloodType"]> | "";

export default function MedicalHistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "PATIENT") {
      router.push("/login");
    }
  }, [session, status, router]);

  // Obtener patient actual
  const { data: profileRes } = api.auth.getProfile.useQuery(undefined, {
    enabled: !!session,
  });
  const profile = profileRes?.result ?? null;
  const patient = profile?.patient;

  // Obtener historial médico
  const { data: historyRes, isLoading: isLoadingHistory } =
    api.patients.getMedicalHistory.useQuery(
      { patientId: patient?.id ?? "" },
      { enabled: !!patient?.id },
    );
  const medicalHistory = historyRes?.result;

  // Obtener citas completadas (historial)
  const { data: appointmentsRes } = api.appointments.listMine.useQuery(
    undefined,
    {
      enabled: !!session,
    },
  );
  const completedAppointments =
    appointmentsRes?.result?.filter(
      (a: Appointment) => a.status === "COMPLETED",
    ) ?? [];

  const [formData, setFormData] = useState<{
    bloodType: BloodType;
    allergies: string[];
    medications: string[];
    chronicDiseases: string[];
    surgeries: string[];
    immunizations: string[];
    notes: string;
  }>({
    bloodType: "",
    allergies: [],
    medications: [],
    chronicDiseases: [],
    surgeries: [],
    immunizations: [],
    notes: "",
  });

  // Update form when medicalHistory loads
  useEffect(() => {
    if (medicalHistory) {
      setFormData({
        bloodType: medicalHistory.bloodType ?? "",
        allergies: medicalHistory.allergies ?? [],
        medications: medicalHistory.medications ?? [],
        chronicDiseases: medicalHistory.chronicDiseases ?? [],
        surgeries: medicalHistory.surgeries ?? [],
        immunizations: medicalHistory.immunizations ?? [],
        notes: medicalHistory.notes ?? "",
      });
    }
  }, [medicalHistory]);

  const upsertHistory = api.patients.upsertMedicalHistory.useMutation({
    onSuccess: () => {
      toast.success("Historial médico actualizado");
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error(error.message ?? "Error al actualizar historial");
    },
  });

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleSave = () => {
    if (!patient?.id) return;

    // Filtrar bloodType vacío
    const dataToSubmit: MedicalHistoryInput = {
      patientId: patient.id,
      allergies: formData.allergies,
      medications: formData.medications,
      chronicDiseases: formData.chronicDiseases,
      surgeries: formData.surgeries,
      immunizations: formData.immunizations,
      notes: formData.notes,
    };

    if (formData.bloodType) {
      dataToSubmit.bloodType = formData.bloodType;
    }

    upsertHistory.mutate(dataToSubmit);
  };

  const handleAddItem = (field: string, value: string) => {
    if (!value.trim()) return;

    setFormData((prev) => ({
      ...prev,
      [field]: [
        ...(prev[field as keyof typeof prev] as string[]),
        value.trim(),
      ],
    }));
  };

  const handleRemoveItem = (field: string, index: number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: (prev[field as keyof typeof prev] as string[]).filter(
        (_, i) => i !== index,
      ),
    }));
  };

  if (status === "loading" || isLoadingHistory) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!session || !patient) {
    return null;
  }

  return (
    <ProductShell role="PATIENT">
      <div className="min-h-screen bg-[#fafafa] px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-5xl">
          <Tabs defaultValue="history" className="space-y-6">
            <TabsList className="flex w-full justify-start gap-1 overflow-x-auto rounded-none border-b border-[#ebebeb] bg-transparent p-0">
              <TabsTrigger value="history">Historial</TabsTrigger>
              <TabsTrigger value="personal">Información Personal</TabsTrigger>
              <TabsTrigger value="allergies">Alergias</TabsTrigger>
              <TabsTrigger value="medications">Medicamentos</TabsTrigger>
              <TabsTrigger value="vaccinations">Vacunas</TabsTrigger>
            </TabsList>

            {/* Medical History */}
            <TabsContent value="history" className="space-y-6">
              <Card className="border-[#ebebeb] bg-white shadow-none">
                <CardHeader className="border-b border-[#ebebeb] px-5 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Historial de Consultas</CardTitle>
                    </div>
                    <Button variant="outline">
                      <Download className="mr-2 h-4 w-4" />
                      Exportar PDF
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {completedAppointments.length === 0 ? (
                    <div className="py-12 text-center text-gray-500">
                      <FileText className="mx-auto mb-2 h-12 w-12 text-gray-400" />
                      <p>No tienes historial de consultas completadas</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {completedAppointments.map((record: Appointment) => (
                        <div key={record.id} className="rounded-lg border p-4">
                          <div className="mb-4 flex items-start justify-between">
                            <div>
                              <h3 className="text-lg font-semibold">
                                {record.reason ?? "Consulta"}
                              </h3>
                              <p className="text-blue-600">
                                {record.doctor?.user?.name ?? "Doctor"} -{" "}
                                {record.doctor?.specialty ?? "Especialidad"}
                              </p>
                              <p className="text-sm text-gray-600">
                                {formatDate(record.date)}
                              </p>
                            </div>
                            <Badge variant="outline">Completada</Badge>
                          </div>

                          {record.notes && (
                            <div className="mb-4">
                              <h4 className="mb-2 font-medium">
                                Notas del doctor
                              </h4>
                              <p className="text-sm text-gray-700">
                                {record.notes}
                              </p>
                            </div>
                          )}

                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <h4 className="mb-2 font-medium">Servicio</h4>
                              <p className="text-sm text-gray-700">
                                {record.service?.name ?? "N/A"}
                              </p>
                            </div>
                            <div>
                              <h4 className="mb-2 font-medium">Duración</h4>
                              <p className="text-sm text-gray-700">
                                {record.duration ??
                                  record.service?.duration ??
                                  "N/A"}{" "}
                                min
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Personal Information */}
            <TabsContent value="personal" className="space-y-6">
              <Card className="border-[#ebebeb] bg-white shadow-none">
                <CardHeader className="border-b border-[#ebebeb] px-5 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Información Personal</CardTitle>
                    </div>
                    {!isEditing ? (
                      <Button onClick={() => setIsEditing(true)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                    ) : (
                      <div className="space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => setIsEditing(false)}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleSave}
                          disabled={upsertHistory.isPending}
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {upsertHistory.isPending ? "Guardando..." : "Guardar"}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <h3 className="flex items-center text-lg font-semibold">
                        <Heart className="mr-2 h-5 w-5 text-red-500" />
                        Información Médica
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="bloodType">Tipo de Sangre</Label>
                          {isEditing ? (
                            <Select
                              value={formData.bloodType}
                              onValueChange={(value: BloodType) =>
                                setFormData({ ...formData, bloodType: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona tipo de sangre" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="A_POS">A+</SelectItem>
                                <SelectItem value="A_NEG">A-</SelectItem>
                                <SelectItem value="B_POS">B+</SelectItem>
                                <SelectItem value="B_NEG">B-</SelectItem>
                                <SelectItem value="AB_POS">AB+</SelectItem>
                                <SelectItem value="AB_NEG">AB-</SelectItem>
                                <SelectItem value="O_POS">O+</SelectItem>
                                <SelectItem value="O_NEG">O-</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <p className="text-lg font-medium">
                              {formData.bloodType
                                ? formData.bloodType
                                    .replace("_POS", "+")
                                    .replace("_NEG", "-")
                                : "No especificado"}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label>Estado de Salud</Label>
                          <p className="text-lg font-medium">
                            {medicalHistory?.healthStatus === "HEALTHY"
                              ? "Saludable"
                              : medicalHistory?.healthStatus === "LOW_IMMUNITY"
                                ? "Defensas bajas"
                                : medicalHistory?.healthStatus ===
                                    "SICK_LOW_RISK"
                                  ? "Enfermo - Bajo riesgo"
                                  : medicalHistory?.healthStatus ===
                                      "SICK_HIGH_RISK"
                                    ? "Enfermo - Alto riesgo"
                                    : "No especificado"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">
                        Datos del Paciente
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <Label>Nombre</Label>
                          <p className="text-lg font-medium">{profile?.name}</p>
                        </div>
                        <div>
                          <Label>Teléfono</Label>
                          <p className="text-lg font-medium">
                            {patient?.phone}
                          </p>
                        </div>
                        {patient?.birthDate && (
                          <div>
                            <Label>Fecha de Nacimiento</Label>
                            <p className="text-lg font-medium">
                              {formatDate(patient.birthDate.toISOString())}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {isEditing && formData.notes !== undefined && (
                    <div className="mt-6">
                      <Label htmlFor="notes">Notas adicionales</Label>
                      <Input
                        id="notes"
                        value={formData.notes}
                        onChange={(e) =>
                          setFormData({ ...formData, notes: e.target.value })
                        }
                        placeholder="Notas sobre tu historial médico..."
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Allergies */}
            <TabsContent value="allergies" className="space-y-6">
              <Card className="border-[#ebebeb] bg-white shadow-none">
                <CardHeader className="border-b border-[#ebebeb] px-5 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <AlertTriangle className="mr-2 h-5 w-5 text-red-500" />
                        Alergias
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {formData.allergies.length === 0 ? (
                    <div className="py-8 text-center text-gray-500">
                      <AlertTriangle className="mx-auto mb-2 h-12 w-12 text-gray-400" />
                      <p>No tienes alergias registradas</p>
                      {isEditing && (
                        <p className="mt-2 text-sm">
                          Edita tu historial médico para agregar alergias
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formData.allergies.map((allergy, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between rounded-lg border p-4"
                        >
                          <div>
                            <h3 className="font-semibold">{allergy}</h3>
                          </div>
                          {isEditing && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                handleRemoveItem("allergies", index)
                              }
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {isEditing && (
                    <div className="mt-4">
                      <Input
                        placeholder="Agregar nueva alergia (presiona Enter)"
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" &&
                            e.currentTarget.value.trim()
                          ) {
                            handleAddItem("allergies", e.currentTarget.value);
                            e.currentTarget.value = "";
                          }
                        }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Medications */}
            <TabsContent value="medications" className="space-y-6">
              <Card className="border-[#ebebeb] bg-white shadow-none">
                <CardHeader className="border-b border-[#ebebeb] px-5 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <Pill className="mr-2 h-5 w-5 text-blue-500" />
                        Medicamentos Actuales
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {formData.medications.length === 0 ? (
                    <div className="py-8 text-center text-gray-500">
                      <Pill className="mx-auto mb-2 h-12 w-12 text-gray-400" />
                      <p>No tienes medicamentos registrados</p>
                      {isEditing && (
                        <p className="mt-2 text-sm">
                          Edita tu historial médico para agregar medicamentos
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formData.medications.map((medication, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between rounded-lg border p-4"
                        >
                          <div>
                            <h3 className="text-lg font-semibold">
                              {medication}
                            </h3>
                          </div>
                          {isEditing && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                handleRemoveItem("medications", index)
                              }
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {isEditing && (
                    <div className="mt-4">
                      <Input
                        placeholder="Agregar nuevo medicamento (presiona Enter)"
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" &&
                            e.currentTarget.value.trim()
                          ) {
                            handleAddItem("medications", e.currentTarget.value);
                            e.currentTarget.value = "";
                          }
                        }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Chronic Diseases */}
              <Card className="border-[#ebebeb] bg-white shadow-none">
                <CardHeader className="border-b border-[#ebebeb] px-5 py-4 sm:px-6">
                  <CardTitle>Padecimientos Crónicos</CardTitle>
                </CardHeader>
                <CardContent>
                  {formData.chronicDiseases.length === 0 ? (
                    <div className="py-6 text-center text-gray-500">
                      <p>No tienes padecimientos crónicos registrados</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {formData.chronicDiseases.map((disease, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between rounded border p-3"
                        >
                          <span>{disease}</span>
                          {isEditing && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleRemoveItem("chronicDiseases", index)
                              }
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {isEditing && (
                    <div className="mt-4">
                      <Input
                        placeholder="Agregar padecimiento crónico (presiona Enter)"
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" &&
                            e.currentTarget.value.trim()
                          ) {
                            handleAddItem(
                              "chronicDiseases",
                              e.currentTarget.value,
                            );
                            e.currentTarget.value = "";
                          }
                        }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Vaccinations */}
            <TabsContent value="vaccinations" className="space-y-6">
              <Card className="border-[#ebebeb] bg-white shadow-none">
                <CardHeader className="border-b border-[#ebebeb] px-5 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Historial de Vacunas</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {formData.immunizations.length === 0 ? (
                    <div className="py-8 text-center text-gray-500">
                      <FileText className="mx-auto mb-2 h-12 w-12 text-gray-400" />
                      <p>No tienes vacunas registradas</p>
                      {isEditing && (
                        <p className="mt-2 text-sm">
                          Edita tu historial médico para agregar vacunas
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formData.immunizations.map((vaccination, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between rounded-lg border p-4"
                        >
                          <div>
                            <h3 className="font-semibold">{vaccination}</h3>
                          </div>
                          {isEditing && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                handleRemoveItem("immunizations", index)
                              }
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {isEditing && (
                    <div className="mt-4">
                      <Input
                        placeholder="Agregar vacuna (presiona Enter)"
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" &&
                            e.currentTarget.value.trim()
                          ) {
                            handleAddItem(
                              "immunizations",
                              e.currentTarget.value,
                            );
                            e.currentTarget.value = "";
                          }
                        }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Surgeries */}
              <Card className="border-[#ebebeb] bg-white shadow-none">
                <CardHeader className="border-b border-[#ebebeb] px-5 py-4 sm:px-6">
                  <CardTitle>Cirugías Previas</CardTitle>
                </CardHeader>
                <CardContent>
                  {formData.surgeries.length === 0 ? (
                    <div className="py-6 text-center text-gray-500">
                      <p>No tienes cirugías registradas</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {formData.surgeries.map((surgery, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between rounded border p-3"
                        >
                          <span>{surgery}</span>
                          {isEditing && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleRemoveItem("surgeries", index)
                              }
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {isEditing && (
                    <div className="mt-4">
                      <Input
                        placeholder="Agregar cirugía previa (presiona Enter)"
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" &&
                            e.currentTarget.value.trim()
                          ) {
                            handleAddItem("surgeries", e.currentTarget.value);
                            e.currentTarget.value = "";
                          }
                        }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ProductShell>
  );
}
