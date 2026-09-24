"use client";

import { useMemo, useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import DashboardWrapper from "../../../components/auth/DashboardWrapper";
import { api } from "src/trpc/react";
import { ProductShell } from "~/components/shell/product-shell";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  DAILY_TIME_SLOTS,
  formatAppointmentDate,
  getAppointmentStatusColor,
  normalizeAppointmentStatus,
} from "./_components/appointments.utils";
import type { DailyAppointment } from "./_components/appointments.types";

export default function AppointmentsPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { data, isLoading } = api.appointments.listMine.useQuery();
  const appointmentResults = data?.result;

  const appointments = useMemo(() => {
    const allAppointments = appointmentResults ?? [];
    const targetDate = currentDate.toISOString().split("T")[0];
    return allAppointments
      .filter(
        (a) => new Date(a.date).toISOString().split("T")[0] === targetDate,
      )
      .map((a) => {
        return {
          id: a.id,
          time: a.time,
          duration: a.duration,
          status: normalizeAppointmentStatus(a.status),
          reason: a.reason,
          patient: {
            name: a.patient?.user?.name ?? "",
            phone: a.patient?.phone ?? "",
          },
          service: {
            name: a.service?.name ?? "Consulta",
          },
        } satisfies DailyAppointment;
      });
  }, [appointmentResults, currentDate]);

  const previousDay = () => {
    setCurrentDate((date) => {
      const newDate = new Date(date);
      newDate.setDate(newDate.getDate() - 1);
      return newDate;
    });
  };

  const nextDay = () => {
    setCurrentDate((date) => {
      const newDate = new Date(date);
      newDate.setDate(newDate.getDate() + 1);
      return newDate;
    });
  };

  return (
    <DashboardWrapper allowedRoles={["DOCTOR"]}>
      <ProductShell role="DOCTOR">
        <div className="min-h-screen bg-[#fafafa] px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-5 flex justify-end">
              <Link href="/dashboard/appointments/new" className="inline-flex">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva cita
                </Button>
              </Link>
            </div>
            <Card className="mb-6 border-[#ebebeb] bg-white shadow-none">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={previousDay}
                    aria-label="Día anterior"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="text-center">
                    <h2 className="text-lg font-semibold">
                      {formatAppointmentDate(currentDate)}
                    </h2>
                    <p className="text-sm text-[#6b6b6b]">
                      {appointments.length} citas programadas
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={nextDay}
                    aria-label="Día siguiente"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-[#ebebeb] bg-white shadow-none">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="space-y-3 p-6">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <Skeleton key={index} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-24">Hora</TableHead>
                          <TableHead>Paciente</TableHead>
                          <TableHead>Servicio</TableHead>
                          <TableHead>Duración</TableHead>
                          <TableHead>Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {DAILY_TIME_SLOTS.map((time) => {
                          const appointmentAtTime = appointments.find(
                            (appointment) => appointment.time === time,
                          );
                          return (
                            <TableRow key={time} className="group">
                              <TableCell className="font-mono text-xs text-[#737373]">
                                {time}
                              </TableCell>
                              <TableCell className="font-medium">
                                {appointmentAtTime?.patient.name || (
                                  <span className="font-normal text-[#a3a3a3]">
                                    Disponible
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-[#525252]">
                                {appointmentAtTime?.service.name || "—"}
                              </TableCell>
                              <TableCell className="text-[#737373]">
                                {appointmentAtTime
                                  ? `${appointmentAtTime.duration} min`
                                  : "—"}
                              </TableCell>
                              <TableCell>
                                {appointmentAtTime ? (
                                  <Badge
                                    className={getAppointmentStatusColor(
                                      appointmentAtTime.status,
                                    )}
                                  >
                                    {appointmentAtTime.status}
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-[#a3a3a3]">
                                    Libre
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </ProductShell>
    </DashboardWrapper>
  );
}
