import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";

function createDb() {
  const client = createClient({
    url: process.env.DATABASE_URL ?? "libsql://email-manager-sarthak927.aws-ap-south-1.turso.io",
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return drizzle(client);
}

const globalForDb = globalThis as unknown as { authDb: ReturnType<typeof createDb> | undefined };
const authDb = globalForDb.authDb ?? createDb();
if (process.env.NODE_ENV !== "production") globalForDb.authDb = authDb;

export const auth = betterAuth({
  database: drizzleAdapter(authDb, { provider: "sqlite" }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      scope: [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/gmail.readonly",
      ],
      accessType: "offline",
      prompt: "consent",
    },
  },
  trustedOrigins: [
    process.env.BETTER_AUTH_URL || "https://email-manager-d0r.pages.dev",
  ],
});
