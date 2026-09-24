import { describe, expect, it } from "vitest";
import {
  buildDemoData,
  DEMO_ACCOUNTS,
  DEMO_PASSWORD,
  DEMO_DOMAIN,
  demoId,
} from "./demo-data";
import { validateDemoTarget } from "./demo-safety";

const now = new Date("2026-09-24T18:00:00Z");
const data = buildDemoData(now);
describe("dataset demo sin conexión a base de datos", () => {
  it("llena ambos recorridos y los tres planes", () => {
    expect(data.doctors).toHaveLength(8);
    expect(data.patients).toHaveLength(24);
    expect(data.appointments).toHaveLength(408);
    expect(data.subscriptions.map((item) => item.plan)).toEqual([
      "PRO",
      "ENTERPRISE",
      "CUSTOM",
    ]);
    for (const doctor of data.doctors)
      expect(
        data.appointments.filter(
          (item) =>
            item.doctorId === doctor.id &&
            new Date(item.date).getTime() === data.anchor.getTime(),
        ),
      ).toHaveLength(3);
    expect(
      data.appointments.some(
        (item) =>
          item.patientId === demoId("patient:0") &&
          item.doctorId === demoId("doctor:1") &&
          new Date(item.date).getTime() === data.anchor.getTime(),
      ),
    ).toBe(true);
  });
  it("usa identidades estables y fechas del calendario de México", () => {
    expect(buildDemoData(now)).toEqual(data);
    expect(
      buildDemoData(new Date("2026-09-25T02:00:00Z")).anchor.toISOString(),
    ).toBe("2026-09-24T00:00:00.000Z");
    expect(new Set(data.appointments.map((item) => item.id)).size).toBe(408);
  });
  it("mantiene relaciones y duración de servicios coherentes", () => {
    for (const appointment of data.appointments) {
      const service = data.services.find(
        (item) => item.id === appointment.serviceId,
      );
      expect(service).toBeDefined();
      expect(service?.doctorId).toBe(appointment.doctorId);
      expect(service?.clinicId).toBe(appointment.clinicId);
      expect(service?.duration).toBe(appointment.duration);
      expect(
        data.patients.some((item) => item.id === appointment.patientId),
      ).toBe(true);
      expect(
        data.locations.some(
          (item) =>
            item.id === appointment.locationId &&
            item.clinicId === appointment.clinicId,
        ),
      ).toBe(true);
      expect(
        new Date(appointment.createdAt ?? now).getTime(),
      ).toBeLessThanOrEqual(now.getTime());
    }
  });
  it("no agenda un paciente dos veces el mismo día y no solapa horarios", () => {
    const patients = data.appointments.map(
      (item) => `${item.patientId}:${new Date(item.date).toISOString()}`,
    );
    const slots = data.appointments.map(
      (item) =>
        `${item.doctorId}:${new Date(item.date).toISOString()}:${item.time}`,
    );
    expect(new Set(patients).size).toBe(data.appointments.length);
    expect(new Set(slots).size).toBe(data.appointments.length);
  });
  it("cada reseña tiene una cita completada y el rating coincide", () => {
    for (const review of data.reviews)
      expect(
        data.appointments.some(
          (item) =>
            item.doctorId === review.doctorId &&
            item.patientId === review.patientId &&
            item.status === "COMPLETED",
        ),
      ).toBe(true);
    for (const doctor of data.doctors) {
      const reviews = data.reviews.filter(
        (item) => item.doctorId === doctor.id,
      );
      expect(doctor.totalReviews).toBe(reviews.length);
      expect(doctor.rating).toBe(
        reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length,
      );
    }
  });
  it("no genera identidades/contactos reales ni mensajes despachables", () => {
    expect(
      data.users.every(
        (item) =>
          item.email.endsWith(`@${DEMO_DOMAIN}`) &&
          item.phone?.startsWith("DEMO-") &&
          item.password === "",
      ),
    ).toBe(true);
    expect(
      data.messages.every(
        (item) =>
          item.provider === "demo" &&
          item.sandbox === true &&
          item.status !== "PENDING" &&
          item.status !== "FAILED",
      ),
    ).toBe(true);
    expect(
      data.subscriptions.every(
        (item) =>
          item.provider === "demo" &&
          !item.providerCustomerId &&
          !item.providerSubscriptionId,
      ),
    ).toBe(true);
  });
});

describe("guardrails de carga manual", () => {
  const valid = {
    url: "postgresql://test:test@localhost/neondb",
    nodeEnv: "development",
  };
  it("usa la conexión existente sin variables demo adicionales", () => {
    expect(() => validateDemoTarget({})).toThrow();
    expect(() => validateDemoTarget({ ...valid, url: undefined })).toThrow();
    expect(validateDemoTarget(valid).url).toBe(valid.url);
  });
  it("rechaza producción y conexiones inválidas", () => {
    expect(() =>
      validateDemoTarget({ ...valid, nodeEnv: "production" }),
    ).toThrow();
    for (const url of [
      "",
      "invalid",
      "https://localhost/neondb",
      "postgresql://localhost/",
    ]) {
      expect(() => validateDemoTarget({ ...valid, url })).toThrow();
    }
  });
  it("deja los accesos públicos en el seed", () => {
    expect(DEMO_PASSWORD).toBe("password123");
    for (const email of Object.values(DEMO_ACCOUNTS)) {
      expect(data.users.some((user) => user.email === email)).toBe(true);
    }
  });
});
