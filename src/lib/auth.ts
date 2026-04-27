import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import { user, session, account, verification } from "@/db/schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createAuth(db: any) {
  return betterAuth({
    database: drizzleAdapter(drizzle(db), {
      provider: "sqlite",
      schema: { user, session, account, verification },
    }),
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
}
