import { MapPin, ExternalLink } from "lucide-react";

type Location = {
  mapsUrl?: string | null;
  name?: string | null;
  address?: string | null;
  directions?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};
export function AppointmentLocation({ location }: { location: Location }) {
  if (!location.address)
    return (
      <p className="text-muted-foreground text-sm">
        El consultorio debe confirmar la dirección de atención.
      </p>
    );
  const destination =
    location.latitude != null && location.longitude != null
      ? `${location.latitude},${location.longitude}`
      : location.address;
  return (
    <div className="space-y-1 text-sm">
      <p className="flex items-center gap-2 font-medium">
        <MapPin className="h-4 w-4 shrink-0" />
        {location.name ?? "Consultorio"}
      </p>
      <p className="text-muted-foreground">{location.address}</p>
      {location.directions && (
        <p className="text-muted-foreground">{location.directions}</p>
      )}
      <a
        className="inline-flex min-h-11 items-center gap-1.5 underline underline-offset-4"
        href={
          location.mapsUrl ??
          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`
        }
        target="_blank"
        rel="noopener noreferrer"
      >
        Cómo llegar
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
