import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),

    DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    // Removed Google OAuth envs
    POSTGRES_URL_NON_POOLING: z.string(),
    POSTGRES_PRISMA_URL: z.string(),
    APP_URL: z.string().url().optional(),
    STRIPE_SECRET_KEY: z.string().min(1).optional(),
    STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
    STRIPE_PRICE_PRO: z.string().startsWith("price_").optional(),
    STRIPE_PRICE_ENTERPRISE: z.string().startsWith("price_").optional(),
    STRIPE_PRICE_CUSTOM: z.string().startsWith("price_").optional(),
    SENT_API_KEY: z.string().min(1).optional(),
    SENT_PROFILE_ID: z.string().uuid().optional(),
    SENT_WEBHOOK_SECRET: z.string().min(1).optional(),
    SENT_TEST_TEMPLATE: z.string().min(1).optional(),
    SENT_ENABLED: z.enum(["true", "false"]).default("false"),
    SENT_SANDBOX: z.enum(["true", "false"]).default("true"),
    CRON_SECRET: z.string().min(32).optional(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    // Removed Google OAuth envs
    POSTGRES_URL_NON_POOLING: process.env.POSTGRES_URL_NON_POOLING,
    POSTGRES_PRISMA_URL: process.env.POSTGRES_PRISMA_URL,
    APP_URL: process.env.APP_URL,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_PRO: process.env.STRIPE_PRICE_PRO,
    STRIPE_PRICE_ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE,
    STRIPE_PRICE_CUSTOM: process.env.STRIPE_PRICE_CUSTOM,
    SENT_API_KEY: process.env.SENT_API_KEY,
    SENT_PROFILE_ID: process.env.SENT_PROFILE_ID,
    SENT_WEBHOOK_SECRET: process.env.SENT_WEBHOOK_SECRET,
    SENT_TEST_TEMPLATE: process.env.SENT_TEST_TEMPLATE,
    SENT_ENABLED: process.env.SENT_ENABLED,
    SENT_SANDBOX: process.env.SENT_SANDBOX,
    CRON_SECRET: process.env.CRON_SECRET,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
