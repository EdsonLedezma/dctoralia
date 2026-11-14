/** Datos del responsable que aparecen en los documentos legales. */
export const LEGAL_ENTITY = {
  name: "SOUND MIND, S.A. DE C.V.",
  address:
    "Calle Andrés Quintana Roo Sur número 1312, Colonia Ocho Cedros, Municipio de Toluca, Estado de México, C.P. 50170",
  email: "contacto@soundmind.mx",
} as const;

/**
 * Versión del paquete legal (Términos y Condiciones + Aviso de Privacidad).
 * Al cambiar cualquiera de los dos documentos de forma material, actualiza
 * este valor: todos los usuarios verán el modal de aceptación una vez más.
 */
export const LEGAL_VERSION = "2026-11-12";

export const LEGAL_UPDATED_LABEL = "12 de noviembre de 2026";

/**
 * Contenido de una sección. Cada elemento es un párrafo o, si es un arreglo,
 * una lista con viñetas.
 */
export type LegalSection = {
  title: string;
  content: (string | string[])[];
};
