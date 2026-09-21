"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { ProductShell } from "~/components/shell/product-shell";
import { MotionList } from "~/components/shared/motion-list";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Fetch appointments from backend
  const { data: appointmentsData, isLoading: appointmentsLoading } =
    api.appointments.listMine.useQuery(undefined, {
      enabled: status === "authenticated",
    });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "loading") return; // Still loading

    if (!session) {
      router.push("/login");
      return;
    }

    // Redirect patients to their dashboard
    if (session.user.role === "PATIENT") {
      router.push("/patient/dashboard");
      return;
    }

    // Only doctors should access this dashboard
    if (session.user.role !== "DOCTOR") {
      router.push("/login");
      return;
    }
  }, [session, status, router]);

  // Show loading while checking authentication or fetching data
  if (status === "loading" || appointmentsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span>Cargando...</span>
        </div>
      </div>
    );
  }

  // Don't render content if not authenticated or not a doctor
  if (!session || session.user.role !== "DOCTOR") {
    return null;
  }

  // Filter today's appointments
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const appointments = appointmentsData?.result ?? [];
  const todayAppointments = appointments
    .filter((appt) => {
      const apptDate = new Date(appt.date);
      apptDate.setHours(0, 0, 0, 0);
      return (
        apptDate.getTime() === today.getTime() &&
        (appt.status === "PENDING" || appt.status === "CONFIRMED")
      );
    })
    .sort((a, b) => a.time.localeCompare(b.time))
    .map((appt) => {
      // For doctor dashboard, appointments include patient data
      const patientName =
        "patient" in appt && appt.patient?.user?.name
          ? appt.patient.user.name
          : "Paciente";
      return {
        id: appt.id,
        patient: patientName,
        time: appt.time,
        type: appt.service?.name ?? appt.reason,
      };
    });

  return (
    <ProductShell role="DOCTOR">
      <div className="min-h-screen bg-[#fafafa]">
        <div className="mx-auto max-w-5xl p-4 sm:p-8">
          <div className="mb-4 flex items-end justify-between gap-4 border-b border-[#ebebeb] pb-4">
            <div>
              <p className="text-xs font-medium tracking-[0.08em] text-[#737373] uppercase">
                Agenda
              </p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight">Hoy</h1>
            </div>
            <Link
              href="/dashboard/appointments"
              className="text-sm font-medium text-[#525252] underline-offset-4 hover:text-[#171717] hover:underline"
            >
              Ver agenda completa
            </Link>
          </div>
          <MotionList className="divide-y divide-[#ebebeb] border-y border-[#ebebeb] bg-white">
            {todayAppointments.length > 0 ? (
              todayAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between gap-4 px-4 py-4 transition-colors duration-150 hover:bg-[#fafafa] sm:px-5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-2 w-2 shrink-0 rounded-full bg-[#171717]" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {appointment.patient}
                      </p>
                      <p className="mt-1 truncate text-xs text-[#737373]">
                        {appointment.type}
                      </p>
                    </div>
                  </div>
                  <time className="shrink-0 font-mono text-xs text-[#525252]">
                    {appointment.time}
                  </time>
                </div>
              ))
            ) : (
              <div className="px-5 py-12 text-center">
                <p className="text-sm font-medium">No hay citas programadas</p>
                <p className="mt-1 text-xs text-[#737373]">
                  Tu agenda de hoy está libre.
                </p>
              </div>
            )}
          </MotionList>
        </div>
      </div>
    </ProductShell>
  );
}
