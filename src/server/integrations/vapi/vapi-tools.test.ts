import { describe, expect, it } from "vitest";

import { normalizeVoicePhone } from "./phone-number";
import { parseVapiToolCalls, vapiPhoneNumberId } from "./vapi-tools";

describe("Vapi inbound payload", () => {
  it("extracts the phone number ID from either Vapi event shape", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    expect(vapiPhoneNumberId({ call: { phoneNumberId: id } })).toBe(id);
    expect(vapiPhoneNumberId({ phoneNumber: { id } })).toBe(id);
    expect(vapiPhoneNumberId({ call: { phoneNumberId: "unknown" } })).toBeNull();
  });

  it("limits and validates function calls", () => {
    const call = { id: "call-1", function: { name: "list_services", arguments: {} } };
    expect(parseVapiToolCalls({ toolCallList: [call] })).toEqual([call]);
    expect(parseVapiToolCalls({ toolCallList: Array(6).fill(call) })).toBeNull();
    expect(parseVapiToolCalls({ toolCallList: [{ id: "call-1" }] })).toBeNull();
  });
});

describe("Mexican doctor number", () => {
  it("normalizes a national number and rejects non-numbers", () => {
    expect(normalizeVoicePhone("55 1234 5678")).toBe("+525512345678");
    expect(normalizeVoicePhone("+52 55 1234 5678")).toBe("+525512345678");
    expect(normalizeVoicePhone("sin teléfono")).toBeNull();
  });
});
