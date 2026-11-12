"use client";
import { ProductShell } from "~/components/shell/product-shell";
import { DoctorsDirectory } from "~/components/doctors/doctors-directory";
import { api } from "~/trpc/react";
export function DoctorsDirectoryPage() {
  const query = api.doctor.getAll.useQuery();
  return (
    <ProductShell role="PATIENT">
      <DoctorsDirectory
        doctors={query.data?.result ?? []}
        loading={query.isLoading}
        error={query.isError || Boolean(query.data?.error)}
        onRetry={() => void query.refetch()}
      />
    </ProductShell>
  );
}
