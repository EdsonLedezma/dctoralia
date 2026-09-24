import type { MessageChannel, Prisma } from "@prisma/client";

export type MessagingPayload = Prisma.JsonValue;

export type MessagingSendInput = {
  channel: MessageChannel;
  recipient: string;
  template: string;
  payload: MessagingPayload;
  idempotencyKey: string;
  sandbox?: boolean;
};

export type MessagingSendResult = {
  providerMessageId: string;
};

export class MessagingProviderError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(code: string, message: string, retryable = true) {
    super(message);
    this.name = "MessagingProviderError";
    this.code = code;
    this.retryable = retryable;
  }
}

export interface MessagingProvider {
  readonly name: string;
  send(input: MessagingSendInput): Promise<MessagingSendResult>;
}
