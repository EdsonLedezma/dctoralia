"use client";
import Link from "next/link";
import { DopilotBrand } from "~/components/brand/dopilot-brand";
import { AppearanceMenu } from "~/components/shared/appearance-menu";
import { DoctorsDirectory } from "~/components/doctors/doctors-directory";
import { api } from "~/trpc/react";
export function PublicDoctors() {
  const query = api.doctor.getAll.useQuery();
  return (
    <div className="bg-background text-foreground min-h-dvh">
      <header className="border-border flex min-h-16 items-center justify-between gap-3 border-b px-5">
        <Link href="/" aria-label="Dopilot, inicio">
          <DopilotBrand />
        </Link>
        <AppearanceMenu />
      </header>
      <DoctorsDirectory
        doctors={query.data?.result ?? []}
        loading={query.isLoading}
        error={query.isError || !!query.data?.error}
        onRetry={() => void query.refetch()}
      />
    </div>
  );
}
