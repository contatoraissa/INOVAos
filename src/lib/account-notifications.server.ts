import { z } from "zod";
import { databaseRequest, type DatabaseConfig } from "./supabase.server.ts";
const uuid = z.string().uuid();
export const noticeReadInput = z
  .object({ ids: z.array(uuid).min(1).max(100) })
  .strict()
  .optional();
type NoticeRow = {
  id: string;
  title: string;
  event: string;
  patient_id: string;
  created_at: string;
  read_at: string | null;
  entry: { kind: string } | null;
};
export async function accountNotices(
  config: DatabaseConfig,
  userId: string,
  fetcher: typeof fetch = fetch,
) {
  uuid.parse(userId);
  const rows = (await databaseRequest(
    config,
    `inova_notifications?user_id=eq.${userId}&select=id,title,event,patient_id,created_at,read_at,entry:inova_consultation_entries(kind)&order=created_at.desc&limit=100`,
    undefined,
    fetcher,
  )) as NoticeRow[];
  return rows.map(({ entry, ...row }) => ({
    ...row,
    event: entry?.kind ? `${entry.kind}_${row.event}` : row.event,
  }));
}
export async function markAccountNotices(
  config: DatabaseConfig,
  userId: string,
  ids?: string[],
  fetcher: typeof fetch = fetch,
) {
  uuid.parse(userId);
  if (ids) {
    noticeReadInput.parse({ ids });
    return databaseRequest(
      config,
      `inova_notifications?user_id=eq.${userId}&id=in.(${ids.join(",")})&read_at=is.null`,
      { read_at: new Date().toISOString() },
      fetcher,
      "PATCH",
    );
  }
  return databaseRequest(config, "rpc/inova_mark_notifications_read", { p_user: userId }, fetcher);
}
