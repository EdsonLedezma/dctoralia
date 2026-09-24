import type { MessageDeliveryStatus } from "@prisma/client";

export function deliveryTransition(
  current: MessageDeliveryStatus,
  status: string,
): MessageDeliveryStatus | null {
  if (current === "CANCELLED" || current === "READ") return null;
  if (status === "READ") return "READ";
  if (status === "DELIVERED")
    return current === "DELIVERED" ? null : "DELIVERED";
  if (current === "DELIVERED") return null;
  if (["FAILED", "FILTERED", "BLOCKED"].includes(status)) return "DEAD_LETTER";
  if (status === "SENT" && current !== "DEAD_LETTER" && current !== "SENT")
    return "SENT";
  return null;
}
