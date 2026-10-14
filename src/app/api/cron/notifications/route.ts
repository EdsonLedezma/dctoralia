import { timingSafeEqual } from "node:crypto";
import { env } from "~/env";
import { db } from "~/server/db";

export const runtime = "nodejs";
export const maxDuration = 30;

function hasCronAuthorization(request: Request) {
  const secret = env.CRON_SECRET;
  if (!secret) return false;

  const expected = Buffer.from(`Bearer ${secret}`);
  const supplied = Buffer.from(request.headers.get("authorization") ?? "");
  return (
    supplied.length === expected.length && timingSafeEqual(supplied, expected)
  );
}

export async function GET(request: Request) {
  if (!hasCronAuthorization(request)) {
    return new Response(null, { status: 401 });
  }

  const now = new Date();
  try {
    const dueTasks = await db.followUpTask.findMany({
      where: {
        dueAt: { lte: now },
        dueAlertedAt: null,
        status: { in: ["OPEN", "IN_PROGRESS"] },
        assignedToUserId: { not: null },
      },
      orderBy: { dueAt: "asc" },
      take: 100,
      select: {
        id: true,
        clinicId: true,
        patientId: true,
        dueAt: true,
        assignedToUserId: true,
        assignedTo: {
          select: { doctor: { select: { id: true } } },
        },
      },
    });

    const created = await db.$transaction(async (tx) => {
      let notificationCount = 0;
      for (const task of dueTasks) {
        const doctorId = task.assignedTo?.doctor?.id;
        if (!doctorId || !task.assignedToUserId) continue;

        const claimed = await tx.followUpTask.updateMany({
          where: {
            id: task.id,
            clinicId: task.clinicId,
            dueAt: { lte: now },
            dueAlertedAt: null,
            status: { in: ["OPEN", "IN_PROGRESS"] },
            assignedToUserId: task.assignedToUserId,
          },
          data: { dueAlertedAt: now },
        });
        if (claimed.count !== 1) continue;

        const createdNotice = await tx.notification.createMany({
          data: [
            {
              recipientUserId: task.assignedToUserId,
              doctorId,
              patientId: task.patientId,
              clinicId: task.clinicId,
              followUpTaskId: task.id,
              idempotencyKey: `FOLLOW_UP_TASK_DUE:${task.id}`,
              type: "FOLLOW_UP_TASK_DUE",
              title: "Seguimiento vencido",
              message:
                "Hay una tarea de seguimiento pendiente que requiere atención.",
            },
          ],
          skipDuplicates: true,
        });
        notificationCount += createdNotice.count;
      }
      return notificationCount;
    });

    return Response.json({
      status: "ok",
      checked: dueTasks.length,
      created,
    });
  } catch {
    return new Response(null, { status: 503 });
  }
}
