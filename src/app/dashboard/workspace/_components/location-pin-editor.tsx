"use client";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { env } from "~/env";
import { Button } from "~/components/ui/button";

type Point = { lat: number; lng: number };
type MapEvent = { latLng?: { lat(): number; lng(): number } | null };
type MapInstance = {
  addListener(
    event: string,
    callback: (event: MapEvent) => void,
  ): { remove(): void };
  panTo(point: Point): void;
};
type MarkerInstance = {
  position: Point | { lat(): number; lng(): number } | null;
  map: MapInstance | null;
  addEventListener(event: string, callback: () => void): void;
  removeEventListener(event: string, callback: () => void): void;
};
declare global {
  interface Window {
    google?: {
      maps: {
        importLibrary(name: string): Promise<unknown>;
        Map: new (
          element: HTMLElement,
          options: {
            center: Point;
            zoom: number;
            mapId: string;
            streetViewControl: boolean;
            mapTypeControl: boolean;
          },
        ) => MapInstance;
        marker: {
          AdvancedMarkerElement: new (options: {
            map: MapInstance;
            position: Point;
            gmpDraggable: boolean;
            title: string;
          }) => MarkerInstance;
        };
      };
    };
  }
}
export function LocationPinEditor({
  latitude,
  longitude,
  onChange,
}: {
  latitude: number | null;
  longitude: number | null;
  onChange: (point: Point) => void;
}) {
  const element = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const callback = useRef(onChange);
  useEffect(() => {
    callback.current = onChange;
  }, [onChange]);
  const initial = useRef({ latitude, longitude });
  const key = env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  useEffect(() => {
    if (!ready || !element.current || !window.google) return;
    const point = {
      lat: initial.current.latitude ?? 28.632,
      lng: initial.current.longitude ?? -106.0691,
    };
    const map = new window.google.maps.Map(element.current, {
      center: point,
      zoom: initial.current.latitude == null ? 5 : 16,
      mapId: env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID",
      streetViewControl: false,
      mapTypeControl: false,
    });
    const marker = new window.google.maps.marker.AdvancedMarkerElement({
      map,
      position: point,
      gmpDraggable: true,
      title: "Ubicación del consultorio. Arrastra para ajustar.",
    });
    const click = map.addListener("click", (event) => {
      if (!event.latLng) return;
      const next = { lat: event.latLng.lat(), lng: event.latLng.lng() };
      marker.position = next;
      callback.current(next);
    });
    const onDragEnd = () => {
      const position = marker.position;
      if (!position) return;
      callback.current({
        lat: typeof position.lat === "function" ? position.lat() : position.lat,
        lng: typeof position.lng === "function" ? position.lng() : position.lng,
      });
    };
    marker.addEventListener("gmp-dragend", onDragEnd);
    return () => {
      click.remove();
      marker.removeEventListener("gmp-dragend", onDragEnd);
      marker.map = null;
    };
  }, [ready]);
  if (!key)
    return (
      <p className="text-muted-foreground text-xs">
        Puedes guardar la dirección. El mapa para colocar el pin estará
        disponible cuando se configure Google Maps.
      </p>
    );
  if (!enabled)
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setEnabled(true)}
      >
        Ubicar en Google Maps
      </Button>
    );
  return (
    <div className="space-y-2">
      <Script
        id="consultorio-google-maps"
        src={`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=marker&v=weekly&loading=async`}
        onReady={() => {
          if (!window.google) {
            setFailed(true);
            return;
          }
          void Promise.all([
            window.google.maps.importLibrary("maps"),
            window.google.maps.importLibrary("marker"),
          ])
            .then(() => setReady(true))
            .catch(() => setFailed(true));
        }}
        onError={() => setFailed(true)}
      />
      {failed ? (
        <p role="alert" className="text-xs">
          No se pudo cargar Google Maps. Revisa la conexión o la configuración
          de la clave.
        </p>
      ) : (
        <>
          <div
            ref={element}
            className="h-56 w-full rounded-xl border"
            aria-label="Mapa para colocar la ubicación del consultorio"
          />
          <p className="text-muted-foreground text-xs">
            Toca el mapa o arrastra el pin hasta la entrada del consultorio. La
            dirección se escribe por separado.
          </p>
        </>
      )}
      <p className="text-xs">
        {latitude != null && longitude != null
          ? "Ubicación marcada"
          : "Selecciona la ubicación para guardar el pin"}
      </p>
    </div>
  );
}
