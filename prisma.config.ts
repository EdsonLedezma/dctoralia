import "dotenv/config";
import { defineConfig, env } from "prisma/config";

const directUrl = new URL(env("POSTGRES_URL_NON_POOLING"));
if (!directUrl.searchParams.has("connect_timeout")) {
  directUrl.searchParams.set("connect_timeout", "20");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: directUrl.toString() },
});
