import { Suspense } from "react";
import { DoctorsDirectoryPage } from "./_components/doctors-directory-page";
export default function DoctorsPage() {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          className="bg-background text-muted-foreground min-h-dvh p-8"
        >
          Preparando directorio…
        </div>
      }
    >
      <DoctorsDirectoryPage />
    </Suspense>
  );
}
