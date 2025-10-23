"use client"

import { useState } from "react"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Textarea } from "~/components/ui/textarea"
import { Badge } from "~/components/ui/badge"
import { Plus, Edit, Trash2, DollarSign, Clock, Eye, EyeOff } from "lucide-react"
import { api } from "~/trpc/react"
import { toast } from "sonner"

export default function ServicesManagementPage() {
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    duration: "",
  })

  const { data: profile } = api.auth.getProfile.useQuery()
  const doctorId = profile?.doctor?.id

  const { data: servicesRes, refetch } = api.services.getMyServices.useQuery(
    undefined,
    { enabled: !!doctorId }
  )
  const services = servicesRes?.result ?? []

  const createService = api.services.create.useMutation()
  const updateName = api.services.updateName.useMutation()
  const updateDescription = api.services.updateDescription.useMutation()
  const updatePrice = api.services.updatePrice.useMutation()
  const updateDuration = api.services.updateDuration.useMutation()
  const updateIsActive = api.services.updateIsActive.useMutation()
  const deleteService = api.services.delete.useMutation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!doctorId) return

    try {
      if (editingId) {
        // Actualizar servicio existente
        await updateName.mutateAsync({ id: editingId, name: formData.name })
        await updateDescription.mutateAsync({ id: editingId, description: formData.description })
        await updatePrice.mutateAsync({ id: editingId, price: parseFloat(formData.price) })
        await updateDuration.mutateAsync({ id: editingId, duration: parseInt(formData.duration) })
        toast.success("Servicio actualizado correctamente")
        setEditingId(null)
      } else {
        // Crear nuevo servicio
        await createService.mutateAsync({
          doctorId,
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          duration: parseInt(formData.duration),
        })
        toast.success("Servicio creado correctamente")
        setIsCreating(false)
      }
      
      // Resetear formulario
      setFormData({ name: "", description: "", price: "", duration: "" })
      refetch()
    } catch (error) {
      toast.error("Error al guardar el servicio")
    }
  }

  const handleEdit = (service: any) => {
    setEditingId(service.id)
    setFormData({
      name: service.name,
      description: service.description,
      price: service.price.toString(),
      duration: service.duration.toString(),
    })
    setIsCreating(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este servicio?")) return

    try {
      await deleteService.mutateAsync({ id })
      toast.success("Servicio eliminado")
      refetch()
    } catch (error) {
      toast.error("Error al eliminar el servicio")
    }
  }

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await updateIsActive.mutateAsync({ id, isActive: !isActive })
      toast.success(isActive ? "Servicio desactivado" : "Servicio activado")
      refetch()
    } catch (error) {
      toast.error("Error al cambiar el estado")
    }
  }

  const handleCancel = () => {
    setIsCreating(false)
    setEditingId(null)
    setFormData({ name: "", description: "", price: "", duration: "" })
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestión de Servicios</h1>
            <p className="text-gray-600 mt-1">Administra los servicios que ofreces a tus pacientes</p>
          </div>
          {!isCreating && (
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Servicio
            </Button>
          )}
        </div>

        {/* Create/Edit Form */}
        {isCreating && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{editingId ? "Editar Servicio" : "Crear Nuevo Servicio"}</CardTitle>
              <CardDescription>
                {editingId
                  ? "Actualiza la información del servicio"
                  : "Completa los datos del servicio que deseas ofrecer"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="name">Nombre del Servicio</Label>
                    <Input
                      id="name"
                      placeholder="ej. Consulta General"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="description">Descripción</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe en qué consiste este servicio..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      required
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="price">Precio (MXN)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        placeholder="500.00"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="duration">Duración (minutos)</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="duration"
                        type="number"
                        placeholder="30"
                        value={formData.duration}
                        onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="flex space-x-3 pt-4">
                  <Button type="submit">{editingId ? "Actualizar Servicio" : "Crear Servicio"}</Button>
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Services List */}
        <div className="grid gap-4">
          {services.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No tienes servicios registrados</h3>
                <p className="text-gray-600 mb-4">
                  Comienza agregando los servicios que ofreces a tus pacientes
                </p>
                <Button onClick={() => setIsCreating(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Primer Servicio
                </Button>
              </CardContent>
            </Card>
          ) : (
            services.map((service: any) => (
              <Card key={service.id} className={!service.isActive ? "opacity-60" : ""}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-semibold">{service.name}</h3>
                        <Badge variant={service.isActive ? "default" : "secondary"}>
                          {service.isActive ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                      <p className="text-gray-600 mb-4">{service.description}</p>
                      <div className="flex items-center space-x-6 text-sm">
                        <div className="flex items-center space-x-2">
                          <DollarSign className="w-4 h-4 text-green-600" />
                          <span className="font-semibold text-green-600">${service.price} MXN</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <span className="text-gray-700">{service.duration} minutos</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(service.id, service.isActive)}
                      >
                        {service.isActive ? (
                          <>
                            <EyeOff className="w-4 h-4 mr-1" />
                            Desactivar
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4 mr-1" />
                            Activar
                          </>
                        )}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(service)}>
                        <Edit className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(service.id)}>
                        <Trash2 className="w-4 h-4 mr-1" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
