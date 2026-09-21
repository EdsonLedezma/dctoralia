"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardWrapper from "../../../../components/auth/DashboardWrapper";
import { api } from "src/trpc/react";
import { ProductShell } from "~/components/shell/product-shell";

export default function NewPatientPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    birthDate: "",
    gender: "",
    address: "",
    emergencyContact: "",
    emergencyPhone: "",
    medicalHistory: "",
    allergies: "",
    currentMedications: "",
    insuranceProvider: "",
    insuranceNumber: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const createUser = api.users.create.useMutation();
  const createPatient = api.patients.create.useMutation();

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // 1. Crear usuario tipo paciente
      const userRes = await createUser.mutateAsync({
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        password: formData.birthDate
          ? formData.birthDate.replaceAll("-", "")
          : "Paciente123*", // Puedes mejorar esto
        phone: formData.phone,
        role: "PATIENT",
      });
      if (!userRes.result?.id) throw new Error("No se pudo crear el usuario");

      // 2. Crear perfil de paciente
      await createPatient.mutateAsync({
        userId: userRes.result.id,
        phone: formData.phone,
        birthDate: formData.birthDate
          ? new Date(formData.birthDate)
          : undefined,
        gender: formData.gender,
        address: formData.address,
        // Puedes agregar más campos si tu modelo de paciente lo permite
      });
      router.push("/dashboard/patients");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error al crear el paciente",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardWrapper allowedRoles={["DOCTOR"]}>
      <ProductShell role="DOCTOR">
        <div className="min-h-screen bg-[#fafafa] px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto max-w-4xl">
            <div className="mb-6">
              <p className="text-sm text-[#6b6b6b]">Pacientes</p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight text-[#171717]">
                Nuevo paciente
              </h1>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Información Personal */}
              <Card className="border-[#ebebeb] bg-white shadow-none">
                <CardHeader className="border-b border-[#ebebeb]">
                  <CardTitle>Información Personal</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Nombre</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) =>
                        handleInputChange("firstName", e.target.value)
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Apellido</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) =>
                        handleInputChange("lastName", e.target.value)
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        handleInputChange("email", e.target.value)
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) =>
                        handleInputChange("phone", e.target.value)
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birthDate">Fecha de Nacimiento</Label>
                    <Input
                      id="birthDate"
                      type="date"
                      value={formData.birthDate}
                      onChange={(e) =>
                        handleInputChange("birthDate", e.target.value)
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Género</Label>
                    <Select
                      onValueChange={(value) =>
                        handleInputChange("gender", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar género" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="masculino">Masculino</SelectItem>
                        <SelectItem value="femenino">Femenino</SelectItem>
                        <SelectItem value="otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Dirección</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) =>
                        handleInputChange("address", e.target.value)
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Contacto de Emergencia */}
              <Card className="border-[#ebebeb] bg-white shadow-none">
                <CardHeader className="border-b border-[#ebebeb]">
                  <CardTitle>Contacto de Emergencia</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContact">
                      Nombre del Contacto
                    </Label>
                    <Input
                      id="emergencyContact"
                      value={formData.emergencyContact}
                      onChange={(e) =>
                        handleInputChange("emergencyContact", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergencyPhone">
                      Teléfono de Emergencia
                    </Label>
                    <Input
                      id="emergencyPhone"
                      value={formData.emergencyPhone}
                      onChange={(e) =>
                        handleInputChange("emergencyPhone", e.target.value)
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Información Médica */}
              <Card className="border-[#ebebeb] bg-white shadow-none">
                <CardHeader className="border-b border-[#ebebeb]">
                  <CardTitle>Información Médica</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="medicalHistory">Historial Médico</Label>
                    <Textarea
                      id="medicalHistory"
                      placeholder="Describe el historial médico del paciente..."
                      value={formData.medicalHistory}
                      onChange={(e) =>
                        handleInputChange("medicalHistory", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="allergies">Alergias</Label>
                    <Textarea
                      id="allergies"
                      placeholder="Lista las alergias conocidas..."
                      value={formData.allergies}
                      onChange={(e) =>
                        handleInputChange("allergies", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currentMedications">
                      Medicamentos Actuales
                    </Label>
                    <Textarea
                      id="currentMedications"
                      placeholder="Lista los medicamentos que toma actualmente..."
                      value={formData.currentMedications}
                      onChange={(e) =>
                        handleInputChange("currentMedications", e.target.value)
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Información del Seguro */}
              <Card className="border-[#ebebeb] bg-white shadow-none">
                <CardHeader className="border-b border-[#ebebeb]">
                  <CardTitle>Información del Seguro</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="insuranceProvider">
                      Proveedor del Seguro
                    </Label>
                    <Input
                      id="insuranceProvider"
                      value={formData.insuranceProvider}
                      onChange={(e) =>
                        handleInputChange("insuranceProvider", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="insuranceNumber">Número de Póliza</Label>
                    <Input
                      id="insuranceNumber"
                      value={formData.insuranceNumber}
                      onChange={(e) =>
                        handleInputChange("insuranceNumber", e.target.value)
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Botones de acción */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="submit" className="flex-1" disabled={loading}>
                  <Save className="mr-2 h-4 w-4" />
                  {loading ? "Guardando..." : "Guardar Paciente"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full flex-1 sm:w-auto"
                  disabled={loading}
                  asChild
                >
                  <Link href="/dashboard/patients">Cancelar</Link>
                </Button>
              </div>
              {error && (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-center text-sm font-medium text-red-700">
                  {error}
                </p>
              )}
            </form>
          </div>
        </div>
      </ProductShell>
    </DashboardWrapper>
  );
}
