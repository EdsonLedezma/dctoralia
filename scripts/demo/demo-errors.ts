import { Prisma } from "@prisma/client";

const messages = {
  PRODUCTION:
    "El seed usa una contraseña pública de prueba y no se ejecuta con NODE_ENV=production.",
  MISSING_URL:
    "Falta POSTGRES_PRISMA_URL en tus archivos .env. Es la conexión que usa la app; no necesitas variables DEMO_*.",
  INVALID_URL:
    "POSTGRES_PRISMA_URL debe ser una URL PostgreSQL válida con nombre de base de datos.",
  ENV_LOAD_FAILED:
    "No fue posible leer los archivos .env del proyecto. Revisa su formato y permisos.",
  EXISTING_DATA:
    "La base contiene datos existentes. Usa pnpm demo:seed --allow-existing para agregar los demo sin reemplazarlos.",
  IDENTITY_COLLISION:
    "Hay correos o identificadores demo ocupados o modificados. Se canceló la carga sin reemplazarlos.",
} as const;

export class DemoSeedError extends Error {
  constructor(readonly code: keyof typeof messages) {
    super(messages[code]);
  }
}

const databaseMessages: Record<string, string> = {
  P1000:
    "Credenciales PostgreSQL rechazadas. Revisa usuario y contraseña de POSTGRES_PRISMA_URL.",
  P1001:
    "No se pudo alcanzar PostgreSQL. Revisa conexión, host y disponibilidad del servidor.",
  P1002: "PostgreSQL no respondió a tiempo.",
  P1003: "La base configurada no existe en el servidor.",
  P1010: "El usuario PostgreSQL no tiene permisos para acceder a la base.",
  P1011: "Falló la conexión TLS. Revisa la configuración SSL de PostgreSQL.",
  P1012:
    "La configuración de Prisma no es válida. Revisa el esquema y sus variables de entorno.",
  P1013: "La cadena de conexión PostgreSQL no es válida.",
  P2002:
    "Hay un conflicto de valores únicos. No se reemplazaron registros existentes.",
  P2003: "Una relación del dataset no coincide con los registros existentes.",
  P2021:
    "Falta una tabla del esquema en la base elegida. Revisa el destino antes de aplicar pnpm db:push manualmente.",
  P2022:
    "Falta una columna del esquema en la base elegida. Revisa el destino antes de aplicar pnpm db:push manualmente.",
  P2024: "Se agotó el tiempo de espera del pool de conexiones.",
  P2028:
    "La transacción expiró o no pudo completarse. Revisa la disponibilidad de PostgreSQL.",
  P2034:
    "Otra operación modificó datos durante la carga. Vuelve a intentar el mismo comando.",
};

export function formatDemoError(error: unknown): string {
  if (error instanceof DemoSeedError) return `[${error.code}] ${error.message}`;
  const code =
    error instanceof Prisma.PrismaClientKnownRequestError
      ? error.code
      : error instanceof Prisma.PrismaClientInitializationError
        ? error.errorCode
        : undefined;
  if (code && databaseMessages[code])
    return `[${code}] ${databaseMessages[code]}`;
  if (error instanceof Prisma.PrismaClientValidationError)
    return "[CLIENT_VALIDATION] El cliente Prisma no coincide con la carga. Regenera los tipos con pnpm prisma generate.";
  return "[SEED_ERROR] No se pudo completar la carga. Consulta docs/DATOS_DEMO.md. Se ocultaron detalles internos para no exponer credenciales.";
}
