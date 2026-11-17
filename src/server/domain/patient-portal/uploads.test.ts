import { describe, expect, it, vi, afterEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { remainingPatientUploads, reservePatientUploadWithin } from "./uploads";
const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: "postgresql://unused:unused@localhost:1/unused",
  }),
});
const now = new Date("2026-11-15T00:00:00Z");
const grant = {
  id: "grant",
  patientId: "patient",
  doctorId: "doctor",
  clinicId: "clinic",
  encounterId: "encounter",
  used: 2,
  capacity: 2,
  createdAt: now,
  updatedAt: now,
};
const access = {
  id: "access",
  patientId: "patient",
  doctorId: "doctor",
  clinicId: "clinic",
  active: true,
  createdAt: now,
  updatedAt: now,
};
const requestId = "550e8400-e29b-41d4-a716-446655440000";
afterEach(() => vi.restoreAllMocks());
describe("patient file allowance", () => {
  it("allows no more than two files for one completed consultation", () => {
    expect(remainingPatientUploads(2, 0)).toBe(2);
    expect(remainingPatientUploads(2, 1)).toBe(1);
    expect(remainingPatientUploads(2, 2)).toBe(0);
    expect(remainingPatientUploads(99, 2)).toBe(0);
  });
  it("does not reserve storage when the allowance is exhausted", async () => {
    vi.spyOn(db.patientUploadGrant, "findFirst").mockResolvedValue(grant);
    vi.spyOn(db.patientPortalAccess, "findFirst").mockResolvedValue(access);
    vi.spyOn(db.patientUploadReservation, "findUnique").mockResolvedValue(null);
    const create = vi.spyOn(db.patientUploadReservation, "create");
    const increment = vi.spyOn(db.patientUploadGrant, "updateMany");
    await expect(
      reservePatientUploadWithin(
        db,
        "user",
        "grant",
        "study.pdf",
        requestId,
        "hash",
      ),
    ).rejects.toThrow("dos espacios");
    expect(create).not.toHaveBeenCalled();
    expect(increment).not.toHaveBeenCalled();
  });
  it("reuses the same reserved upload even when the balance reached zero", async () => {
    vi.spyOn(db.patientUploadGrant, "findFirst").mockResolvedValue(grant);
    vi.spyOn(db.patientPortalAccess, "findFirst").mockResolvedValue(access);
    vi.spyOn(db.patientUploadReservation, "findUnique").mockResolvedValue({
      id: "reservation",
      grantId: "grant",
      userId: "user",
      pathname: `patient-studies/clinic/patient/${requestId}`,
      originalFilename: "study.pdf",
      contentHash: "hash",
      status: "FAILED",
      createdAt: now,
      updatedAt: now,
    });
    const increment = vi.spyOn(db.patientUploadGrant, "updateMany");
    const result = await reservePatientUploadWithin(
      db,
      "user",
      "grant",
      "study.pdf",
      requestId,
      "hash",
    );
    expect(result.reservationId).toBe("reservation");
    expect(result.reused).toBe(true);
    expect(increment).not.toHaveBeenCalled();
  });
  it("denies the reservation if the patient has no active portal access", async () => {
    vi.spyOn(db.patientUploadGrant, "findFirst").mockResolvedValue({
      ...grant,
      used: 0,
    });
    vi.spyOn(db.patientPortalAccess, "findFirst").mockResolvedValue(null);
    const increment = vi.spyOn(db.patientUploadGrant, "updateMany");
    await expect(
      reservePatientUploadWithin(
        db,
        "user",
        "grant",
        "study.pdf",
        requestId,
        "hash",
      ),
    ).rejects.toThrow("no está activo");
    expect(increment).not.toHaveBeenCalled();
  });
  it("does not create a file reservation when a concurrent request took the final slot", async () => {
    vi.spyOn(db.patientUploadGrant, "findFirst").mockResolvedValue({
      ...grant,
      used: 1,
    });
    vi.spyOn(db.patientPortalAccess, "findFirst").mockResolvedValue(access);
    vi.spyOn(db.patientUploadReservation, "findUnique").mockResolvedValue(null);
    vi.spyOn(db.patientUploadGrant, "updateMany").mockResolvedValue({
      count: 0,
    });
    const create = vi.spyOn(db.patientUploadReservation, "create");
    await expect(
      reservePatientUploadWithin(
        db,
        "user",
        "grant",
        "study.pdf",
        requestId,
        "hash",
      ),
    ).rejects.toThrow("cupo cambió");
    expect(create).not.toHaveBeenCalled();
  });
  it("cannot reserve a grant that does not belong to the authenticated patient", async () => {
    vi.spyOn(db.patientUploadGrant, "findFirst").mockResolvedValue(null);
    const accessQuery = vi.spyOn(db.patientPortalAccess, "findFirst");
    const increment = vi.spyOn(db.patientUploadGrant, "updateMany");
    await expect(
      reservePatientUploadWithin(
        db,
        "another-user",
        "grant",
        "study.pdf",
        requestId,
        "hash",
      ),
    ).rejects.toThrow("tu cuenta");
    expect(accessQuery).not.toHaveBeenCalled();
    expect(increment).not.toHaveBeenCalled();
  });
  it("does not reuse a reservation for different bytes", async () => {
    vi.spyOn(db.patientUploadGrant, "findFirst").mockResolvedValue(grant);
    vi.spyOn(db.patientPortalAccess, "findFirst").mockResolvedValue(access);
    vi.spyOn(db.patientUploadReservation, "findUnique").mockResolvedValue({
      id: "reservation",
      grantId: "grant",
      userId: "user",
      pathname: `patient-studies/clinic/patient/${requestId}`,
      originalFilename: "study.pdf",
      contentHash: "original-hash",
      status: "FAILED",
      createdAt: now,
      updatedAt: now,
    });
    const increment = vi.spyOn(db.patientUploadGrant, "updateMany");
    await expect(
      reservePatientUploadWithin(
        db,
        "user",
        "grant",
        "study.pdf",
        requestId,
        "different-hash",
      ),
    ).rejects.toThrow("otro archivo");
    expect(increment).not.toHaveBeenCalled();
  });
});
