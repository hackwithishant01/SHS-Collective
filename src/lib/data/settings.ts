import { cache } from "react";
import { query } from "@/lib/db";
import { mediaUrl } from "@/lib/media";
import {
  settingsFromRow,
  toPublicSettings,
  type SettingsRow,
} from "@/lib/settings";
import type { AdminSettings, PublicSettings } from "@/lib/types";

export async function getAdminSettings(): Promise<AdminSettings> {
  const rows = await query<SettingsRow>(`select * from business_settings where id = 1 limit 1`);
  const row = rows[0];
  if (!row) throw new Error("Business settings are missing. Run the database migrations.");
  return settingsFromRow(row, mediaUrl(row.hero_image_key));
}

/** Per-request memoisation only; settings are always read fresh from the database. */
export const getPublicSettings = cache(async (): Promise<PublicSettings> => {
  return toPublicSettings(await getAdminSettings());
});
