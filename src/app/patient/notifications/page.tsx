import DashboardWrapper from "~/components/auth/DashboardWrapper";
import { NotificationPreferences } from "~/components/notifications/notification-preferences";
import { ProductShell } from "~/components/shell/product-shell";

export default function PatientNotificationsPage() {
  return (
    <DashboardWrapper allowedRoles={["PATIENT"]}>
      <ProductShell role="PATIENT">
        <NotificationPreferences />
      </ProductShell>
    </DashboardWrapper>
  );
}
