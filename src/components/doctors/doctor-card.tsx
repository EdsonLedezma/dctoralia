import Link from "next/link";
import { CalendarDays, Clock3, MapPin, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { avatarUrl } from "~/lib/avatar-url";
import {
  doctorPrice,
  doctorRating,
  nextAvailableLabel,
  specialtyLabel,
  type DirectoryDoctor,
} from "./directory-model";

export function DoctorCard({
  doctor,
  directoryHref = "/patient/doctors",
}: {
  doctor: DirectoryDoctor;
  directoryHref?: string;
}) {
  const name = doctor.user?.name ?? "Profesional de salud";
  const service = [...doctor.services]
    .filter((item) => item.isActive)
    .sort((a, b) => Number(a.price) - Number(b.price))[0];
  const price = doctorPrice(doctor);
  const rating = doctorRating(doctor);
  const bookingQuery = new URLSearchParams();
  bookingQuery.set("from", directoryHref);
  const profileHref = `/doctor/${doctor.id}?${new URLSearchParams({ from: directoryHref })}`;
  if (service) bookingQuery.set("serviceId", service.id);
  if (doctor.nextAvailable) {
    bookingQuery.set("date", doctor.nextAvailable.date);
    bookingQuery.set("time", doctor.nextAvailable.time);
  }
  return (
    <Card className="gap-5 p-5 sm:p-6" data-doctor-card={doctor.id}>
      <div className="flex min-w-0 items-start gap-4">
        <Avatar className="size-14 shrink-0">
          {doctor.user?.image && (
            <AvatarImage
              src={avatarUrl(doctor.user.image, doctor.user.id)}
              alt={name}
            />
          )}
          <AvatarFallback>
            {name
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0])
              .join("")}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 sm:flex-none">
          <h2 className="text-lg font-semibold tracking-tight break-words">
            <Link
              href={profileHref}
              className="underline-offset-4 hover:underline"
            >
              {name}
            </Link>
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {specialtyLabel(doctor.specialty)}
          </p>
          <p className="text-muted-foreground mt-2 flex flex-wrap items-center gap-2 text-xs">
            <Star className="size-3.5" aria-hidden="true" />
            {rating > 0
              ? `${rating.toFixed(1)} · ${doctor.totalReviews ?? doctor.reviews.length} reseñas`
              : "Sin reseñas todavía"}
            <span aria-hidden="true">·</span>
            {doctor.experience ?? 0} años de experiencia
          </p>
        </div>
      </div>
      <div className="text-muted-foreground space-y-2 text-sm">
        <p className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 shrink-0" />
          <span>
            {[doctor.city, doctor.state].filter(Boolean).join(", ") ||
              "Ubicación por confirmar"}
            {doctor.address && (
              <span className="mt-1 block text-xs leading-5">
                {doctor.address}
              </span>
            )}
          </span>
        </p>
        {doctor.about && (
          <p className="line-clamp-2 leading-6">{doctor.about}</p>
        )}
      </div>
      <div className="border-border flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <p className="text-sm font-semibold">
          {Number.isFinite(price)
            ? `Desde $${price.toLocaleString("es-MX")}`
            : "Consultar precio"}
          <span className="text-muted-foreground ml-1 font-normal">
            por consulta
          </span>
        </p>
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <Clock3 className="size-3.5" />
          {nextAvailableLabel(doctor.nextAvailable)}
        </p>
      </div>
      <div className="flex flex-wrap gap-3 sm:justify-end">
        <Button
          asChild
          variant="outline"
          className="min-w-0 flex-1 sm:flex-none"
        >
          <Link href={profileHref}>Ver perfil</Link>
        </Button>
        {service ? (
          <Button asChild className="min-w-0 flex-1 sm:flex-none">
            <Link href={`/book-appointment/${doctor.id}?${bookingQuery}`}>
              <CalendarDays />
              Agendar cita
            </Link>
          </Button>
        ) : (
          <Button className="min-w-0 flex-1 sm:flex-none" disabled>
            Sin servicios
          </Button>
        )}
      </div>
    </Card>
  );
}
