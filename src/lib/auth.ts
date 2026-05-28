import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import { user, session, account, verification } from "@/db/schema";

type AuthEnv = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  DB: any;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  BETTER_AUTH_SECRET?: string;
  AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
};

function getEnvValue(env: AuthEnv, key: keyof AuthEnv): string | undefined {
  const value = env[key] ?? process.env[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function createAuth(env: AuthEnv) {
  const baseURL =
    getEnvValue(env, "BETTER_AUTH_URL") ??
    "https://email-manager-d0r.pages.dev";

  return betterAuth({
    database: drizzleAdapter(drizzle(env.DB), {
      provider: "sqlite",
      schema: { user, session, account, verification },
    }),
    baseURL,
    secret:
      getEnvValue(env, "BETTER_AUTH_SECRET") ??
      getEnvValue(env, "AUTH_SECRET"),
    socialProviders: {
      google: {
        clientId: getEnvValue(env, "GOOGLE_CLIENT_ID") ?? "",
        clientSecret: getEnvValue(env, "GOOGLE_CLIENT_SECRET") ?? "",
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
    trustedOrigins: [baseURL],
    rateLimit: {
      enabled: false,
    },
  });
}
