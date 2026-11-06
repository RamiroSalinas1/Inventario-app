import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { getDb } from "@/server/db";
import { accounts, sessions, users, verifications } from "@/server/db/schema";
import { getAuthEnv } from "@/server/env";

function createAuth() {
  const env = getAuthEnv();
  return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: {
        user: users,
        session: sessions,
        account: accounts,
        verification: verifications,
      },
    }),
    // Login and onboarding belong to the next phase. No account creation in this base.
    emailAndPassword: { enabled: false, disableSignUp: true },
    session: { cookieCache: { enabled: false } },
    plugins: [nextCookies()],
  });
}
let auth: ReturnType<typeof createAuth> | undefined;
export function getAuth() {
  return (auth ??= createAuth());
}
