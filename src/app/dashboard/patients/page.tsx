"use client"

import { useState } from "react"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Badge } from "~/components/ui/badge"
import { Calendar, Users, Search, Plus, Phone, Mail, Eye } from "lucide-react"
import Link from "next/link"
import DashboardWrapper from "../../../components/auth/DashboardWrapper"
import { api } from "src/trpc/react"

export default function PatientsPage() {
  const [searchTerm, setSearchTerm] = useState("")

  // Obtener usuarios reales y filtrar pacientes
  const { data: patientsData, isLoading } = api.patients.getAll.useQuery()
  const patients = patientsData?.result || []

  const filteredPatients = patients.filter(
    (patient: any) =>
    (patient.userId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.address?.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <DashboardWrapper allowedRoles={["DOCTOR"]}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b">
          <div className="px-6 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xl font-bold">Dopilot</span>
                </div>
              </Link>
              <div className="text-gray-600">|</div>
              <h1 className="text-xl font-semibold">Gestión de Pacientes</h1>
            </div>
            <Link href="/dashboard/patients/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Paciente
              </Button>
            </Link>
          </div>
        </header>

        <div className="p-6">
          {/* Search and Stats */}
          <div className="mb-6">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar pacientes por nombre o condición..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Pacientes</p>
                      <p className="text-2xl font-bold">{patients.length}</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Activos</p>
                      <p className="text-2xl font-bold text-green-600">
                        {/* Puedes agregar lógica de estado si tienes ese campo en la base de datos */}
                        {patients.length}
                      </p>
                    </div>
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Nuevos (Este mes)</p>
                      <p className="text-2xl font-bold text-blue-600">12</p>
                    </div>
                    <Plus className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Próximas citas</p>
                      <p className="text-2xl font-bold text-orange-600">8</p>
                    </div>
                    <Calendar className="w-8 h-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Patients List */}
          <Card>
            <CardHeader>
              <CardTitle>Lista de Pacientes</CardTitle>
              <CardDescription>Gestiona la información de tus pacientes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoading ? (
                  <div className="text-center py-8">Cargando pacientes...</div>
                ) : filteredPatients.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No hay pacientes registrados.</div>
                ) : (
                  filteredPatients.map((patient: any) => (
                    <div key={patient.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold">
                              {patient.userId?.slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">ID: {patient.userId}</h3>
                            <div className="flex flex-col md:flex-row md:items-center md:space-x-4 mt-1 text-sm text-gray-600">
                              <div className="flex items-center space-x-1">
                                <Phone className="w-3 h-3" />
                                <span>{patient.phone}</span>
                              </div>
                              {patient.address && (
                                <span>• Dirección: {patient.address}</span>
                              )}
                              {patient.gender && (
                                <span>• Género: {patient.gender}</span>
                              )}
                              {patient.birthDate && (
                                <span>• Nacimiento: {new Date(patient.birthDate).toLocaleDateString("es-ES")}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardWrapper>
  )
}
