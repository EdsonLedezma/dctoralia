import DashboardWrapper from "~/components/auth/DashboardWrapper";
import { ProductShell } from "~/components/shell/product-shell";
import { PatientStudiesView } from "./_components/patient-studies-view";
export default function PatientStudiesPage() {
  return (
    <DashboardWrapper allowedRoles={["PATIENT"]}>
      <ProductShell role="PATIENT">
        <PatientStudiesView />
      </ProductShell>
    </DashboardWrapper>
  );
}
