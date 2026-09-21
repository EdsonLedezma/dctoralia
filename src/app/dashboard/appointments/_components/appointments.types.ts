export type DailyAppointment = {
  id: string;
  time: string;
  duration: number;
  status: string;
  reason?: string | null;
  patient: {
    name: string;
    phone?: string;
  };
  service: {
    name: string;
  };
};

export type SummaryColor = "blue" | "green" | "yellow";
