"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Badge } from "~/components/ui/badge";
import {
  Plus,
  Edit,
  Trash2,
  DollarSign,
  Clock,
  Eye,
  EyeOff,
} from "lucide-react";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { unwrapTrpcResult } from "~/types/trpc-response";
import { MotionList } from "~/components/shared/motion-list";
import DashboardWrapper from "~/components/auth/DashboardWrapper";
import { ProductShell } from "~/components/shell/product-shell";

export default function ServicesManagementPage() {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    duration: "",
  });

  const {
    data: servicesRes,
    refetch,
    isLoading,
    isError,
  } = api.services.getMyServices.useQuery();
  const services = servicesRes?.result ?? [];

  const createService = api.services.create.useMutation();
  const updateService = api.services.update.useMutation();
  const updateIsActive = api.services.updateIsActive.useMutation();
  const deleteService = api.services.delete.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingId) {
        const response = await updateService.mutateAsync({
          id: editingId,
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          duration: parseInt(formData.duration),
        });
        unwrapTrpcResult(response);
        toast.success("Servicio actualizado correctamente");
        setEditingId(null);
      } else {
        const response = await createService.mutateAsync({
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          duration: parseInt(formData.duration),
        });
        unwrapTrpcResult(response);
        toast.success("Servicio creado correctamente");
        setIsCreating(false);
      }

      // Resetear formulario
      setFormData({ name: "", description: "", price: "", duration: "" });
      void refetch();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al guardar el servicio",
      );
    }
  };

  const handleEdit = (service: (typeof services)[number]) => {
    setEditingId(service.id);
    setFormData({
      name: service.name,
      description: service.description,
      price: service.price.toString(),
      duration: service.duration.toString(),
    });
    setIsCreating(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de desactivar este servicio?")) return;

    try {
      const response = await deleteService.mutateAsync({ id });
      unwrapTrpcResult(response);
      toast.success("Servicio desactivado; su historial se conservó");
      void refetch();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Error al desactivar el servicio",
      );
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const response = await updateIsActive.mutateAsync({
        id,
        isActive: !isActive,
      });
      unwrapTrpcResult(response);
      toast.success(isActive ? "Servicio desactivado" : "Servicio activado");
      void refetch();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al cambiar el estado",
      );
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    setFormData({ name: "", description: "", price: "", duration: "" });
  };

  return (
    <DashboardWrapper allowedRoles={["DOCTOR"]}>
      <ProductShell role="DOCTOR">
        <div className="min-h-screen bg-[#fafafa] px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-5 flex flex-col gap-4 border-b border-[#ebebeb] pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-medium tracking-[0.08em] text-[#737373] uppercase">
                  Operación
                </p>
                <h1 className="mt-1 text-xl font-semibold tracking-tight">
                  Servicios
                </h1>
              </div>
              {!isCreating && (
                <div>
                  <Button
                    onClick={() => setIsCreating(true)}
                    className="w-full sm:w-auto"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo servicio
                  </Button>
                </div>
              )}
            </div>

            {/* Create/Edit Form */}
            {isCreating && (
              <Card className="mb-6 border-[#ebebeb] bg-white shadow-none">
                <CardHeader className="border-b border-[#ebebeb] px-5 py-4 sm:px-6">
                  <CardTitle>
                    {editingId ? "Editar Servicio" : "Crear Nuevo Servicio"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="col-span-2">
                        <Label htmlFor="name">Nombre del Servicio</Label>
                        <Input
                          id="name"
                          placeholder="ej. Consulta General"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor="description">Descripción</Label>
                        <Textarea
                          id="description"
                          placeholder="Describe en qué consiste este servicio..."
                          value={formData.description}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              description: e.target.value,
                            })
                          }
                          required
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label htmlFor="price">Precio (MXN)</Label>
                        <div className="relative">
                          <DollarSign className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                          <Input
                            id="price"
                            type="number"
                            step="0.01"
                            placeholder="500.00"
                            value={formData.price}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                price: e.target.value,
                              })
                            }
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="duration">Duración (minutos)</Label>
                        <div className="relative">
                          <Clock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                          <Input
                            id="duration"
                            type="number"
                            placeholder="30"
                            value={formData.duration}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                duration: e.target.value,
                              })
                            }
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 pt-4 sm:flex-row">
                      <Button type="submit" className="w-full sm:w-auto">
                        {editingId ? "Actualizar Servicio" : "Crear Servicio"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={handleCancel}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Services List */}
            {isLoading ? (
              <div className="grid gap-4" aria-label="Cargando servicios">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-32 animate-pulse rounded-lg border border-[#ebebeb] bg-white"
                  />
                ))}
              </div>
            ) : isError || servicesRes?.ok === false ? (
              <Card className="border-[#ebebeb] bg-white shadow-none">
                <CardContent className="p-10 text-center">
                  <p className="font-medium">
                    No pudimos cargar tus servicios.
                  </p>
                  <p className="mt-2 text-sm text-[#6b6b6b]">
                    {servicesRes?.ok === false
                      ? servicesRes.message
                      : "Intenta actualizar la página."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <MotionList className="grid gap-4">
                {services.length === 0 ? (
                  <Card className="border-[#ebebeb] bg-white shadow-none">
                    <CardContent className="p-12 text-center">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                        <Plus className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="mb-2 text-lg font-semibold">
                        No tienes servicios registrados
                      </h3>
                      <p className="mb-4 text-gray-600">
                        Comienza agregando los servicios que ofreces a tus
                        pacientes
                      </p>
                      <Button onClick={() => setIsCreating(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Crear Primer Servicio
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  services.map((service) => (
                    <Card
                      key={service.id}
                      className={`border-[#ebebeb] bg-white shadow-none ${!service.isActive ? "opacity-60" : ""}`}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="mb-2 flex items-center space-x-3">
                              <h3 className="text-xl font-semibold">
                                {service.name}
                              </h3>
                              <Badge
                                variant={
                                  service.isActive ? "default" : "secondary"
                                }
                              >
                                {service.isActive ? "Activo" : "Inactivo"}
                              </Badge>
                            </div>
                            <p className="mb-4 text-gray-600">
                              {service.description}
                            </p>
                            <div className="flex items-center space-x-6 text-sm">
                              <div className="flex items-center space-x-2">
                                <DollarSign className="h-4 w-4 text-green-600" />
                                <span className="font-semibold text-green-600">
                                  ${service.price} MXN
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Clock className="h-4 w-4 text-blue-600" />
                                <span className="text-gray-700">
                                  {service.duration} minutos
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleToggleActive(service.id, service.isActive)
                              }
                            >
                              {service.isActive ? (
                                <>
                                  <EyeOff className="mr-1 h-4 w-4" />
                                  Desactivar
                                </>
                              ) : (
                                <>
                                  <Eye className="mr-1 h-4 w-4" />
                                  Activar
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(service)}
                            >
                              <Edit className="mr-1 h-4 w-4" />
                              Editar
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(service.id)}
                            >
                              <Trash2 className="mr-1 h-4 w-4" />
                              Desactivar
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </MotionList>
            )}
          </div>
        </div>
      </ProductShell>
    </DashboardWrapper>
  );
}
