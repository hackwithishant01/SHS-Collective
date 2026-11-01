"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminSession, destroyAdminSession } from "@/lib/auth/session";
import { fakeVerify, verifyPassword } from "@/lib/auth/password";
import { query } from "@/lib/db";
import { clientIpFromHeaders, hashedIp } from "@/lib/rate-limit-key";
import { consumeRateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/schemas";

export interface LoginState {
  error: string | null;
  email: string;
}

interface AdminLoginRow {
  id: string;
  password_hash: string;
  is_active: boolean;
}

const INVALID = "Email or password is incorrect.";

export async function loginAction(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const parsed = loginSchema.safeParse({
    email,
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check your details and try again.",
      email,
    };
  }

  const requestHeaders = await headers();
  const ipHash = hashedIp(clientIpFromHeaders(requestHeaders));
  const limit = await consumeRateLimit(`admin-login:${ipHash}`, 10, 15 * 60);
  if (!limit.allowed) {
    return {
      error: `Too many attempts. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minutes.`,
      email,
    };
  }

  const rows = await query<AdminLoginRow>(
    `select id, password_hash, is_active from admin_users where lower(email) = lower($1) limit 1`,
    [parsed.data.email],
  );
  const admin = rows[0];

  if (!admin || !admin.is_active) {
    await fakeVerify();
    return { error: INVALID, email };
  }

  const valid = await verifyPassword(parsed.data.password, admin.password_hash);
  if (!valid) {
    return { error: INVALID, email };
  }

  await createAdminSession(admin.id, requestHeaders.get("user-agent"));
  await query(`update admin_users set last_login_at = now() where id = $1`, [admin.id]);
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await destroyAdminSession();
  redirect("/admin/login");
}
