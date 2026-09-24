"use client";

import { useState, useEffect } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  Edit,
  Save,
  X,
  Camera,
  Loader2,
  Phone,
  Mail,
  Heart,
  Shield,
} from "lucide-react";
import { api, type RouterInputs } from "~/trpc/react";
import { toast } from "sonner";
import { ProductShell } from "~/components/shell/product-shell";
import { MotionList } from "~/components/shared/motion-list";
import { unwrapTrpcResult } from "~/types/trpc-response";

type BloodType = NonNullable<
  RouterInputs["patients"]["upsertMedicalHistory"]["bloodType"]
>;

const bloodTypeLabels: Record<BloodType, string> = {
  A_POS: "A+",
  A_NEG: "A−",
  B_POS: "B+",
  B_NEG: "B−",
  AB_POS: "AB+",
  AB_NEG: "AB−",
  O_POS: "O+",
  O_NEG: "O−",
};

type ProfileFormData = {
  firstName: string;
  lastName: string;
  email: string;
  imageUrl: string;
  phone: string;
  birthDate: string;
  gender: string;
  address: string;
  bloodType: BloodType | "";
  height: string;
  weight: string;
  emergencyContact: string;
  emergencyPhone: string;
  emergencyRelation: string;
  medicalHistory: string;
  allergies: string;
  currentMedications: string;
  insuranceProvider: string;
  insuranceNumber: string;
};

