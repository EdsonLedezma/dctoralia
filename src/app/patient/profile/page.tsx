"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Textarea } from "~/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { ArrowLeft, User, Edit, Save, X, Camera, Phone, Mail, Heart, Shield } from "lucide-react"
import Link from "next/link"

export default function PatientProfilePage() {
  const { data: session } = useSession()
  const [isEditing, setIsEditing] = useState(false)
  const [profileData, setProfileData] = useState({
    firstName: "María",
    lastName: "González",
    email: "maria.gonzalez@email.com",
    phone: "+1 234 567 8900",
    birthDate: "1990-05-15",
    gender: "femenino",
    address: "Calle Principal 123, Ciudad",
    bloodType: "O+",
    height: "165",
    weight: "60",
    emergencyContact: "Carlos González",
    emergencyPhone: "+1 234 567 8901",
    emergencyRelation: "Esposo",
    medicalHistory: "Sin antecedentes médicos relevantes",
    allergies: "Penicilina",
    currentMedications: "Vitamina D3 - 1000 UI diario",
    insuranceProvider: "Seguro Nacional",
    insuranceNumber: "SN123456789",
  })

  const handleInputChange = (field: string, value: string) => {
    setProfileData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = () => {
    setIsEditing(false)
    // Aquí guardarías los datos en la base de datos
    console.log("Guardando perfil:", profileData)
  }

  const calculateAge = (birthDate: string) => {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  const calculateBMI = (weight: string, height: string) => {
    const w = Number.parseFloat(weight)
    const h = Number.parseFloat(height) / 100 // convertir cm a metros
    if (w && h) {
      return (w / (h * h)).toFixed(1)
    }
    return "N/A"
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
              <User className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">Dopilot</span>
          </div>
          <div className="text-gray-600">|</div>
          <h1 className="text-xl font-semibold">Mi Perfil</h1>
        </div>
      </header>

      <div className="p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Profile Header */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <div className="relative">
                    <Avatar className="w-24 h-24">
                      <AvatarImage src="/placeholder.svg?height=96&width=96" alt="Perfil" />
                      <AvatarFallback className="text-2xl">
                        {profileData.firstName[0]}
                        {profileData.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    {isEditing && (
                      <Button size="sm" className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0">
                        <Camera className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">
                      {profileData.firstName} {profileData.lastName}
                    </h2>
                    <p className="text-gray-600">{calculateAge(profileData.birthDate)} años</p>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Mail className="w-4 h-4" />
                        <span>{profileData.email}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Phone className="w-4 h-4" />
                        <span>{profileData.phone}</span>
                      </div>
                    </div>
                  </div>
                </div>
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Editar Perfil
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
            </CardContent>
          </Card>

          {/* Health Summary */}
          <div className="grid md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Heart className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">{profileData.bloodType}</div>
                <div className="text-sm text-gray-600">Tipo de Sangre</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{profileData.height} cm</div>
                <div className="text-sm text-gray-600">Altura</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{profileData.weight} kg</div>
                <div className="text-sm text-gray-600">Peso</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{calculateBMI(profileData.weight, profileData.height)}</div>
                <div className="text-sm text-gray-600">IMC</div>
              </CardContent>
            </Card>
          </div>

          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
              <CardDescription>Datos básicos de tu perfil</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nombre</Label>
                  {isEditing ? (
                    <Input
                      id="firstName"
                      value={profileData.firstName}
                      onChange={(e) => handleInputChange("firstName", e.target.value)}
                    />
                  ) : (
                    <p className="py-2">{profileData.firstName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Apellido</Label>
                  {isEditing ? (
                    <Input
                      id="lastName"
                      value={profileData.lastName}
                      onChange={(e) => handleInputChange("lastName", e.target.value)}
                    />
                  ) : (
                    <p className="py-2">{profileData.lastName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  {isEditing ? (
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                    />
                  ) : (
                    <p className="py-2">{profileData.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  {isEditing ? (
                    <Input
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                    />
                  ) : (
                    <p className="py-2">{profileData.phone}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthDate">Fecha de Nacimiento</Label>
                  {isEditing ? (
                    <Input
                      id="birthDate"
                      type="date"
                      value={profileData.birthDate}
                      onChange={(e) => handleInputChange("birthDate", e.target.value)}
                    />
                  ) : (
                    <p className="py-2">{new Date(profileData.birthDate).toLocaleDateString("es-ES")}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Género</Label>
                  {isEditing ? (
                    <Select value={profileData.gender} onValueChange={(value) => handleInputChange("gender", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="masculino">Masculino</SelectItem>
                        <SelectItem value="femenino">Femenino</SelectItem>
                        <SelectItem value="otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="py-2 capitalize">{profileData.gender}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Dirección</Label>
                {isEditing ? (
                  <Input
                    id="address"
                    value={profileData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                  />
                ) : (
                  <p className="py-2">{profileData.address}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Medical Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Heart className="w-5 h-5 mr-2 text-red-500" />
                Información Médica
              </CardTitle>
              <CardDescription>Datos importantes para tu atención médica</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bloodType">Tipo de Sangre</Label>
                  {isEditing ? (
                    <Select
                      value={profileData.bloodType}
                      onValueChange={(value) => handleInputChange("bloodType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A+">A+</SelectItem>
                        <SelectItem value="A-">A-</SelectItem>
                        <SelectItem value="B+">B+</SelectItem>
                        <SelectItem value="B-">B-</SelectItem>
                        <SelectItem value="AB+">AB+</SelectItem>
                        <SelectItem value="AB-">AB-</SelectItem>
                        <SelectItem value="O+">O+</SelectItem>
                        <SelectItem value="O-">O-</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="py-2">{profileData.bloodType}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">Altura (cm)</Label>
                  {isEditing ? (
                    <Input
                      id="height"
                      value={profileData.height}
                      onChange={(e) => handleInputChange("height", e.target.value)}
                    />
                  ) : (
                    <p className="py-2">{profileData.height} cm</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Peso (kg)</Label>
                  {isEditing ? (
                    <Input
                      id="weight"
                      value={profileData.weight}
                      onChange={(e) => handleInputChange("weight", e.target.value)}
                    />
                  ) : (
                    <p className="py-2">{profileData.weight} kg</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="medicalHistory">Historial Médico</Label>
                {isEditing ? (
                  <Textarea
                    id="medicalHistory"
                    value={profileData.medicalHistory}
                    onChange={(e) => handleInputChange("medicalHistory", e.target.value)}
                    rows={3}
                  />
                ) : (
                  <p className="py-2">{profileData.medicalHistory}</p>
                )}
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="allergies">Alergias</Label>
                  {isEditing ? (
                    <Textarea
                      id="allergies"
                      value={profileData.allergies}
                      onChange={(e) => handleInputChange("allergies", e.target.value)}
                      rows={2}
                    />
                  ) : (
                    <p className="py-2">{profileData.allergies}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentMedications">Medicamentos Actuales</Label>
                  {isEditing ? (
                    <Textarea
                      id="currentMedications"
                      value={profileData.currentMedications}
                      onChange={(e) => handleInputChange("currentMedications", e.target.value)}
                      rows={2}
                    />
                  ) : (
                    <p className="py-2">{profileData.currentMedications}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card>
            <CardHeader>
              <CardTitle>Contacto de Emergencia</CardTitle>
              <CardDescription>Persona a contactar en caso de emergencia</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergencyContact">Nombre</Label>
                  {isEditing ? (
                    <Input
                      id="emergencyContact"
                      value={profileData.emergencyContact}
                      onChange={(e) => handleInputChange("emergencyContact", e.target.value)}
                    />
                  ) : (
                    <p className="py-2">{profileData.emergencyContact}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyPhone">Teléfono</Label>
                  {isEditing ? (
                    <Input
                      id="emergencyPhone"
                      value={profileData.emergencyPhone}
                      onChange={(e) => handleInputChange("emergencyPhone", e.target.value)}
                    />
                  ) : (
                    <p className="py-2">{profileData.emergencyPhone}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyRelation">Relación</Label>
                  {isEditing ? (
                    <Input
                      id="emergencyRelation"
                      value={profileData.emergencyRelation}
                      onChange={(e) => handleInputChange("emergencyRelation", e.target.value)}
                    />
                  ) : (
                    <p className="py-2">{profileData.emergencyRelation}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Insurance Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2 text-blue-500" />
                Información del Seguro
              </CardTitle>
              <CardDescription>Datos de tu cobertura médica</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="insuranceProvider">Proveedor de Seguro</Label>
                  {isEditing ? (
                    <Input
                      id="insuranceProvider"
                      value={profileData.insuranceProvider}
                      onChange={(e) => handleInputChange("insuranceProvider", e.target.value)}
                    />
                  ) : (
                    <p className="py-2">{profileData.insuranceProvider}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="insuranceNumber">Número de Póliza</Label>
                  {isEditing ? (
                    <Input
                      id="insuranceNumber"
                      value={profileData.insuranceNumber}
                      onChange={(e) => handleInputChange("insuranceNumber", e.target.value)}
                    />
                  ) : (
                    <p className="py-2">{profileData.insuranceNumber}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
