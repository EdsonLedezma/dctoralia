import DashboardWrapper from "~/components/auth/DashboardWrapper";
import { NotificationPreferences } from "~/components/notifications/notification-preferences";
import { ProductShell } from "~/components/shell/product-shell";

export default function DoctorNotificationsPage() {
  return (
    <DashboardWrapper allowedRoles={["DOCTOR"]}>
      <ProductShell role="DOCTOR">
        <NotificationPreferences />
      </ProductShell>
    </DashboardWrapper>
  );
}
