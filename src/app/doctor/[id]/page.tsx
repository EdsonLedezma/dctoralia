import { Suspense } from "react";
import { DoctorProfileView } from "./_components/doctor-profile-view";
import { DoctorProfileLoading } from "./_components/doctor-profile-loading";
export default function DoctorProfilePage() {
  return (
    <Suspense fallback={<DoctorProfileLoading />}>
      <DoctorProfileView />
    </Suspense>
  );
}
