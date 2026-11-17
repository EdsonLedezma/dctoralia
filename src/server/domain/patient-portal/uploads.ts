import { Prisma, type PrismaClient } from "@prisma/client";

export class PatientUploadError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
export function patientUploadOwner(userId: string): Prisma.PatientWhereInput {
  return { OR: [{ userId }, { accountLink: { userId, active: true } }] };
}
export const MAX_PATIENT_FILE_BYTES = 4 * 1024 * 1024;
export const PATIENT_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];
export function remainingPatientUploads(capacity: number, used: number) {
  return Math.max(
    0,
    Math.min(2, Math.max(0, Math.floor(capacity))) -
      Math.max(0, Math.floor(used)),
  );
}
export async function listPatientUploadSpaces(
  db: PrismaClient,
  userId: string,
) {
  const spaces = await db.patientPortalAccess.findMany({
    where: { active: true, patient: patientUploadOwner(userId) },
    select: {
      id: true,
      patientId: true,
      doctorId: true,
      clinicId: true,
      doctor: { select: { specialty: true, user: { select: { name: true } } } },
      clinic: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return Promise.all(
    spaces.map(async (space) => {
      const grants = await db.patientUploadGrant.findMany({
        where: {
          patientId: space.patientId,
          doctorId: space.doctorId,
          clinicId: space.clinicId,
          encounter: { status: "SIGNED" },
        },
        select: {
          id: true,
          capacity: true,
          used: true,
          createdAt: true,
          encounter: { select: { encounterAt: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      const files = await db.clinicalFile.findMany({
        where: {
          patientId: space.patientId,
          clinicId: space.clinicId,
          uploadedByUserId: userId,
          uploadReservation: { grant: { doctorId: space.doctorId } },
        },
        select: {
          id: true,
          originalFilename: true,
          mediaType: true,
          sizeBytes: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      const pendingUploads = await db.patientUploadReservation.findMany({
        where: {
          userId,
          status: { in: ["RESERVED", "FAILED"] },
          grant: {
            patientId: space.patientId,
            doctorId: space.doctorId,
            clinicId: space.clinicId,
          },
        },
        select: {
          id: true,
          grantId: true,
          originalFilename: true,
          pathname: true,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
      return {
        ...space,
        grants: grants.map((grant) => ({
          id: grant.id,
          consultationAt: grant.encounter.encounterAt,
          remaining: remainingPatientUploads(grant.capacity, grant.used),
        })),
        files,
        pendingUploads: pendingUploads.map((upload) => ({
          id: upload.id,
          grantId: upload.grantId,
          filename: upload.originalFilename,
          requestId: upload.pathname.split("/").at(-1) ?? "",
        })),
      };
    }),
  );
}

/** Reserve before touching storage: failures never replenish a reservation automatically. */
export async function reservePatientUpload(
  db: PrismaClient,
  userId: string,
  grantId: string,
  filename: string,
  requestId: string,
  contentHash: string,
) {
  return db.$transaction(
    (tx) =>
      reservePatientUploadWithin(
        tx,
        userId,
        grantId,
        filename,
        requestId,
        contentHash,
      ),
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function reservePatientUploadWithin(
  tx: Pick<
    Prisma.TransactionClient,
    "patientUploadGrant" | "patientPortalAccess" | "patientUploadReservation"
  >,
  userId: string,
  grantId: string,
  filename: string,
  requestId: string,
  contentHash: string,
) {
  const grant = await tx.patientUploadGrant.findFirst({
    where: {
      id: grantId,
      patient: patientUploadOwner(userId),
      encounter: { status: "SIGNED" },
    },
    select: {
      id: true,
      capacity: true,
      used: true,
      clinicId: true,
      patientId: true,
      doctorId: true,
      encounterId: true,
    },
  });
  if (!grant)
    throw new PatientUploadError(
      404,
      "Esta consulta no tiene un cupo disponible para tu cuenta.",
    );
  const access = await tx.patientPortalAccess.findFirst({
    where: {
      patientId: grant.patientId,
      doctorId: grant.doctorId,
      clinicId: grant.clinicId,
      active: true,
    },
    select: { id: true },
  });
  if (!access)
    throw new PatientUploadError(
      403,
      "Tu acceso a este consultorio no está activo.",
    );
  const pathname = `patient-studies/${grant.clinicId}/${grant.patientId}/${requestId}`;
  const existing = await tx.patientUploadReservation.findUnique({
    where: { pathname },
  });
  if (existing) {
    if (
      existing.grantId !== grant.id ||
      existing.userId !== userId ||
      existing.contentHash !== contentHash ||
      existing.originalFilename !== filename
    )
      throw new PatientUploadError(
        409,
        "El identificador de envío ya corresponde a otro archivo.",
      );
    return { ...grant, reservationId: existing.id, pathname, reused: true };
  }
  if (!remainingPatientUploads(grant.capacity, grant.used))
    throw new PatientUploadError(
      409,
      "Ya utilizaste los dos espacios de esta consulta.",
    );
  const claimed = await tx.patientUploadGrant.updateMany({
    where: { id: grant.id, used: { lt: Math.min(2, grant.capacity) } },
    data: { used: { increment: 1 } },
  });
  if (claimed.count !== 1)
    throw new PatientUploadError(
      409,
      "El cupo cambió. Actualiza la página antes de intentar otra vez.",
    );
  const reservation = await tx.patientUploadReservation.create({
    data: {
      grantId: grant.id,
      userId,
      pathname,
      originalFilename: filename,
      contentHash,
    },
  });
  return {
    ...grant,
    reservationId: reservation.id,
    pathname: reservation.pathname,
    reused: false,
  };
}
