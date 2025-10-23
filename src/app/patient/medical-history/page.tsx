"use client"

import { useState } from "react"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { Badge } from "~/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { ArrowLeft, FileText, Heart, Pill, AlertTriangle, Download, Plus, Edit, Save, X } from "lucide-react"
import Link from "next/link"

export default function MedicalHistoryPage() {
  const [isEditing, setIsEditing] = useState(false)
  const [personalInfo, setPersonalInfo] = useState({
    bloodType: "O+",
    height: "175",
    weight: "70",
    emergencyContact: "María González",
    emergencyPhone: "+1 234 567 8900",
  })

  const medicalHistory = [
    {
      id: 1,
      date: "2024-01-15",
      doctor: "Dr. Carlos Rodríguez",
      specialty: "Medicina General",
      diagnosis: "Control rutinario",
      treatment: "Continuar con ejercicio regular y dieta balanceada",
      notes: "Paciente en excelente estado de salud. Presión arterial normal.",
      files: ["Examen_sangre_15012024.pdf", "Electrocardiograma_15012024.pdf"],
    },
    {
      id: 2,
      date: "2024-01-10",
      doctor: "Dra. Ana López",
      specialty: "Ginecología",
      diagnosis: "Control anual preventivo",
      treatment: "Continuar con controles anuales",
      notes: "Examen preventivo sin novedades. Próximo control en 12 meses.",
      files: ["Papanicolaou_10012024.pdf"],
    },
    {
      id: 3,
      date: "2023-12-20",
      doctor: "Dr. Juan Carlos Pérez",
      specialty: "Cardiología",
      diagnosis: "Evaluación cardiovascular",
      treatment: "Ejercicio cardiovascular 30 min diarios",
      notes: "Función cardíaca normal. Recomendado mantener actividad física.",
      files: ["Ecocardiograma_20122023.pdf", "Holter_20122023.pdf"],
    },
  ]

  const allergies = [
    { id: 1, allergen: "Penicilina", severity: "Alta", reaction: "Erupción cutánea" },
    { id: 2, allergen: "Mariscos", severity: "Media", reaction: "Hinchazón" },
  ]

  const medications = [
    {
      id: 1,
      name: "Vitamina D3",
      dosage: "1000 UI",
      frequency: "Diario",
      startDate: "2024-01-01",
      prescribedBy: "Dr. Carlos Rodríguez",
    },
    {
      id: 2,
      name: "Omega 3",
      dosage: "1000 mg",
      frequency: "Diario",
      startDate: "2023-12-01",
      prescribedBy: "Dr. Juan Carlos Pérez",
    },
  ]

  const vaccinations = [
    { id: 1, vaccine: "COVID-19 (Pfizer)", date: "2023-10-15", nextDue: "2024-10-15" },
    { id: 2, vaccine: "Influenza", date: "2023-09-20", nextDue: "2024-09-20" },
    { id: 3, vaccine: "Tétanos", date: "2022-05-10", nextDue: "2032-05-10" },
  ]

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "Alta":
        return "bg-red-100 text-red-800"
      case "Media":
        return "bg-yellow-100 text-yellow-800"
      case "Baja":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const handleSave = () => {
    setIsEditing(false)
    // Aquí guardarías los datos
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="px-6 py-4 flex items-center space-x-4">
          <Link href="/patient/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </Link>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">Dopilot</span>
          </div>
          <div className="text-gray-600">|</div>
          <h1 className="text-xl font-semibold">Mi Historial Médico</h1>
        </div>
      </header>

      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <Tabs defaultValue="history" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="history">Historial</TabsTrigger>
              <TabsTrigger value="personal">Información Personal</TabsTrigger>
              <TabsTrigger value="allergies">Alergias</TabsTrigger>
              <TabsTrigger value="medications">Medicamentos</TabsTrigger>
              <TabsTrigger value="vaccinations">Vacunas</TabsTrigger>
            </TabsList>

            {/* Medical History */}
            <TabsContent value="history" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Historial de Consultas</CardTitle>
                      <CardDescription>Registro completo de tus consultas médicas</CardDescription>
                    </div>
                    <Button variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Exportar PDF
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {medicalHistory.map((record) => (
                      <div key={record.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-semibold text-lg">{record.diagnosis}</h3>
                            <p className="text-blue-600">
                              {record.doctor} - {record.specialty}
                            </p>
                            <p className="text-sm text-gray-600">{formatDate(record.date)}</p>
                          </div>
                          <Button variant="outline" size="sm">
                            Ver Detalles
                          </Button>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <h4 className="font-medium mb-2">Tratamiento</h4>
                            <p className="text-sm text-gray-700">{record.treatment}</p>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">Notas</h4>
                            <p className="text-sm text-gray-700">{record.notes}</p>
                          </div>
                        </div>

                        {record.files.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-2">Archivos Adjuntos</h4>
                            <div className="flex flex-wrap gap-2">
                              {record.files.map((file, index) => (
                                <Button key={index} variant="outline" size="sm">
                                  <FileText className="w-4 h-4 mr-2" />
                                  {file}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Personal Information */}
            <TabsContent value="personal" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Información Personal</CardTitle>
                      <CardDescription>Datos básicos de salud y contacto de emergencia</CardDescription>
                    </div>
                    {!isEditing ? (
                      <Button onClick={() => setIsEditing(true)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </Button>
                    ) : (
                      <div className="space-x-2">
                        <Button variant="outline" onClick={() => setIsEditing(false)}>
                          <X className="w-4 h-4 mr-2" />
                          Cancelar
                        </Button>
                        <Button onClick={handleSave}>
                          <Save className="w-4 h-4 mr-2" />
                          Guardar
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg flex items-center">
                        <Heart className="w-5 h-5 mr-2 text-red-500" />
                        Información Médica
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="bloodType">Tipo de Sangre</Label>
                          {isEditing ? (
                            <Input
                              id="bloodType"
                              value={personalInfo.bloodType}
                              onChange={(e) => setPersonalInfo({ ...personalInfo, bloodType: e.target.value })}
                            />
                          ) : (
                            <p className="text-lg font-medium">{personalInfo.bloodType}</p>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="height">Altura (cm)</Label>
                            {isEditing ? (
                              <Input
                                id="height"
                                value={personalInfo.height}
                                onChange={(e) => setPersonalInfo({ ...personalInfo, height: e.target.value })}
                              />
                            ) : (
                              <p className="text-lg font-medium">{personalInfo.height} cm</p>
                            )}
                          </div>
                          <div>
                            <Label htmlFor="weight">Peso (kg)</Label>
                            {isEditing ? (
                              <Input
                                id="weight"
                                value={personalInfo.weight}
                                onChange={(e) => setPersonalInfo({ ...personalInfo, weight: e.target.value })}
                              />
                            ) : (
                              <p className="text-lg font-medium">{personalInfo.weight} kg</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg">Contacto de Emergencia</h3>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="emergencyContact">Nombre</Label>
                          {isEditing ? (
                            <Input
                              id="emergencyContact"
                              value={personalInfo.emergencyContact}
                              onChange={(e) => setPersonalInfo({ ...personalInfo, emergencyContact: e.target.value })}
                            />
                          ) : (
                            <p className="text-lg font-medium">{personalInfo.emergencyContact}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="emergencyPhone">Teléfono</Label>
                          {isEditing ? (
                            <Input
                              id="emergencyPhone"
                              value={personalInfo.emergencyPhone}
                              onChange={(e) => setPersonalInfo({ ...personalInfo, emergencyPhone: e.target.value })}
                            />
                          ) : (
                            <p className="text-lg font-medium">{personalInfo.emergencyPhone}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Allergies */}
            <TabsContent value="allergies" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="flex items-center">
                        <AlertTriangle className="w-5 h-5 mr-2 text-red-500" />
                        Alergias
                      </CardTitle>
                      <CardDescription>Registro de alergias y reacciones adversas</CardDescription>
                    </div>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar Alergia
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {allergies.map((allergy) => (
                      <div key={allergy.id} className="border rounded-lg p-4 flex justify-between items-center">
                        <div>
                          <h3 className="font-semibold">{allergy.allergen}</h3>
                          <p className="text-sm text-gray-600">Reacción: {allergy.reaction}</p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge className={getSeverityColor(allergy.severity)}>{allergy.severity}</Badge>
                          <Button variant="outline" size="sm">
                            Editar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Medications */}
            <TabsContent value="medications" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="flex items-center">
                        <Pill className="w-5 h-5 mr-2 text-blue-500" />
                        Medicamentos Actuales
                      </CardTitle>
                      <CardDescription>Medicamentos que tomas actualmente</CardDescription>
                    </div>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar Medicamento
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {medications.map((medication) => (
                      <div key={medication.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-lg">{medication.name}</h3>
                            <p className="text-blue-600">Prescrito por: {medication.prescribedBy}</p>
                            <div className="mt-2 space-y-1 text-sm">
                              <p>
                                <strong>Dosis:</strong> {medication.dosage}
                              </p>
                              <p>
                                <strong>Frecuencia:</strong> {medication.frequency}
                              </p>
                              <p>
                                <strong>Desde:</strong> {formatDate(medication.startDate)}
                              </p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            Editar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Vaccinations */}
            <TabsContent value="vaccinations" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Historial de Vacunas</CardTitle>
                      <CardDescription>Registro de vacunas aplicadas y próximas dosis</CardDescription>
                    </div>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar Vacuna
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {vaccinations.map((vaccination) => (
                      <div key={vaccination.id} className="border rounded-lg p-4 flex justify-between items-center">
                        <div>
                          <h3 className="font-semibold">{vaccination.vaccine}</h3>
                          <p className="text-sm text-gray-600">Aplicada: {formatDate(vaccination.date)}</p>
                          <p className="text-sm text-gray-600">Próxima dosis: {formatDate(vaccination.nextDue)}</p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge variant="outline">
                            {new Date(vaccination.nextDue) > new Date() ? "Vigente" : "Vencida"}
                          </Badge>
                          <Button variant="outline" size="sm">
                            Ver Certificado
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
