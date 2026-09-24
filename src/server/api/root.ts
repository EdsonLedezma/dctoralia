import { authRouter } from "~/server/api/routers/auth";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { useAppointment } from "~/server/api/routers/appointment";
import { usePatients } from "~/server/api/routers/patients";
import { useUsers } from "~/server/api/routers/users";
import { useDoctor } from "~/server/api/routers/doctor";
import { useSchedule } from "~/server/api/routers/schedule";
import { useService } from "~/server/api/routers/service";
import { useNotifications } from "~/server/api/routers/notifications";
import { reviewRouter } from "~/server/api/routers/review";
import { workspaceRouter } from "~/server/api/routers/workspace";
import { billingRouter } from "~/server/api/routers/billing";
import { messagingRouter } from "~/server/api/routers/messaging";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  auth: authRouter,
  appointments: useAppointment,
  patients: usePatients,
  users: useUsers,
  doctor: useDoctor,
  schedule: useSchedule,
  services: useService,
  notifications: useNotifications,
  review: reviewRouter,
  workspace: workspaceRouter,
  billing: billingRouter,
  messaging: messagingRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
