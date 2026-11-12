"use client";

import {
  Map,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerPopup,
} from "~/components/ui/map";
import { MapPin } from "lucide-react";

export type MapDoctor = {
  id: string;
  name: string;
  specialty: string;
  city: string;
  state: string;
  address: string;
  latitude: number;
  longitude: number;
  googleMapsUrl: string;
};

function getGoogleMapsUrl(doctor: MapDoctor) {
  try {
    const url = new URL(doctor.googleMapsUrl);
    const host = url.hostname.toLowerCase();
    if (
      host === "google.com" ||
      host === "www.google.com" ||
      host === "maps.google.com" ||
      host === "google.com.mx" ||
      host === "www.google.com.mx" ||
      host === "maps.app.goo.gl" ||
      host === "goo.gl" ||
      host.endsWith(".google.com") ||
      host.endsWith(".google.com.mx")
    ) {
      return url.toString();
    }
  } catch {
    // Use the stored coordinates when a saved/legacy URL is not a Google Maps URL.
  }
  return `https://www.google.com/maps/search/?api=1&query=${doctor.latitude},${doctor.longitude}`;
}

export function DoctorsMap({ doctors }: { doctors: MapDoctor[] }) {
  const hasCartoBasemapKey = Boolean(
    process.env.NEXT_PUBLIC_CARTO_BASEMAP_API_KEY?.trim(),
  );
  const locatedDoctors = doctors.filter(
    (doctor) =>
      Number.isFinite(doctor.latitude) && Number.isFinite(doctor.longitude),
  );
  const center: [number, number] = locatedDoctors.length
    ? [
        locatedDoctors.reduce((sum, doctor) => sum + doctor.longitude, 0) /
          locatedDoctors.length,
        locatedDoctors.reduce((sum, doctor) => sum + doctor.latitude, 0) /
          locatedDoctors.length,
      ]
    : [-102.5, 23.6];

  return (
    <section
      aria-label="Ubicación de doctores"
      className="border-border bg-card overflow-hidden rounded-[24px] border"
    >
      <div className="border-border flex items-center justify-between border-b px-4 py-3 sm:px-5">
        <div>
          <h2 className="text-foreground text-sm font-semibold">
            Doctores en el mapa
          </h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {locatedDoctors.length} ubicaciones con coordenadas en México
          </p>
        </div>
        <span className="border-border text-muted-foreground rounded-full border px-2.5 py-1 text-xs">
          México
        </span>
      </div>
      <div className="relative h-[300px] sm:h-[380px]">
        {hasCartoBasemapKey ? (
          <Map
            center={center}
            zoom={locatedDoctors.length === 1 ? 11 : 4.2}
            className="absolute inset-0"
          >
            <MapControls showZoom showCompass={false} />
            {locatedDoctors.map((doctor) => (
              <MapMarker
                key={doctor.id}
                longitude={doctor.longitude}
                latitude={doctor.latitude}
              >
                <MarkerContent>
                  <button
                    type="button"
                    aria-label={`Ver ubicación de ${doctor.name}`}
                    className="focus-visible:outline-ring flex size-11 items-center justify-center rounded-full border-2 border-white bg-[#171717] text-[10px] font-semibold text-white shadow-[0_2px_10px_rgba(0,0,0,0.24)] transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98]"
                  >
                    {doctor.name
                      .split(" ")
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((name) => name[0])
                      .join("")}
                  </button>
                </MarkerContent>
                <MarkerPopup closeButton>
                  <div className="border-border bg-card text-foreground max-w-56 rounded-lg border p-3 shadow-lg">
                    <p className="text-sm font-semibold">{doctor.name}</p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {doctor.specialty}
                    </p>
                    <p className="text-muted-foreground mt-2 text-xs leading-5">
                      {[doctor.address, doctor.city, doctor.state]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                    <a
                      href={getGoogleMapsUrl(doctor)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground mt-2 inline-flex min-h-11 items-center text-xs font-medium hover:underline"
                    >
                      Abrir en Google Maps
                    </a>
                  </div>
                </MarkerPopup>
              </MapMarker>
            ))}
          </Map>
        ) : (
          <div className="bg-muted absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="border-border bg-card text-muted-foreground flex size-10 items-center justify-center rounded-full border">
              <MapPin className="size-5" />
            </div>
            <div>
              <p className="text-foreground text-sm font-medium">
                Mapa no disponible
              </p>
              <p className="text-muted-foreground mt-1 max-w-sm text-xs leading-5">
                Puedes consultar las direcciones de los profesionales y abrir
                sus ubicaciones en Google Maps.
              </p>
            </div>
            {locatedDoctors.length > 0 && (
              <div className="flex max-h-24 max-w-full flex-wrap justify-center gap-2 overflow-y-auto">
                {locatedDoctors.map((doctor) => (
                  <a
                    key={doctor.id}
                    href={getGoogleMapsUrl(doctor)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="glass-bubble inline-flex min-h-11 max-w-full items-center rounded-full border px-4 text-xs font-medium"
                  >
                    {doctor.name}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
        {hasCartoBasemapKey && locatedDoctors.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-end justify-center p-4">
            <p className="border-border bg-card/95 text-muted-foreground rounded-lg border px-3 py-2 text-center text-xs shadow-sm">
              Todavía no hay consultorios con coordenadas para mostrar. Los
              doctores pueden agregar ubicación desde su perfil.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
