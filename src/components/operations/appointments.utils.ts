export const getAppointmentStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "confirmada":
      return "border-border bg-accent text-foreground";
    case "pendiente":
      return "border-dashed border-foreground/40 bg-background text-foreground";
    case "cancelada":
      return "border-border bg-muted text-muted-foreground line-through";
    default:
      return "border-border bg-muted text-muted-foreground";
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
