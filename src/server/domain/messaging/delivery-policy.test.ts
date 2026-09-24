import { describe, expect, it } from "vitest";
import { deliveryTransition } from "./delivery-policy";

describe("orden de estados de entrega", () => {
  it("no retrocede entregado/leído por callbacks tardíos", () => {
    expect(deliveryTransition("DELIVERED", "SENT")).toBeNull();
    expect(deliveryTransition("READ", "FAILED")).toBeNull();
    expect(deliveryTransition("DELIVERED", "FAILED")).toBeNull();
  });
  it("no reintenta rechazos terminales del proveedor", () => {
    for (const status of ["FAILED", "FILTERED", "BLOCKED"])
      expect(deliveryTransition("SENT", status)).toBe("DEAD_LETTER");
  });
  it("acepta confirmación tardía y deduplica estados", () => {
    expect(deliveryTransition("DEAD_LETTER", "DELIVERED")).toBe("DELIVERED");
    expect(deliveryTransition("DELIVERED", "DELIVERED")).toBeNull();
    expect(deliveryTransition("SENT", "READ")).toBe("READ");
  });
});
