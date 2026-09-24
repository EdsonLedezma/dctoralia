import { PrismaClient } from "@prisma/client";
import { hash } from "argon2";
import nextEnv from "@next/env";
import { fileURLToPath } from "node:url";
import {
  buildDemoData,
  DEMO_DOMAIN,
  DEMO_VERSION,
  DEMO_PASSWORD,
  DEMO_ACCOUNTS,
} from "./demo-data";
import { validateDemoTarget } from "./demo-safety";
import { DemoSeedError, formatDemoError } from "./demo-errors";

let phase = "preparación";

async function main() {
  const data = buildDemoData();
  const apply = process.argv.slice(2).includes("--apply");
  const allowExisting = process.argv.slice(2).includes("--allow-existing");
  console.log("Dopilot · datos ficticios de demostración");
  console.table({
    workspaces: data.clinics.length,
    doctores: data.doctors.length,
    pacientes: data.patients.length,
    servicios: data.services.length,
    citas: data.appointments.length,
    reseñas: data.reviews.length,
    notificaciones: data.notifications.length,
    mensajes_simulados: data.messages.length,
  });
  if (!apply) {
    console.log(
      "Vista previa: no se abrió una conexión ni se escribió en la base. Consulta docs/DATOS_DEMO.md para aplicar.",
    );
    return;
  }
  phase = "configuración";
  let envLoadFailed = false;
  nextEnv.loadEnvConfig(
    fileURLToPath(new URL("../../", import.meta.url)),
    process.env.NODE_ENV !== "production",
    {
      info: () => undefined,
      error: () => {
        envLoadFailed = true;
      },
    },
  );
  if (envLoadFailed) throw new DemoSeedError("ENV_LOAD_FAILED");
  const config = validateDemoTarget({
    url: process.env.POSTGRES_PRISMA_URL,
    nodeEnv: process.env.NODE_ENV,
  });
  const passwordHash = await hash(DEMO_PASSWORD);
  // Same connection and env precedence as the app, without its query/error logger.
  const db = new PrismaClient({ datasourceUrl: config.url, log: [] });
  try {
    phase = "conexión/carga";
    const applied = await db.$transaction(
      async (tx) => {
        const [foreignUsers, foreignClinics] = await Promise.all([
          tx.user.count({
            where: {
              id: {
                notIn: data.users.flatMap((item) => (item.id ? [item.id] : [])),
              },
            },
          }),
          tx.clinic.count({
            where: { id: { notIn: data.clinics.map((item) => item.id) } },
          }),
        ]);
        if (!allowExisting && (foreignUsers || foreignClinics))
          throw new DemoSeedError("EXISTING_DATA");
        const [demoUsers, demoClinics] = await Promise.all([
          tx.user.findMany({
            where: {
              OR: [
                { email: { endsWith: `@${DEMO_DOMAIN}` } },
                {
                  id: {
                    in: data.users.flatMap((item) =>
                      item.id ? [item.id] : [],
                    ),
                  },
                },
              ],
            },
            select: { id: true, email: true, role: true },
          }),
          tx.clinic.findMany({
            where: {
              OR: [
                { slug: { startsWith: DEMO_VERSION } },
                { id: { in: data.clinics.map((item) => item.id) } },
              ],
            },
            select: { id: true, slug: true },
          }),
        ]);
        if (
          demoUsers.some(
            (existing) =>
              !data.users.some(
                (item) =>
                  item.id === existing.id &&
                  item.email === existing.email &&
                  item.role === existing.role,
              ),
          ) ||
          demoClinics.some(
            (existing) =>
              !data.clinics.some(
                (item) =>
                  item.id === existing.id && item.slug === existing.slug,
              ),
          )
        ) {
          throw new DemoSeedError("IDENTITY_COLLISION");
        }
        // Deterministic IDs and createMany/skipDuplicates make reruns insert-only.
        // Existing appointments, passwords, notes and edits are never overwritten.
        const users = await tx.user.createMany({
          data: data.users.map((user) => ({ ...user, password: passwordHash })),
          skipDuplicates: true,
        });
        const clinics = await tx.clinic.createMany({
          data: data.clinics,
          skipDuplicates: true,
        });
        await tx.clinicSubscription.createMany({
          data: data.subscriptions,
          skipDuplicates: true,
        });
        await tx.clinicLocation.createMany({
          data: data.locations,
          skipDuplicates: true,
        });
        await tx.doctor.createMany({
          data: data.doctors,
          skipDuplicates: true,
        });
        await tx.clinicMember.createMany({
          data: data.members,
          skipDuplicates: true,
        });
        await tx.patient.createMany({
          data: data.patients,
          skipDuplicates: true,
        });
        await tx.medicalHistory.createMany({
          data: data.histories,
          skipDuplicates: true,
        });
        await tx.service.createMany({
          data: data.services,
          skipDuplicates: true,
        });
        await tx.schedule.createMany({
          data: data.schedules,
          skipDuplicates: true,
        });
        const appointments = await tx.appointment.createMany({
          data: data.appointments,
          skipDuplicates: true,
        });
        await tx.review.createMany({
          data: data.reviews,
          skipDuplicates: true,
        });
        await tx.notification.createMany({
          data: data.notifications,
          skipDuplicates: true,
        });
        await tx.messageOutbox.createMany({
          data: data.messages,
          skipDuplicates: true,
        });
        return {
          users: users.count,
          clinics: clinics.count,
          appointments: appointments.count,
        };
      },
      { isolationLevel: "Serializable", timeout: 60_000, maxWait: 10_000 },
    );
    phase = "carga confirmada/finalización";
    console.log(
      `${DEMO_VERSION}: ${applied.users} usuarios, ${applied.clinics} workspaces y ${applied.appointments} citas nuevas.`,
    );
    console.log(
      `Doctor: ${DEMO_ACCOUNTS.doctor}\nPaciente: ${DEMO_ACCOUNTS.patient}\nPro: ${DEMO_ACCOUNTS.pro}\nCustom: ${DEMO_ACCOUNTS.custom}`,
    );
    console.log(
      "Las cuentas demo nuevas usan password123. Un rerun no cambia contraseñas ni fechas existentes. No uses estas cuentas en producción.",
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  // Provider errors can contain connection strings or record details; never print them.
  console.error(`Seed interrumpido (${phase}): ${formatDemoError(error)}`);
  process.exitCode = 1;
});
