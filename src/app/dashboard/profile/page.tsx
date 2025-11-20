"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { api } from "~/trpc/react"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Textarea } from "~/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { Badge } from "~/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export default function DoctorProfilePage() {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const { data: session } = useSession()
  const homeHref = session?.user
    ? session.user.role === "DOCTOR"
      ? "/dashboard"
      : "/patient/dashboard"
    : "/"

  // Obtener perfil del doctor
  const { data: profileRes, isLoading: isLoadingProfile } =
    api.doctor.getMyProfile.useQuery()
  const profile = profileRes?.result

  // Form state
  const [formData, setFormData] = useState({
    specialty: profile?.specialty || "",
    about: profile?.about || "",
    experience: profile?.experience || 0,
    phone: profile?.phone || "",
  })

  // Update profile mutation
  const updateProfile = api.doctor.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Perfil actualizado exitosamente")
      setIsEditing(false)
      // Refetch profile
      router.refresh()
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al actualizar perfil")
    },
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === "experience" ? parseInt(value) || 0 : value,
    }))
  }

  const handleSubmit = () => {
    updateProfile.mutate(formData)
  }

  const handleCancel = () => {
    setFormData({
      specialty: profile?.specialty || "",
      about: profile?.about || "",
      experience: profile?.experience || 0,
      phone: profile?.phone || "",
    })
    setIsEditing(false)
  }

  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="container mx-auto py-8">
          <div className="text-center">
          <p className="text-gray-600">No se encontró tu perfil</p>
          <Button onClick={() => router.push(homeHref)} className="mt-4">
            Volver al inicio
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Tabs defaultValue="profile" className="max-w-4xl mx-auto">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile">Mi Perfil</TabsTrigger>
          <TabsTrigger value="stats">Estadísticas</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl">{profile.user?.name}</CardTitle>
                  <CardDescription>
                    {profile.specialty} • {profile.experience || 0} años de experiencia
                  </CardDescription>
                </div>
                {!isEditing && (
                  <Button
                    onClick={() => setIsEditing(true)}
                    variant="outline"
                  >
                    Editar Perfil
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {isEditing ? (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Especialidad
                    </label>
                    <Input
                      name="specialty"
                      value={formData.specialty}
                      onChange={handleChange}
                      placeholder="ej: Cardiología"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Teléfono
                    </label>
                    <Input
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+52 555-000-0000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Años de Experiencia
                    </label>
                    <Input
                      type="number"
                      name="experience"
                      value={formData.experience}
                      onChange={handleChange}
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Acerca de mí
                    </label>
                    <Textarea
                      name="about"
                      value={formData.about}
                      onChange={handleChange}
                      placeholder="Cuéntanos sobre tu experiencia y especialidades..."
                      rows={5}
                      maxLength={1000}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.about.length}/1000 caracteres
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={handleSubmit}
                      disabled={updateProfile.isPending}
                      className="flex-1"
                    >
                      {updateProfile.isPending
                        ? "Guardando..."
                        : "Guardar Cambios"}
                    </Button>
                    <Button
                      onClick={handleCancel}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h3 className="font-semibold mb-2">Especialidad</h3>
                    <p className="text-gray-600">{profile.specialty}</p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Teléfono</h3>
                    <p className="text-gray-600">{profile.phone}</p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">
                      Años de Experiencia
                    </h3>
                    <p className="text-gray-600">{profile.experience} años</p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Acerca de mí</h3>
                    <p className="text-gray-600">
                      {profile.about || "Sin información"}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Licencia Profesional</h3>
                    <p className="text-gray-600 font-mono">{profile.license}</p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Calificación Promedio</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">
                        {profile.rating?.toFixed(1) || "N/A"}
                      </span>
                      <Badge variant="outline">
                        {profile.totalReviews || 0} reseñas
                      </Badge>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="stats">
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Total de Citas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {profile.appointments?.length || 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Total de Reseñas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{profile.totalReviews || 0}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Calificación Promedio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {profile.rating?.toFixed(1) || "N/A"}/5
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Servicios */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Servicios Activos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {profile.services && profile.services.length > 0 ? (
                  profile.services
                    .filter((s: any) => s.isActive)
                    .map((service: any) => (
                      <div
                        key={service.id}
                        className="flex justify-between items-start p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{service.name}</p>
                          <p className="text-sm text-gray-600">
                            {service.description}
                          </p>
                          <p className="text-sm text-gray-500">
                            Duración: {service.duration} min
                          </p>
                        </div>
                        {service.price > 0 && (
                          <p className="font-semibold">${service.price}</p>
                        )}
                      </div>
                    ))
                ) : (
                  <p className="text-gray-600">Sin servicios activos</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Últimas Reseñas */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Últimas Reseñas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {profile.reviews && profile.reviews.length > 0 ? (
                  profile.reviews.slice(0, 5).map((review: any) => (
                    <div
                      key={review.id}
                      className="p-3 border rounded-lg"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-medium">
                          {review.patient?.user?.name || "Anónimo"}
                        </p>
                        <Badge variant="outline">
                          {"⭐ ".repeat(review.rating)}
                        </Badge>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-gray-600">
                          "{review.comment}"
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(review.createdAt).toLocaleDateString("es-ES")}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-600">Sin reseñas aún</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
