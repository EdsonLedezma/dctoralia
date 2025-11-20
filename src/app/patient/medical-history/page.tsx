"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { api } from "~/trpc/react"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { Badge } from "~/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select"
import { ArrowLeft, FileText, Heart, Pill, AlertTriangle, Download, Plus, Edit, Save, X, Loader2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

export default function MedicalHistoryPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  
  useEffect(() => {
    if (status === "loading") return
    if (!session || session.user.role !== "PATIENT") {
      router.push("/login")
    }
  }, [session, status, router])

  // Obtener patient actual
  const { data: profile } = api.auth.getProfile.useQuery(undefined, {
    enabled: !!session
  })
  const patient = profile?.patient
  
  // Obtener historial médico
  const { data: historyRes, isLoading: isLoadingHistory } = api.patients.getMedicalHistory.useQuery(
    { patientId: patient?.id || "" },
    { enabled: !!patient?.id }
  )
  const medicalHistory = historyRes?.result
  
  // Obtener citas completadas (historial)
  const { data: appointmentsRes } = api.appointments.listMine.useQuery(undefined, {
    enabled: !!session
  })
  const completedAppointments = appointmentsRes?.result?.filter((a: any) => a.status === 'COMPLETED') || []
  
  type BloodType = "A_POS" | "A_NEG" | "B_POS" | "B_NEG" | "AB_POS" | "AB_NEG" | "O_POS" | "O_NEG" | ""
  
  const [formData, setFormData] = useState<{
    bloodType: BloodType
    allergies: string[]
    medications: string[]
    chronicDiseases: string[]
    surgeries: string[]
    immunizations: string[]
    notes: string
  }>({
    bloodType: "",
    allergies: [],
    medications: [],
    chronicDiseases: [],
    surgeries: [],
    immunizations: [],
    notes: "",
  })
  
  // Update form when medicalHistory loads
  useEffect(() => {
    if (medicalHistory) {
      setFormData({
        bloodType: (medicalHistory.bloodType as BloodType) || "",
        allergies: medicalHistory.allergies || [],
        medications: medicalHistory.medications || [],
        chronicDiseases: medicalHistory.chronicDiseases || [],
        surgeries: medicalHistory.surgeries || [],
        immunizations: medicalHistory.immunizations || [],
        notes: medicalHistory.notes || "",
      })
    }
  }, [medicalHistory])
  
  const upsertHistory = api.patients.upsertMedicalHistory.useMutation({
    onSuccess: () => {
      toast.success("Historial médico actualizado")
      setIsEditing(false)
    },
    onError: (error) => {
      toast.error(error.message || "Error al actualizar historial")
    }
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const handleSave = () => {
    if (!patient?.id) return
    
    // Filtrar bloodType vacío
    const dataToSubmit: any = {
      patientId: patient.id,
      allergies: formData.allergies,
      medications: formData.medications,
      chronicDiseases: formData.chronicDiseases,
      surgeries: formData.surgeries,
      immunizations: formData.immunizations,
      notes: formData.notes,
    }
    
    if (formData.bloodType) {
      dataToSubmit.bloodType = formData.bloodType
    }
    
    upsertHistory.mutate(dataToSubmit)
  }
  
  const handleAddItem = (field: string, value: string) => {
    if (!value.trim()) return
    
    setFormData(prev => ({
      ...prev,
      [field]: [...(prev[field as keyof typeof prev] as string[]), value.trim()]
    }))
  }
  
  const handleRemoveItem = (field: string, index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field as keyof typeof prev] as string[]).filter((_, i) => i !== index)
    }))
  }
  
  if (status === "loading" || isLoadingHistory) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }
  
  if (!session || !patient) {
    return null
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
                  {completedAppointments.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>No tienes historial de consultas completadas</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {completedAppointments.map((record: any) => (
                        <div key={record.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="font-semibold text-lg">{record.reason || "Consulta"}</h3>
                              <p className="text-blue-600">
                                {record.doctor?.user?.name || "Doctor"} - {record.doctor?.specialty || "Especialidad"}
                              </p>
                              <p className="text-sm text-gray-600">{formatDate(record.date)}</p>
                            </div>
                            <Badge variant="outline">Completada</Badge>
                          </div>

                          {record.notes && (
                            <div className="mb-4">
                              <h4 className="font-medium mb-2">Notas del doctor</h4>
                              <p className="text-sm text-gray-700">{record.notes}</p>
                            </div>
                          )}

                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-medium mb-2">Servicio</h4>
                              <p className="text-sm text-gray-700">{record.service?.name || "N/A"}</p>
                            </div>
                            <div>
                              <h4 className="font-medium mb-2">Duración</h4>
                              <p className="text-sm text-gray-700">{record.duration || record.service?.duration || "N/A"} min</p>
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
                        <Button onClick={handleSave} disabled={upsertHistory.isPending}>
                          <Save className="w-4 h-4 mr-2" />
                          {upsertHistory.isPending ? "Guardando..." : "Guardar"}
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
                            <Select
                              value={formData.bloodType}
                              onValueChange={(value: BloodType) => setFormData({ ...formData, bloodType: value })}
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
                              {formData.bloodType ? 
                                formData.bloodType.replace('_POS', '+').replace('_NEG', '-') 
                                : "No especificado"}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label>Estado de Salud</Label>
                          <p className="text-lg font-medium">
                            {medicalHistory?.healthStatus === 'HEALTHY' ? 'Saludable' :
                             medicalHistory?.healthStatus === 'LOW_IMMUNITY' ? 'Defensas bajas' :
                             medicalHistory?.healthStatus === 'SICK_LOW_RISK' ? 'Enfermo - Bajo riesgo' :
                             medicalHistory?.healthStatus === 'SICK_HIGH_RISK' ? 'Enfermo - Alto riesgo' :
                             'No especificado'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg">Datos del Paciente</h3>
                      <div className="space-y-3">
                        <div>
                          <Label>Nombre</Label>
                          <p className="text-lg font-medium">{profile?.name}</p>
                        </div>
                        <div>
                          <Label>Teléfono</Label>
                          <p className="text-lg font-medium">{patient?.phone}</p>
                        </div>
                        {patient?.birthDate && (
                          <div>
                            <Label>Fecha de Nacimiento</Label>
                            <p className="text-lg font-medium">{formatDate(patient.birthDate.toISOString())}</p>
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
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Notas sobre tu historial médico..."
                      />
                    </div>
                  )}
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
                  </div>
                </CardHeader>
                <CardContent>
                  {formData.allergies.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>No tienes alergias registradas</p>
                      {isEditing && (
                        <p className="text-sm mt-2">Edita tu historial médico para agregar alergias</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formData.allergies.map((allergy, index) => (
                        <div key={index} className="border rounded-lg p-4 flex justify-between items-center">
                          <div>
                            <h3 className="font-semibold">{allergy}</h3>
                          </div>
                          {isEditing && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRemoveItem('allergies', index)}
                            >
                              <X className="w-4 h-4" />
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
                          if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                            handleAddItem('allergies', e.currentTarget.value)
                            e.currentTarget.value = ''
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
                  </div>
                </CardHeader>
                <CardContent>
                  {formData.medications.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Pill className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>No tienes medicamentos registrados</p>
                      {isEditing && (
                        <p className="text-sm mt-2">Edita tu historial médico para agregar medicamentos</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formData.medications.map((medication, index) => (
                        <div key={index} className="border rounded-lg p-4 flex justify-between items-center">
                          <div>
                            <h3 className="font-semibold text-lg">{medication}</h3>
                          </div>
                          {isEditing && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRemoveItem('medications', index)}
                            >
                              <X className="w-4 h-4" />
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
                          if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                            handleAddItem('medications', e.currentTarget.value)
                            e.currentTarget.value = ''
                          }
                        }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Chronic Diseases */}
              <Card>
                <CardHeader>
                  <CardTitle>Padecimientos Crónicos</CardTitle>
                  <CardDescription>Enfermedades crónicas diagnosticadas</CardDescription>
                </CardHeader>
                <CardContent>
                  {formData.chronicDiseases.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                      <p>No tienes padecimientos crónicos registrados</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {formData.chronicDiseases.map((disease, index) => (
                        <div key={index} className="flex justify-between items-center p-3 border rounded">
                          <span>{disease}</span>
                          {isEditing && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem('chronicDiseases', index)}
                            >
                              <X className="w-4 h-4" />
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
                          if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                            handleAddItem('chronicDiseases', e.currentTarget.value)
                            e.currentTarget.value = ''
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
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Historial de Vacunas</CardTitle>
                      <CardDescription>Registro de vacunas aplicadas</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {formData.immunizations.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>No tienes vacunas registradas</p>
                      {isEditing && (
                        <p className="text-sm mt-2">Edita tu historial médico para agregar vacunas</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formData.immunizations.map((vaccination, index) => (
                        <div key={index} className="border rounded-lg p-4 flex justify-between items-center">
                          <div>
                            <h3 className="font-semibold">{vaccination}</h3>
                          </div>
                          {isEditing && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRemoveItem('immunizations', index)}
                            >
                              <X className="w-4 h-4" />
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
                          if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                            handleAddItem('immunizations', e.currentTarget.value)
                            e.currentTarget.value = ''
                          }
                        }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Surgeries */}
              <Card>
                <CardHeader>
                  <CardTitle>Cirugías Previas</CardTitle>
                  <CardDescription>Historial de procedimientos quirúrgicos</CardDescription>
                </CardHeader>
                <CardContent>
                  {formData.surgeries.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                      <p>No tienes cirugías registradas</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {formData.surgeries.map((surgery, index) => (
                        <div key={index} className="flex justify-between items-center p-3 border rounded">
                          <span>{surgery}</span>
                          {isEditing && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem('surgeries', index)}
                            >
                              <X className="w-4 h-4" />
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
                          if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                            handleAddItem('surgeries', e.currentTarget.value)
                            e.currentTarget.value = ''
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
    </div>
  )
}
