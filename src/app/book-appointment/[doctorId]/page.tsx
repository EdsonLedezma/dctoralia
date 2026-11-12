import { Suspense } from "react";
import { BookingView } from "./_components/booking-view";
import BookingLoading from "./loading";
export default function BookAppointmentPage() {
  return (
    <Suspense fallback={<BookingLoading />}>
      <BookingView />
    </Suspense>
  );
}
