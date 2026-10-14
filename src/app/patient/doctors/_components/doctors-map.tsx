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
      className="overflow-hidden rounded-xl border border-[#ebebeb] bg-white"
    >
      <div className="flex items-center justify-between border-b border-[#ebebeb] px-4 py-3 sm:px-5">
        <div>
          <h2 className="text-sm font-semibold text-[#171717]">
            Doctores en el mapa
          </h2>
          <p className="mt-0.5 text-xs text-[#737373]">
            {locatedDoctors.length} ubicaciones con coordenadas en México
          </p>
        </div>
        <span className="rounded-full border border-[#ebebeb] px-2.5 py-1 text-xs text-[#737373]">
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
                    className="flex size-11 items-center justify-center rounded-full border-2 border-white bg-[#171717] text-[10px] font-semibold text-white shadow-[0_2px_10px_rgba(0,0,0,0.24)] transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0070f3] active:scale-[0.98]"
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
                  <div className="max-w-56 rounded-lg border border-[#ebebeb] bg-white p-3 text-[#171717] shadow-lg">
                    <p className="text-sm font-semibold">{doctor.name}</p>
                    <p className="mt-0.5 text-xs text-[#737373]">
                      {doctor.specialty}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-[#525252]">
                      {[doctor.address, doctor.city, doctor.state]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                    <a
                      href={getGoogleMapsUrl(doctor)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex min-h-11 items-center text-xs font-medium text-[#0070f3] hover:underline"
                    >
                      Abrir en Google Maps
                    </a>
                  </div>
                </MarkerPopup>
              </MapMarker>
            ))}
          </Map>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#f5f5f5] px-6 text-center">
            <div className="flex size-10 items-center justify-center rounded-full border border-[#e5e5e5] bg-white text-[#525252]">
              <MapPin className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#171717]">
                El mapa se está configurando
              </p>
              <p className="mt-1 max-w-sm text-xs leading-5 text-[#737373]">
                Las ubicaciones siguen disponibles en las fichas. Puedes abrir
                directamente las coordenadas en Google Maps.
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
                    className="max-w-48 truncate rounded-md border border-[#e5e5e5] bg-white px-2.5 py-1.5 text-xs font-medium text-[#404040] hover:border-[#a3a3a3]"
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
            <p className="rounded-lg border border-[#ebebeb] bg-white/95 px-3 py-2 text-center text-xs text-[#525252] shadow-sm">
              Todavía no hay consultorios con coordenadas para mostrar. Los
              doctores pueden agregar ubicación desde su perfil.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
