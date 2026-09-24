import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { DemoSeedError, formatDemoError } from "./demo-errors";

describe("diagnóstico seguro del seed", () => {
  it("explica la variable de conexión existente", () => {
    expect(formatDemoError(new DemoSeedError("MISSING_URL"))).toContain(
      "POSTGRES_PRISMA_URL",
    );
  });
  it("identifica columnas faltantes sin exponer detalles internos", () => {
    const error = new Prisma.PrismaClientKnownRequestError(
      "secret-database-details",
      {
        code: "P2022",
        clientVersion: "test",
        meta: { column: "private-column" },
      },
    );
    const message = formatDemoError(error);
    expect(message).toContain("P2022");
    expect(message).toContain("columna");
    expect(message).not.toContain("secret");
    expect(message).not.toContain("private");
  });
  it("distingue problemas de conexión de problemas del esquema", () => {
    expect(
      formatDemoError(
        new Prisma.PrismaClientInitializationError(
          "private-host",
          "test",
          "P1001",
        ),
      ),
    ).toContain("[P1001] No se pudo alcanzar PostgreSQL");
  });
  it("no publica mensajes desconocidos ni credenciales", () => {
    const message = formatDemoError(
      new Error("postgresql://user:secret@private-host/db"),
    );
    expect(message).toContain("SEED_ERROR");
    expect(message).not.toContain("secret");
    expect(message).not.toContain("private-host");
  });
});
