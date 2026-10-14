import DashboardWrapper from "~/components/auth/DashboardWrapper";
import { NotificationInbox } from "~/components/notifications/notification-inbox";
import { ProductShell } from "~/components/shell/product-shell";

export default function PatientNotificationsPage() {
  return (
    <DashboardWrapper allowedRoles={["PATIENT"]}>
      <ProductShell role="PATIENT">
        <NotificationInbox role="PATIENT" />
      </ProductShell>
    </DashboardWrapper>
  );
}
