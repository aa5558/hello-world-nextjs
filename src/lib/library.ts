import type { SupabaseClient } from "@supabase/supabase-js";
import { getChallengeDate } from "@/lib/captions";

// The curated photo library admins manage in the admin console. Powers the
// Daily Drop (one featured photo per day) and Surprise Me's "fresh photo"
// rolls. RLS only returns active images whose drop day has arrived, so
// nothing here can leak tomorrow's drop. Before the library migration is
// applied every function quietly returns nothing.

export type LibraryImage = {
  id: string;
  title: string;
  altText: string;
  tags: string[];
  featuredOn: string | null;
  url: string;
};

type ImageRow = {
  id: string;
  storage_path: string;
  title: string;
  alt_text: string;
  tags: string[];
  featured_on: string | null;
};

const COLUMNS = "id, storage_path, title, alt_text, tags, featured_on";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toImage(supabase: SupabaseClient, row: ImageRow): LibraryImage {
  return {
    id: row.id,
    title: row.title,
    altText: row.alt_text,
    tags: row.tags ?? [],
    featuredOn: row.featured_on,
    url: supabase.storage.from("images").getPublicUrl(row.storage_path).data.publicUrl,
  };
}

export async function getLibraryImage(supabase: SupabaseClient, id: unknown) {
  if (typeof id !== "string" || !UUID.test(id)) return null;
  const { data } = await supabase.from("images").select(COLUMNS).eq("id", id).maybeSingle<ImageRow>();
  return data ? toImage(supabase, data) : null;
}

export async function getDailyDrop(supabase: SupabaseClient, day = getChallengeDate()) {
  const { data } = await supabase.from("images").select(COLUMNS).eq("featured_on", day).maybeSingle<ImageRow>();
  return data ? toImage(supabase, data) : null;
}

// A random released image, avoiding ones the viewer has just seen.
export async function pickLibraryImage(supabase: SupabaseClient, seen: string[]) {
  const { data } = await supabase
    .from("images")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<ImageRow[]>();
  const all = data ?? [];
  if (all.length === 0) return null;
  const fresh = all.filter((row) => !seen.includes(row.id));
  const pool = fresh.length ? fresh : all;
  return toImage(supabase, pool[Math.floor(Math.random() * pool.length)]);
}

export async function listLibraryImages(supabase: SupabaseClient, limit = 8) {
  const { data } = await supabase
    .from("images")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<ImageRow[]>();
  return (data ?? []).map((row) => toImage(supabase, row));
}
