export type DailyAppointment = {
  id: string;
  time: string;
  date: string;
  duration: number;
  status: string;
  rawStatus: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  checkedInAt?: Date | null;
  consultationStartedAt?: Date | null;
  reason?: string | null;
  patient: {
    id: string;
    name: string;
    phone?: string;
  };
  service: {
    id: string;
    name: string;
  };
  location?: {
    id: string;
    name: string;
  } | null;
};

export type SummaryColor = "blue" | "green" | "yellow";
