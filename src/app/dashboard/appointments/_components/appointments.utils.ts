export const DAILY_TIME_SLOTS = [
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
] as const;

export const formatAppointmentDate = (date: Date) =>
  date.toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

export const getAppointmentStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "confirmada":
      return "bg-green-100 text-green-800";
    case "pendiente":
      return "bg-yellow-100 text-yellow-800";
    case "completada":
      return "bg-blue-100 text-blue-800";
    case "cancelada":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export const normalizeAppointmentStatus = (status: string) => {
  const statusMap: Record<string, string> = {
    PENDING: "pendiente",
    CONFIRMED: "confirmada",
    COMPLETED: "completada",
    CANCELLED: "cancelada",
    NO_SHOW: "no show",
  };

  return statusMap[status] ?? status.toLowerCase();
};
