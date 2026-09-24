"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { api, type RouterOutputs } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { toast } from "sonner";
import { BriefcaseMedical, Pencil, Star, UserRound } from "lucide-react";
import { ProductShell } from "~/components/shell/product-shell";
import { MotionList } from "~/components/shared/motion-list";
import { unwrapTrpcResult } from "~/types/trpc-response";

type DoctorProfile = Exclude<
  RouterOutputs["doctor"]["getMyProfile"]["result"],
  null
>;
type DoctorService = DoctorProfile["services"][number];
type DoctorReview = DoctorProfile["reviews"][number];

export default function DoctorProfilePage() {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const { data: session } = useSession();
  const homeHref = session?.user
    ? session.user.role === "DOCTOR"
      ? "/dashboard"
      : "/patient/dashboard"
    : "/";

  // Obtener perfil del doctor
  const {
    data: profileRes,
    isLoading: isLoadingProfile,
    isError: isProfileError,
    refetch: refetchProfile,
  } = api.doctor.getMyProfile.useQuery();
  const utils = api.useUtils();
  const profile = profileRes?.result;

  // Form state
  const [formData, setFormData] = useState({
    name: profile?.user?.name ?? "",
    email: profile?.user?.email ?? "",
    image: profile?.user?.image ?? "",
    specialty: profile?.specialty ?? "",
    license: profile?.license ?? "",
    about: profile?.about ?? "",
    experience: profile?.experience ?? 0,
    phone: profile?.phone ?? "",
  });

  useEffect(() => {
    if (!profile) return;
    setFormData({
      name: profile.user?.name ?? "",
      email: profile.user?.email ?? "",
      image: profile.user?.image ?? "",
      specialty: profile.specialty ?? "",
      license: profile.license ?? "",
      about: profile.about ?? "",
      experience: profile.experience ?? 0,
      phone: profile.phone ?? "",
    });
  }, [profile]);

  // Update profile mutation
  const updateProfile = api.doctor.updateProfile.useMutation({
    onSuccess: (response) => {
      if (response.error) {
        toast.error(response.message);
        return;
      }
      toast.success("Perfil actualizado exitosamente");
      setIsEditing(false);
      // Refetch profile
      void utils.doctor.getMyProfile.invalidate();
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message ?? "Error al actualizar perfil");
    },
  });
  const updateAccount = api.auth.updateProfile.useMutation();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "experience" ? parseInt(value, 10) || 0 : value,
    }));
  };

  const handleSubmit = async () => {
    try {
      if (
        formData.name.trim() !== (profile?.user?.name ?? "") ||
        formData.email.trim().toLowerCase() !== (profile?.user?.email ?? "") ||
        formData.image.trim() !== (profile?.user?.image ?? "")
      ) {
        unwrapTrpcResult(
          await updateAccount.mutateAsync({
            name: formData.name.trim(),
            email: formData.email.trim().toLowerCase(),
            image: formData.image.trim() || null,
          }),
        );
      }
      updateProfile.mutate({
        specialty: formData.specialty,
        license: formData.license.trim(),
        about: formData.about,
        experience: formData.experience,
        phone: formData.phone,
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la cuenta",
      );
    }
  };

  const handleCancel = () => {
    setFormData({
      name: profile?.user?.name ?? "",
      email: profile?.user?.email ?? "",
      image: profile?.user?.image ?? "",
      specialty: profile?.specialty ?? "",
      license: profile?.license ?? "",
      about: profile?.about ?? "",
      experience: profile?.experience ?? 0,
      phone: profile?.phone ?? "",
    });
    setIsEditing(false);
  };

  if (isLoadingProfile) {
    return (
      <ProductShell role="DOCTOR">
        <main
          className="mx-auto max-w-5xl space-y-4 px-4 py-8 sm:px-8"
          aria-label="Cargando perfil"
        >
          <div className="h-32 animate-pulse rounded-lg border border-[#ebebeb] bg-white motion-reduce:animate-none" />
          <div className="h-56 animate-pulse rounded-lg border border-[#ebebeb] bg-white motion-reduce:animate-none" />
        </main>
      </ProductShell>
    );
  }

  if (!profile) {
    return (
      <ProductShell role="DOCTOR">
        <div className="container mx-auto py-8">
          <div className="text-center">
            <p className="text-gray-600">
              {isProfileError || profileRes?.error
                ? "No pudimos cargar tu perfil."
                : "No se encontró tu perfil."}
            </p>
            {isProfileError || profileRes?.error ? (
              <Button onClick={() => void refetchProfile()} className="mt-4">
                Reintentar
              </Button>
            ) : (
              <Button onClick={() => router.push(homeHref)} className="mt-4">
                Volver al inicio
              </Button>
            )}
          </div>
        </div>
      </ProductShell>
    );
  }

  const activeServices =
    profile.services?.filter((service) => service.isActive) ?? [];
  const reviews = profile.reviews?.slice(0, 5) ?? [];
  const hasChanges =
    formData.name !== (profile.user?.name ?? "") ||
    formData.email !== (profile.user?.email ?? "") ||
    formData.image !== (profile.user?.image ?? "") ||
    formData.specialty !== (profile.specialty ?? "") ||
    formData.license !== (profile.license ?? "") ||
    formData.about !== (profile.about ?? "") ||
    formData.experience !== (profile.experience ?? 0) ||
    formData.phone !== (profile.phone ?? "");

  return (
    <ProductShell role="DOCTOR">
      <div className="min-h-screen bg-[#fafafa] px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-5xl space-y-8">
          <MotionList>
            <Card className="border-[#ebebeb] bg-white shadow-none">
              <CardContent className="p-5 sm:p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#171717] text-sm font-medium text-white">
                      {formData.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={formData.image}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        (profile.user?.name?.slice(0, 2) ?? "DR").toUpperCase()
                      )}
                      {isEditing && (
                        <UserRound className="absolute right-0 bottom-0 h-4 w-4 rounded-full bg-white p-0.5 text-[#171717]" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-medium tracking-[0.08em] text-[#737373] uppercase">
                        Perfil profesional
                      </p>
                      <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                        {profile.user?.name ?? "Doctor"}
                      </h1>
                      <p className="mt-1 text-sm text-[#6b6b6b]">
                        {profile.specialty || "Especialidad no registrada"}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#6b6b6b]">
                        <span>
                          {profile.experience ?? 0} años de experiencia
                        </span>
                        <span>{profile.phone || "Teléfono no registrado"}</span>
                        <span className="font-mono">
                          Lic. {profile.license || "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                  {!isEditing && (
                    <Button
                      onClick={() => setIsEditing(true)}
                      variant="outline"
                      className="w-full sm:w-auto"
                    >
                      <Pencil className="mr-2 h-3.5 w-3.5" />
                      Editar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </MotionList>

          <div className="border-y border-[#ebebeb] bg-white px-4 py-4 sm:px-5">
            <dl className="grid grid-cols-3 gap-4 sm:gap-8">
              <div>
                <dt className="text-[11px] font-medium tracking-[0.08em] text-[#737373] uppercase">
                  Citas
                </dt>
                <dd className="mt-1 text-sm font-medium">
                  {profile.appointments?.length ?? 0}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium tracking-[0.08em] text-[#737373] uppercase">
                  Reseñas
                </dt>
                <dd className="mt-1 text-sm font-medium">
                  {profile.totalReviews ?? 0}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium tracking-[0.08em] text-[#737373] uppercase">
                  Calificación
                </dt>
                <dd className="mt-1 flex items-center gap-1 text-sm font-medium">
                  <Star className="h-3.5 w-3.5 fill-current text-[#171717]" />
                  {profile.rating?.toFixed(1) ?? "—"}
                </dd>
              </div>
            </dl>
          </div>

          {isEditing ? (
            <Card className="border-[#ebebeb] bg-white shadow-none">
              <CardHeader className="border-b border-[#ebebeb] px-5 py-4 sm:px-6">
                <CardTitle className="text-base">Editar perfil</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
                <div className="sm:col-span-2">
                  <label
                    className="mb-2 block text-xs font-medium text-[#525252]"
                    htmlFor="image"
                  >
                    Foto de perfil · enlace de imagen
                  </label>
                  <Input
                    id="image"
                    name="image"
                    type="url"
                    value={formData.image}
                    onChange={handleChange}
                    placeholder="https://…"
                  />
                  <p className="mt-1 text-xs text-[#737373]">
                    Usa un enlace público a una imagen.
                  </p>
                </div>
                <div>
                  <label
                    className="mb-2 block text-xs font-medium text-[#525252]"
                    htmlFor="name"
                  >
                    Nombre completo
                  </label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Tu nombre"
                  />
                </div>
                <div>
                  <label
                    className="mb-2 block text-xs font-medium text-[#525252]"
                    htmlFor="email"
                  >
                    Correo electrónico
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="tu@correo.com"
                  />
                </div>
                <div>
                  <label
                    className="mb-2 block text-xs font-medium text-[#525252]"
                    htmlFor="specialty"
                  >
                    Especialidad
                  </label>
                  <Input
                    id="specialty"
                    name="specialty"
                    value={formData.specialty}
                    onChange={handleChange}
                    placeholder="Cardiología"
                  />
                </div>
                <div>
                  <label
                    className="mb-2 block text-xs font-medium text-[#525252]"
                    htmlFor="phone"
                  >
                    Teléfono
                  </label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+52 555-000-0000"
                  />
                </div>
                <div>
                  <label
                    className="mb-2 block text-xs font-medium text-[#525252]"
                    htmlFor="license"
                  >
                    Cédula profesional
                  </label>
                  <Input
                    id="license"
                    name="license"
                    value={formData.license}
                    onChange={handleChange}
                    placeholder="Número de cédula"
                  />
                </div>
                <div>
                  <label
                    className="mb-2 block text-xs font-medium text-[#525252]"
                    htmlFor="experience"
                  >
                    Años de experiencia
                  </label>
                  <Input
                    id="experience"
                    type="number"
                    name="experience"
                    value={formData.experience}
                    onChange={handleChange}
                    min="0"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label
                    className="mb-2 block text-xs font-medium text-[#525252]"
                    htmlFor="about"
                  >
                    Acerca de mí
                  </label>
                  <Textarea
                    id="about"
                    name="about"
                    value={formData.about}
                    onChange={handleChange}
                    placeholder="Describe tu enfoque de atención..."
                    rows={4}
                    maxLength={1000}
                  />
                  <p className="mt-1 text-xs text-[#737373]">
                    {formData.about.length}/1000
                  </p>
                </div>
                <div className="flex gap-2 sm:col-span-2 sm:justify-end">
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    disabled={
                      updateProfile.isPending || updateAccount.isPending
                    }
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={
                      !hasChanges ||
                      updateProfile.isPending ||
                      updateAccount.isPending
                    }
                    aria-live="polite"
                  >
                    {updateProfile.isPending || updateAccount.isPending
                      ? "Guardando…"
                      : hasChanges
                        ? "Guardar cambios"
                        : "Sin cambios"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
              <section>
                <div className="mb-3 flex items-center justify-between gap-2 text-sm font-medium">
                  <span className="flex items-center gap-2">
                    <BriefcaseMedical className="h-4 w-4 text-[#737373]" />
                    Servicios
                  </span>
                  <Link
                    href="/dashboard/services"
                    className="min-h-9 rounded-md px-2 py-2 text-xs text-[#737373] transition-colors hover:bg-[#f5f5f5] hover:text-[#171717] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0070f3]"
                  >
                    Administrar servicios
                  </Link>
                </div>
                <MotionList className="divide-y divide-[#ebebeb] border-y border-[#ebebeb] bg-white">
                  {activeServices.length > 0 ? (
                    activeServices.map((service: DoctorService) => (
                      <div
                        key={service.id}
                        className="flex items-start justify-between gap-4 px-4 py-4 transition-colors duration-150 hover:bg-[#fafafa]"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{service.name}</p>
                          <p className="mt-1 text-xs text-[#737373]">
                            {service.description || `${service.duration} min`}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs text-[#525252]">
                          {service.price > 0
                            ? `$${service.price}`
                            : "Consultar"}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="px-4 py-5 text-sm text-[#737373]">
                      Aún no hay servicios activos.
                    </p>
                  )}
                </MotionList>
              </section>

              <section>
                <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                  <Star className="h-4 w-4 text-[#737373]" />
                  Reseñas recientes
                </div>
                <MotionList className="divide-y divide-[#ebebeb] border-y border-[#ebebeb] bg-white">
                  {reviews.length > 0 ? (
                    reviews.map((review: DoctorReview) => (
                      <div
                        key={review.id}
                        className="px-4 py-4 transition-colors duration-150 hover:bg-[#fafafa]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-medium">
                            {review.patient?.user?.name ?? "Paciente"}
                          </p>
                          <span className="flex items-center gap-1 text-xs text-[#525252]">
                            <Star className="h-3 w-3 fill-current" />{" "}
                            {review.rating}
                          </span>
                        </div>
                        {review.comment && (
                          <p className="mt-2 text-sm leading-6 text-[#525252]">
                            {review.comment}
                          </p>
                        )}
                        <p className="mt-2 text-xs text-[#737373]">
                          {new Date(review.createdAt).toLocaleDateString(
                            "es-MX",
                          )}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="px-4 py-5 text-sm text-[#737373]">
                      Aún no hay reseñas.
                    </p>
                  )}
                </MotionList>
              </section>
            </div>
          )}

          {!isEditing && profile.about && (
            <section className="border-t border-[#ebebeb] pt-6">
              <p className="mb-2 text-xs font-medium tracking-[0.08em] text-[#737373] uppercase">
                Acerca de mí
              </p>
              <p className="max-w-3xl text-sm leading-6 text-[#525252]">
                {profile.about}
              </p>
            </section>
          )}
        </div>
      </div>
    </ProductShell>
  );
}
