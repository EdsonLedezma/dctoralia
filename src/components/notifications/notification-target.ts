type Notice = {
  appointmentId?: string | null;
  followUpTaskId?: string | null;
  patientId: string;
};
export function notificationTarget(role: "DOCTOR" | "PATIENT", notice: Notice) {
  if (role === "DOCTOR" && notice.followUpTaskId)
    return (
      "/dashboard/follow-ups?taskId=" +
      encodeURIComponent(notice.followUpTaskId)
    );
  if (notice.appointmentId)
    return role === "DOCTOR"
      ? "/dashboard/appointments?appointmentId=" +
          encodeURIComponent(notice.appointmentId)
      : "/patient/appointments/" + encodeURIComponent(notice.appointmentId);
  return role === "DOCTOR"
    ? "/dashboard/patients/" + encodeURIComponent(notice.patientId)
    : "/patient/medical-history";
}
