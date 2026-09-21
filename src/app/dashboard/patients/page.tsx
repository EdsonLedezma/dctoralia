"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Search, Plus, Phone } from "lucide-react";
import Link from "next/link";
import DashboardWrapper from "../../../components/auth/DashboardWrapper";
import { api } from "~/trpc/react";
import { ProductShell } from "~/components/shell/product-shell";
import { MotionList } from "~/components/shared/motion-list";

export default function PatientsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  // Obtener usuarios reales y filtrar pacientes
  const { data: patientsData, isLoading } = api.doctor.getMyPatients.useQuery(
    {},
  );
  const patients = patientsData?.result ?? [];

  const filteredPatients = patients.filter((patient) => {
    const term = searchTerm.toLowerCase();
    return (
      patient.user.name.toLowerCase().includes(term) ||
      patient.phone.toLowerCase().includes(term) ||
      (patient.address ?? "").toLowerCase().includes(term)
    );
  });

  return (
    <DashboardWrapper allowedRoles={["DOCTOR"]}>
      <ProductShell role="DOCTOR">
        <div className="min-h-screen bg-[#fafafa] p-6 sm:p-8">
          <div className="mb-5 flex justify-end">
            <Link href="/dashboard/patients/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo paciente
              </Button>
            </Link>
          </div>
          {/* Search */}
          <div className="mb-6">
            <div className="mb-6 flex flex-col gap-4 md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                <Input
                  aria-label="Buscar pacientes"
                  placeholder="Buscar pacientes por nombre o condición..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Patients List */}
          <Card>
            <CardHeader>
              <CardTitle>Lista de Pacientes</CardTitle>
            </CardHeader>
            <CardContent>
              <MotionList className="space-y-4">
                {isLoading ? (
                  <div className="py-8 text-center">Cargando pacientes...</div>
                ) : patientsData?.error ? (
                  <div
                    className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                    role="alert"
                  >
                    No se pudo cargar la lista de pacientes.
                  </div>
                ) : filteredPatients.length === 0 ? (
                  <div className="py-8 text-center text-gray-500">
                    {searchTerm
                      ? "No encontramos pacientes con esa búsqueda."
                      : "No hay pacientes registrados."}
                  </div>
                ) : (
                  filteredPatients.map((patient) => (
                    <div
                      key={patient.id}
                      className="rounded-lg border p-4 transition-colors hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                            <span className="font-semibold text-blue-600">
                              {patient.user.name.slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold">
                              {patient.user.name}
                            </h3>
                            <div className="mt-1 flex flex-col text-sm text-gray-600 md:flex-row md:items-center md:space-x-4">
                              <div className="flex items-center space-x-1">
                                <Phone className="h-3 w-3" />
                                <span>{patient.phone}</span>
                              </div>
                              {patient.address && (
                                <span>• Dirección: {patient.address}</span>
                              )}
                              {patient.gender && (
                                <span>• Género: {patient.gender}</span>
                              )}
                              {patient.birthDate && (
                                <span>
                                  • Nacimiento:{" "}
                                  {new Date(
                                    patient.birthDate,
                                  ).toLocaleDateString("es-ES")}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </MotionList>
            </CardContent>
          </Card>
        </div>
      </ProductShell>
    </DashboardWrapper>
  );
}