export default function PatientProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const {
    data: profileRes,
    isLoading: isProfileLoading,
    isError: isProfileError,
    refetch,
  } = api.auth.getProfile.useQuery();
  const profile = profileRes?.result ?? null;
  const patient = profile?.patient;
  const user = profile;

  const {
    data: medicalHistoryRes,
    isLoading: isHistoryLoading,
    isError: isHistoryError,
  } = api.patients.getMedicalHistory.useQuery(
    { patientId: patient?.id ?? "" },
    { enabled: !!patient?.id },
  );
  const medicalHistory = medicalHistoryRes?.result;
  const profileLoadFailed = isProfileError || !!profileRes?.error;
  const historyLoadFailed = isHistoryError || !!medicalHistoryRes?.error;

  const upsertMedicalHistory = api.patients.upsertMedicalHistory.useMutation();
  const updateAccount = api.auth.updateProfile.useMutation();

  const [profileData, setProfileData] = useState<ProfileFormData>({
    firstName: user?.name?.split(" ")[0] ?? "",
    lastName: user?.name?.split(" ").slice(1).join(" ") ?? "",
    email: user?.email ?? "",
    imageUrl: user?.image ?? "",
    phone: patient?.phone ?? "",
    birthDate: patient?.birthDate?.toISOString().split("T")[0] ?? "",
    gender: patient?.gender ?? "",
    address: patient?.address ?? "",
    bloodType: medicalHistory?.bloodType ?? "",
    height: "",
    weight: "",
    emergencyContact: "",
    emergencyPhone: "",
    emergencyRelation: "",
    medicalHistory: medicalHistory?.notes ?? "",
    allergies: medicalHistory?.allergies?.join(", ") ?? "",
    currentMedications: medicalHistory?.medications?.join(", ") ?? "",
    insuranceProvider: "",
    insuranceNumber: "",
  });

  useEffect(() => {
    if (patient && user && medicalHistoryRes !== undefined && !isEditing) {
      setProfileData({
        firstName: user.name?.split(" ")[0] ?? "",
        lastName: user.name?.split(" ").slice(1).join(" ") ?? "",
        email: user.email ?? "",
        imageUrl: user.image ?? "",
        phone: patient.phone ?? "",
        birthDate: patient.birthDate?.toISOString().split("T")[0] ?? "",
        gender: patient.gender ?? "",
        address: patient.address ?? "",
        bloodType: medicalHistory?.bloodType ?? "",
        height: medicalHistory?.height ?? "",
        weight: medicalHistory?.weight ?? "",
        emergencyContact: medicalHistory?.emergencyName ?? "",
        emergencyPhone: medicalHistory?.emergencyPhone ?? "",
        emergencyRelation: medicalHistory?.emergencyRelation ?? "",
        medicalHistory: medicalHistory?.notes ?? "",
        allergies: medicalHistory?.allergies?.join(", ") ?? "",
        currentMedications: medicalHistory?.medications?.join(", ") ?? "",
        insuranceProvider: medicalHistory?.insuranceProvider ?? "",
        insuranceNumber: medicalHistory?.insuranceNumber ?? "",
      });
    }
  }, [patient, user, medicalHistory, medicalHistoryRes, isEditing]);

  const handleInputChange = (field: string, value: string) => {
    setHasChanges(true);
    setProfileData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (
      !patient?.id ||
      updateAccount.isPending ||
      upsertMedicalHistory.isPending
    )
      return;

    if (`${profileData.firstName} ${profileData.lastName}`.trim().length < 2) {
      toast.error("Escribe tu nombre completo.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email.trim())) {
      toast.error("Revisa el correo electrónico.");
      return;
    }
    if (profileData.phone.replace(/\D/g, "").length < 10) {
      toast.error("El teléfono debe tener al menos 10 dígitos.");
      return;
    }
    if (profileData.imageUrl.trim()) {
      try {
        new URL(profileData.imageUrl.trim());
      } catch {
        toast.error("Escribe un enlace válido para la foto.");
        return;
      }
    }

    try {
      const nextName =
        `${profileData.firstName} ${profileData.lastName}`.trim();
      unwrapTrpcResult(
        await updateAccount.mutateAsync({
          name: nextName,
          email: profileData.email.trim().toLowerCase(),
          image: profileData.imageUrl.trim() || null,
          phone: profileData.phone,
          birthDate: profileData.birthDate
            ? new Date(`${profileData.birthDate}T12:00:00`)
            : null,
          gender: profileData.gender || null,
          address: profileData.address,
        }),
      );

      // Actualizar historial médico
      const medicalHistoryInput: RouterInputs["patients"]["upsertMedicalHistory"] =
        {
          patientId: patient.id,
          ...(profileData.bloodType
            ? { bloodType: profileData.bloodType }
            : { bloodType: null }),
          height: profileData.height,
          weight: profileData.weight,
          emergencyName: profileData.emergencyContact,
          emergencyPhone: profileData.emergencyPhone,
          emergencyRelation: profileData.emergencyRelation,
          insuranceProvider: profileData.insuranceProvider,
          insuranceNumber: profileData.insuranceNumber,
          allergies: profileData.allergies
            .split(",")
            .map((a) => a.trim())
            .filter(Boolean),
          medications: profileData.currentMedications
            .split(",")
            .map((m) => m.trim())
            .filter(Boolean),
          chronicDiseases: medicalHistory?.chronicDiseases ?? [],
          surgeries: medicalHistory?.surgeries ?? [],
          immunizations: medicalHistory?.immunizations ?? [],
          notes: profileData.medicalHistory,
        };

      unwrapTrpcResult(
        await upsertMedicalHistory.mutateAsync(medicalHistoryInput),
      );

      await refetch();
      toast.success("Perfil actualizado correctamente");
      setHasChanges(false);
      setIsEditing(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Error al actualizar el perfil",
      );
    }
  };

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    if (Number.isNaN(birth.getTime())) return null;
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }
    return age;
  };

  const calculateBMI = (weight: string, height: string) => {
    const w = Number.parseFloat(weight);
    const h = Number.parseFloat(height) / 100; // convertir cm a metros
    if (w > 0 && h > 0) {
      return (w / (h * h)).toFixed(1);
    }
    return "—";
  };

  const formatDate = (value: string) => {
    if (!value) return "No registrada";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "No registrada"
      : date.toLocaleDateString("es-MX", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
  };

  const initials =
    `${profileData.firstName[0] ?? ""}${profileData.lastName[0] ?? ""}`.toUpperCase();
  const age = calculateAge(profileData.birthDate);

  if (isProfileLoading || (!!patient?.id && isHistoryLoading)) {
    return (
      <ProductShell role="PATIENT">
        <main
          className="mx-auto max-w-5xl space-y-4 px-4 py-8 sm:px-8"
          aria-label="Cargando perfil"
        >
          <div className="h-32 animate-pulse rounded-lg border border-[#ebebeb] bg-white motion-reduce:animate-none" />
          <div className="h-56 animate-pulse rounded-lg border border-[#ebebeb] bg-white motion-reduce:animate-none" />
          <div className="h-48 animate-pulse rounded-lg border border-[#ebebeb] bg-white motion-reduce:animate-none" />
        </main>
      </ProductShell>
    );
  }

  if (profileLoadFailed || !profile || !patient || historyLoadFailed) {
    return (
      <ProductShell role="PATIENT">
        <main className="mx-auto max-w-3xl px-4 py-12 sm:px-8">
          <Card className="border-[#ebebeb] bg-white shadow-none">
            <CardContent className="p-6 text-center">
              <h1 className="text-lg font-semibold">
                No pudimos cargar tu perfil
              </h1>
              <p className="mt-2 text-sm text-[#6b6b6b]">
                Intenta de nuevo. Tus cambios guardados siguen protegidos.
              </p>
              <Button className="mt-5" onClick={() => void refetch()}>
                Reintentar
              </Button>
            </CardContent>
          </Card>
        </main>
      </ProductShell>
    );
  }

  return (
    <ProductShell role="PATIENT">
      <div className="min-h-screen bg-[#fafafa] px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-5xl space-y-8">
          {/* Profile Header */}
          <MotionList>
            <Card className="border-[#ebebeb] bg-white shadow-none">
              <CardContent className="p-5 sm:p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-4 sm:gap-5">
                    <div className="relative">
                      <Avatar className="h-16 w-16 rounded-full border border-[#ebebeb] sm:h-20 sm:w-20">
                        <AvatarImage
                          src={profileData.imageUrl || undefined}
                          alt=""
                        />
                        <AvatarFallback className="text-lg font-medium text-[#525252] sm:text-xl">
                          {initials || "P"}
                        </AvatarFallback>
                      </Avatar>
                      {isEditing && (
                        <label
                          htmlFor="imageUrl"
                          title="Editar enlace de foto"
                          className="absolute -right-2 -bottom-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-[#171717] text-white shadow-sm transition-transform duration-150 ease-out hover:scale-105"
                        >
                          <Camera aria-hidden="true" className="h-4 w-4" />
                          <span className="sr-only">Editar foto de perfil</span>
                        </label>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
                        {profileData.firstName || "Tu perfil"}{" "}
                        {profileData.lastName}
                      </h1>
                      <p className="mt-1 text-sm text-[#6b6b6b]">
                        {age === null ? "Edad no registrada" : `${age} años`}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[#6b6b6b]">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">
                            {profileData.email || "Correo no registrado"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          <span>
                            {profileData.phone || "Teléfono no registrado"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {!isEditing ? (
                    <Button
                      onClick={() => {
                        setHasChanges(false);
                        setIsEditing(true);
                      }}
                      className="w-full sm:w-auto"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Editar Perfil
                    </Button>
                  ) : (
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                      {hasChanges && (
                        <span
                          className="px-1 text-xs text-[#737373]"
                          aria-live="polite"
                        >
                          Cambios sin guardar
                        </span>
                      )}
                      <Button
                        variant="outline"
                        disabled={
                          updateAccount.isPending ||
                          upsertMedicalHistory.isPending
                        }
                        onClick={() => {
                          setHasChanges(false);
                          setIsEditing(false);
                        }}
                        className="flex-1 sm:flex-none"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Cancelar
                      </Button>
                      <Button
                        onClick={() => void handleSave()}
                        disabled={
                          !hasChanges ||
                          updateAccount.isPending ||
                          upsertMedicalHistory.isPending
                        }
                        className="flex-1 sm:flex-none"
                      >
                        {updateAccount.isPending ||
                        upsertMedicalHistory.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        {updateAccount.isPending ||
                        upsertMedicalHistory.isPending
                          ? "Guardando…"
                          : "Guardar"}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </MotionList>

          {/* Health Summary */}
          <div className="border-y border-[#ebebeb] bg-white px-4 py-4 sm:px-5">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
              {[
                [
                  "Tipo de sangre",
                  profileData.bloodType
                    ? bloodTypeLabels[profileData.bloodType]
                    : "No registrado",
                ],
                [
                  "Altura",
                  profileData.height
                    ? `${profileData.height} cm`
                    : "No registrada",
                ],
                [
                  "Peso",
                  profileData.weight
                    ? `${profileData.weight} kg`
                    : "No registrado",
                ],
                ["IMC", calculateBMI(profileData.weight, profileData.height)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[11px] font-medium tracking-[0.08em] text-[#737373] uppercase">
                    {label}
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-[#171717]">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Personal Information */}
          <Card className="border-[#ebebeb] bg-white shadow-none">
            <CardHeader className="border-b border-[#ebebeb] px-5 py-4 sm:px-6">
              <CardTitle className="text-base">Información personal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 p-5 sm:p-6">
              <div className="grid gap-4 md:grid-cols-2">
                {isEditing && (
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="imageUrl">
                      Foto de perfil · enlace de imagen
                    </Label>
                    <Input
                      id="imageUrl"
                      type="url"
                      value={profileData.imageUrl}
                      onChange={(event) =>
                        handleInputChange("imageUrl", event.target.value)
                      }
                      placeholder="https://…"
                    />
                    <p className="text-xs text-[#737373]">
                      Usa un enlace público a una imagen. La foto se actualiza
                      al guardar.
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nombre</Label>
                  {isEditing ? (
                    <Input
                      id="firstName"
                      value={profileData.firstName}
                      onChange={(e) =>
                        handleInputChange("firstName", e.target.value)
                      }
                    />
                  ) : (
                    <p className="py-2 text-sm">
                      {profileData.firstName || "No registrado"}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Apellido</Label>
                  {isEditing ? (
                    <Input
                      id="lastName"
                      value={profileData.lastName}
                      onChange={(e) =>
                        handleInputChange("lastName", e.target.value)
                      }
                    />
                  ) : (
                    <p className="py-2 text-sm">
                      {profileData.lastName || "No registrado"}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  {isEditing ? (
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) =>
                        handleInputChange("email", e.target.value)
                      }
                    />
                  ) : (
                    <p className="py-2 text-sm">
                      {profileData.email || "No registrado"}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  {isEditing ? (
                    <Input
                      id="phone"
                      type="tel"
                      required
                      minLength={10}
                      value={profileData.phone}
                      onChange={(e) =>
                        handleInputChange("phone", e.target.value)
                      }
                    />
                  ) : (
                    <p className="py-2 text-sm">
                      {profileData.phone || "No registrado"}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthDate">Fecha de Nacimiento</Label>
                  {isEditing ? (
                    <Input
                      id="birthDate"
                      type="date"
                      value={profileData.birthDate}
                      onChange={(e) =>
                        handleInputChange("birthDate", e.target.value)
                      }
                    />
                  ) : (
                    <p className="py-2">{formatDate(profileData.birthDate)}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Género</Label>
                  {isEditing ? (
                    <Select
                      value={profileData.gender}
                      onValueChange={(value) =>
                        handleInputChange("gender", value)
                      }
                    >
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
                    <p className="py-2 text-sm capitalize">
                      {profileData.gender || "No registrado"}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Dirección</Label>
                {isEditing ? (
                  <Input
                    id="address"
                    value={profileData.address}
                    onChange={(e) =>
                      handleInputChange("address", e.target.value)
                    }
                  />
                ) : (
                  <p className="py-2 text-sm">
                    {profileData.address || "No registrada"}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Medical Information */}
          <Card className="border-[#ebebeb] bg-white shadow-none">
            <CardHeader className="border-b border-[#ebebeb] px-5 py-4 sm:px-6">
              <CardTitle className="flex items-center text-base">
                <Heart className="mr-2 h-4 w-4 text-[#737373]" />
                Información médica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 p-5 sm:p-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="bloodType">Tipo de Sangre</Label>
                  {isEditing ? (
                    <Select
                      value={profileData.bloodType}
                      onValueChange={(value) =>
                        handleInputChange("bloodType", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(bloodTypeLabels).map(
                          ([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="py-2 text-sm">
                      {profileData.bloodType
                        ? bloodTypeLabels[profileData.bloodType]
                        : "No registrado"}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">Altura (cm)</Label>
                  {isEditing ? (
                    <Input
                      id="height"
                      type="number"
                      min="0"
                      step="0.1"
                      value={profileData.height}
                      onChange={(e) =>
                        handleInputChange("height", e.target.value)
                      }
                    />
                  ) : (
                    <p className="py-2 text-sm">
                      {profileData.height
                        ? `${profileData.height} cm`
                        : "No registrada"}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Peso (kg)</Label>
                  {isEditing ? (
                    <Input
                      id="weight"
                      type="number"
                      min="0"
                      step="0.1"
                      value={profileData.weight}
                      onChange={(e) =>
                        handleInputChange("weight", e.target.value)
                      }
                    />
                  ) : (
                    <p className="py-2 text-sm">
                      {profileData.weight
                        ? `${profileData.weight} kg`
                        : "No registrado"}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="medicalHistory">Historial Médico</Label>
                {isEditing ? (
                  <Textarea
                    id="medicalHistory"
                    value={profileData.medicalHistory}
                    onChange={(e) =>
                      handleInputChange("medicalHistory", e.target.value)
                    }
                    rows={3}
                  />
                ) : (
                  <p className="py-2 text-sm">
                    {profileData.medicalHistory || "No registrado"}
                  </p>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="allergies">Alergias</Label>
                  {isEditing ? (
                    <Textarea
                      id="allergies"
                      value={profileData.allergies}
                      onChange={(e) =>
                        handleInputChange("allergies", e.target.value)
                      }
                      rows={2}
                    />
                  ) : (
                    <p className="py-2 text-sm">
                      {profileData.allergies || "Ninguna registrada"}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentMedications">
                    Medicamentos Actuales
                  </Label>
                  {isEditing ? (
                    <Textarea
                      id="currentMedications"
                      value={profileData.currentMedications}
                      onChange={(e) =>
                        handleInputChange("currentMedications", e.target.value)
                      }
                      rows={2}
                    />
                  ) : (
                    <p className="py-2 text-sm">
                      {profileData.currentMedications || "Ninguno registrado"}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card className="border-[#ebebeb] bg-white shadow-none">
            <CardHeader className="border-b border-[#ebebeb] px-5 py-4 sm:px-6">
              <CardTitle className="text-base">
                Contacto de emergencia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-5 sm:p-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="emergencyContact">Nombre</Label>
                  {isEditing ? (
                    <Input
                      id="emergencyContact"
                      value={profileData.emergencyContact}
                      onChange={(e) =>
                        handleInputChange("emergencyContact", e.target.value)
                      }
                    />
                  ) : (
                    <p className="py-2 text-sm">
                      {profileData.emergencyContact || "No registrado"}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyPhone">Teléfono</Label>
                  {isEditing ? (
                    <Input
                      id="emergencyPhone"
                      value={profileData.emergencyPhone}
                      onChange={(e) =>
                        handleInputChange("emergencyPhone", e.target.value)
                      }
                    />
                  ) : (
                    <p className="py-2 text-sm">
                      {profileData.emergencyPhone || "No registrado"}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyRelation">Relación</Label>
                  {isEditing ? (
                    <Input
                      id="emergencyRelation"
                      value={profileData.emergencyRelation}
                      onChange={(e) =>
                        handleInputChange("emergencyRelation", e.target.value)
                      }
                    />
                  ) : (
                    <p className="py-2 text-sm">
                      {profileData.emergencyRelation || "No registrada"}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Insurance Information */}
          <Card className="border-[#ebebeb] bg-white shadow-none">
            <CardHeader className="border-b border-[#ebebeb] px-5 py-4 sm:px-6">
              <CardTitle className="flex items-center text-base">
                <Shield className="mr-2 h-4 w-4 text-[#737373]" />
                Información del seguro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-5 sm:p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="insuranceProvider">Proveedor de Seguro</Label>
                  {isEditing ? (
                    <Input
                      id="insuranceProvider"
                      value={profileData.insuranceProvider}
                      onChange={(e) =>
                        handleInputChange("insuranceProvider", e.target.value)
                      }
                    />
                  ) : (
                    <p className="py-2 text-sm">
                      {profileData.insuranceProvider || "No registrado"}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="insuranceNumber">Número de Póliza</Label>
                  {isEditing ? (
                    <Input
                      id="insuranceNumber"
                      value={profileData.insuranceNumber}
                      onChange={(e) =>
                        handleInputChange("insuranceNumber", e.target.value)
                      }
                    />
                  ) : (
                    <p className="py-2 text-sm">
                      {profileData.insuranceNumber || "No registrado"}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProductShell>
  );
}
