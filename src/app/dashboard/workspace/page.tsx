import { env } from "~/env";

import DashboardWrapper from "~/components/auth/DashboardWrapper";
import { ProductShell } from "~/components/shell/product-shell";
import { WorkspaceView } from "./_components/workspace-view";

export default function WorkspacePage() {
  return (
    <DashboardWrapper allowedRoles={["DOCTOR"]}>
      <ProductShell role="DOCTOR">
        <WorkspaceView externalIntegrationsEnabled={env.DEMO_MODE !== "true"} />
      </ProductShell>
    </DashboardWrapper>
  );
}
