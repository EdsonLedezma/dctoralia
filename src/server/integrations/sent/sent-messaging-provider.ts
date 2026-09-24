import { createHash } from "node:crypto";
import SentDm from "@sentdm/sentdm";
import {
  MessagingProviderError,
  type MessagingProvider,
  type MessagingSendInput,
} from "~/server/domain/messaging/messaging-provider";

export class SentMessagingProvider implements MessagingProvider {
  readonly name = "sent";
  constructor(
    private readonly client: SentDm,
    private readonly config: { profileId?: string; sandbox: boolean },
  ) {}

  async send(input: MessagingSendInput) {
    if (!/^\+[1-9]\d{7,14}$/.test(input.recipient))
      throw new MessagingProviderError(
        "INVALID_RECIPIENT",
        "El teléfono debe usar formato E.164.",
        false,
      );
    if (!input.template.trim())
      throw new MessagingProviderError(
        "INVALID_TEMPLATE",
        "Falta la plantilla aprobada.",
        false,
      );
    const payload = input.payload;
    if (!payload || typeof payload !== "object" || Array.isArray(payload))
      throw new MessagingProviderError(
        "INVALID_PARAMETERS",
        "Parámetros de plantilla inválidos.",
        false,
      );
    const parameters: Record<string, string> = {};
    for (const [key, value] of Object.entries(payload)) {
      if (typeof value !== "string")
        throw new MessagingProviderError(
          "INVALID_PARAMETERS",
          "Los parámetros deben ser texto.",
          false,
        );
      parameters[key] = value;
    }
    try {
      const response = await this.client.messages.send({
        to: [input.recipient],
        channel: [input.channel.toLowerCase()],
        template: { name: input.template, parameters },
        sandbox: this.config.sandbox || input.sandbox !== false,
        "x-profile-id": this.config.profileId,
        "Idempotency-Key": createHash("sha256")
          .update(input.idempotencyKey)
          .digest("hex"),
      });
      const id = response.data?.recipients?.[0]?.message_id;
      if (!response.success || !id)
        throw new MessagingProviderError(
          "SENT_REJECTED",
          "Sent no aceptó el mensaje.",
          false,
        );
      return { providerMessageId: id };
    } catch (error) {
      if (error instanceof MessagingProviderError) throw error;
      if (error instanceof SentDm.APIError)
        throw new MessagingProviderError(
          "SENT_API_ERROR",
          "Error de Sent.",
          error.status === undefined ||
            error.status === 408 ||
            error.status === 429 ||
            error.status >= 500,
        );
      throw new MessagingProviderError(
        "SENT_UNAVAILABLE",
        "Sent no está disponible.",
      );
    }
  }
}
