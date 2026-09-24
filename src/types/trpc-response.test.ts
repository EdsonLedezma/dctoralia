import { describe, expect, it } from "vitest";
import { trpcFailure, trpcSuccess, unwrapTrpcResult } from "./trpc-response";

describe("contrato stack-web", () => {
  it("devuelve exactamente las cuatro propiedades obligatorias", () => {
    for (const response of [
      trpcSuccess({ id: "1" }, "Guardado"),
      trpcFailure("INVALID", "Revisa los datos", 400),
    ]) {
      expect(Object.keys(response).sort()).toEqual([
        "error",
        "message",
        "result",
        "status",
      ]);
    }
  });
  it("no confunde un error de negocio con un guardado exitoso", () => {
    expect(() =>
      unwrapTrpcResult(trpcFailure("CONFLICT", "Conflicto", 409)),
    ).toThrow("Conflicto");
    expect(unwrapTrpcResult(trpcSuccess({ id: "1" }, "OK"))).toEqual({
      id: "1",
    });
  });
});
