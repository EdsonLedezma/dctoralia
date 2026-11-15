import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  env: {
    DEMO_MODE: "false",
    VAPI_WEBHOOK_TOKEN: "test-token-not-a-real-secret",
    APP_URL: "https://example.test",
  },
  findLine: vi.fn(),
}));
vi.mock("~/env", () => ({ env: mocks.env }));
vi.mock("~/server/db", () => ({
  db: { voiceAgentLine: { findUnique: mocks.findLine } },
}));
import { POST } from "./route";
const phoneId = "550e8400-e29b-41d4-a716-446655440000";
const assistantId = "550e8400-e29b-41d4-a716-446655440001";
const callId = "550e8400-e29b-41d4-a716-446655440002";
function request(message: object, token = mocks.env.VAPI_WEBHOOK_TOKEN) {
  return new Request("https://example.test/api/integrations/vapi/webhook", {
    method: "POST",
    headers: { authorization: "Bearer " + token },
    body: JSON.stringify({ message }),
  });
}
const call = { id: callId, type: "inboundPhoneCall", phoneNumberId: phoneId };
const line = {
  id: "line",
  doctorId: "doctor",
  clinicId: "clinic",
  enabled: true,
  mutationsEnabled: false,
  status: "ACTIVE",
  vapiAssistantId: assistantId,
  doctor: { clinicId: "clinic", userId: "doctor-user" },
  clinic: {
    timezone: "America/Mexico_City",
    subscription: { status: "ACTIVE", voiceAgentEnabled: true },
  },
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.env.DEMO_MODE = "false";
});
describe("Vapi webhook transport", () => {
  it("rejects unauthorized requests without reading any database", async () => {
    const response = await POST(
      request({ type: "assistant-request", call }, "wrong-token"),
    );
    expect(response.status).toBe(401);
    expect(mocks.findLine).not.toHaveBeenCalled();
  });
  it("blocks calls in demo mode", async () => {
    mocks.env.DEMO_MODE = "true";
    expect(
      (await POST(request({ type: "assistant-request", call }))).status,
    ).toBe(503);
    expect(mocks.findLine).not.toHaveBeenCalled();
  });
  it("routes the called number to the provisioned assistant", async () => {
    mocks.findLine.mockResolvedValue(line);
    const response = await POST(request({ type: "assistant-request", call }));
    expect(await response.json()).toEqual({ assistantId });
    expect(mocks.findLine).toHaveBeenCalledWith(
      expect.objectContaining({ where: { vapiPhoneNumberId: phoneId } }),
    );
  });
  it("returns a Vapi tool error when the doctor disabled the assistant", async () => {
    mocks.findLine.mockResolvedValue({ ...line, enabled: false });
    const response = await POST(
      request({
        type: "tool-calls",
        call,
        toolCallList: [
          { id: "tool-1", function: { name: "list_services", arguments: {} } },
        ],
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      results: [{ toolCallId: "tool-1", error: expect.any(String) }],
    });
  });
  it("rejects duplicate tool IDs and missing call context", async () => {
    const tool = {
      id: "tool-1",
      function: { name: "list_services", arguments: {} },
    };
    expect(
      (
        await POST(
          request({ type: "tool-calls", call, toolCallList: [tool, tool] }),
        )
      ).status,
    ).toBe(400);
    const response = await POST(
      request({ type: "assistant-request", phoneNumber: { id: phoneId } }),
    );
    expect(await response.json()).toHaveProperty("error");
    expect(mocks.findLine).not.toHaveBeenCalled();
  });
});
