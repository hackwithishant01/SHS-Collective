import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import type { AdminRole } from "@/lib/types";
import { newSessionToken, sha256 } from "./tokens";

export const SESSION_COOKIE = "shs_admin_session";
const SESSION_DAYS = 7;

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
}

interface AdminRow {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  expires_at: string | Date;
  last_used_at: string | Date;
}

function secureCookies(): boolean {
  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.RENDER_EXTERNAL_URL?.trim();
  if (site?.startsWith("https://")) return true;
  return process.env.VERCEL_ENV === "production";
}

export async function createAdminSession(adminId: string, userAgent?: string | null): Promise<void> {
  const token = newSessionToken();
  const tokenHash = sha256(token);
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await query(
    `insert into admin_sessions (admin_id, token_hash, user_agent, expires_at)
     values ($1, $2, $3, $4)`,
    [adminId, tokenHash, userAgent?.slice(0, 300) ?? null, expires],
  );

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookies(),
    path: "/",
    expires,
  });
}

export const getAdminSession = cache(async (): Promise<AdminUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token || token.length < 20 || token.length > 200) return null;

  const rows = await query<AdminRow>(
    `select u.id, u.email, u.name, u.role, s.expires_at, s.last_used_at
     from admin_sessions s
     join admin_users u on u.id = s.admin_id
     where s.token_hash = $1
       and s.expires_at > now()
       and u.is_active = true
     limit 1`,
    [sha256(token)],
  );

  const row = rows[0];
  if (!row) return null;

  // Touch at most once an hour to avoid a write on every request.
  const lastUsed = new Date(row.last_used_at).getTime();
  if (Number.isFinite(lastUsed) && Date.now() - lastUsed > 60 * 60 * 1000) {
    await query(`update admin_sessions set last_used_at = now() where token_hash = $1`, [
      sha256(token),
    ]);
  }

  return { id: row.id, email: row.email, name: row.name, role: row.role };
});

export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");
  return admin;
}

export async function requireOwner(): Promise<AdminUser> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") redirect("/admin?error=owner-required");
  return admin;
}

export async function destroyAdminSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await query(`delete from admin_sessions where token_hash = $1`, [sha256(token)]);
  }
  store.delete(SESSION_COOKIE);
}

export async function deleteOtherSessions(adminId: string, keepToken?: string | null): Promise<void> {
  if (keepToken) {
    await query(`delete from admin_sessions where admin_id = $1 and token_hash <> $2`, [
      adminId,
      sha256(keepToken),
    ]);
    return;
  }
  await query(`delete from admin_sessions where admin_id = $1`, [adminId]);
}

export async function purgeExpiredSessions(): Promise<void> {
  await query(`delete from admin_sessions where expires_at <= now()`);
}
