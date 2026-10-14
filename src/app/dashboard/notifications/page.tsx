import DashboardWrapper from "~/components/auth/DashboardWrapper";
import { NotificationInbox } from "~/components/notifications/notification-inbox";
import { ProductShell } from "~/components/shell/product-shell";

export default function DoctorNotificationsPage() {
  return (
    <DashboardWrapper allowedRoles={["DOCTOR"]}>
      <ProductShell role="DOCTOR">
        <NotificationInbox role="DOCTOR" />
      </ProductShell>
    </DashboardWrapper>
  );
}
