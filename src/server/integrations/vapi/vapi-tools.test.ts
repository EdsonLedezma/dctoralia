import type * as VoiceAppointmentModule from "~/server/domain/voice/voice-appointments";
import { describe, expect, it, vi } from "vitest";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { handleVapiToolCalls, runVapiTool } from "./vapi-tools";
import { normalizeVoicePhone } from "./phone-number";
import { parseVapiToolCalls, vapiPhoneNumberId } from "./vapi-tools";

vi.mock("~/env", () => ({ env: {} }));

describe("Vapi inbound payload", () => {
  it("extracts the phone number ID from either Vapi event shape", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    expect(vapiPhoneNumberId({ call: { phoneNumberId: id } })).toBe(id);
    expect(vapiPhoneNumberId({ phoneNumber: { id } })).toBe(id);
    expect(
      vapiPhoneNumberId({ call: { phoneNumberId: "unknown" } }),
    ).toBeNull();
  });

  it("limits and validates function calls", () => {
    const call = {
      id: "call-1",
      function: { name: "list_services", arguments: {} },
    };
    expect(parseVapiToolCalls({ toolCallList: [call] })).toEqual([call]);
    expect(
      parseVapiToolCalls({ toolCallList: Array(6).fill(call) }),
    ).toBeNull();
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

vi.mock("~/server/domain/voice/voice-appointments", async (importOriginal) => {
  const original = await importOriginal<typeof VoiceAppointmentModule>();
  return {
    ...original,
    voiceAvailability: vi.fn(async () => ({
      slots: ["10:00"],
      timezone: "America/Mexico_City",
    })),
  };
});
const mockDb = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: "postgresql://unused:unused@localhost:1/unused",
  }),
});
const mockLine = {
  id: "line",
  clinicId: "clinic",
  doctorId: "doctor",
  enabled: true,
  mutationsEnabled: false,
  status: "ACTIVE" as const,
  vapiAssistantId: "assistant",
  doctor: { clinicId: "clinic", userId: "doctor-user" },
  clinic: {
    timezone: "America/Mexico_City",
    subscription: { status: "ACTIVE" as const, voiceAgentEnabled: true },
  },
};
describe("Vapi tool responses", () => {
  it("prepares a booking URL understood by the existing booking page", async () => {
    const result = await runVapiTool(
      mockDb,
      mockLine,
      {
        id: "tool",
        function: {
          name: "get_booking_link",
          arguments: {
            serviceId: "service",
            date: "2026-12-01",
            time: "10:00",
          },
        },
      },
      "https://example.test",
      "call",
      "secret",
    );
    expect(result).toHaveProperty(
      "bookingUrl",
      "https://example.test/book-appointment/doctor?serviceId=service&date=2026-12-01&time=10%3A00",
    );
  });
  it("returns a flat tool error for attempts to choose another doctor", async () => {
    const result = await handleVapiToolCalls(
      mockDb,
      mockLine,
      [
        {
          id: "tool",
          function: {
            name: "get_available_slots",
            arguments: {
              serviceId: "service",
              date: "2026-12-01",
              doctorId: "other-doctor",
            },
          },
        },
      ],
      "https://example.test",
      "call",
      "secret",
    );
    expect(result).toEqual({
      results: [{ toolCallId: "tool", error: expect.any(String) }],
    });
  });
});
