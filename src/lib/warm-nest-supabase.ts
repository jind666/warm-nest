import { createClient } from "@supabase/supabase-js";
import type { Entry } from "@/lib/warm-nest-model";
import type { WarmNestStore } from "@/lib/warm-nest-store";

type DatabaseEntryRow = {
  id: number;
  date: string;
  title: string;
  note: string;
  media: Entry["media"];
  comments: string[];
  created_at?: string;
  updated_at?: string;
};

const tableName = "warm_nest_entries";

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase is not configured.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function toEntry(row: DatabaseEntryRow): Entry {
  return {
    id: row.id,
    date: row.date,
    title: row.title,
    note: row.note,
    media: row.media ?? [],
    comments: row.comments ?? [],
  };
}

export function createSupabaseWarmNestStore(): WarmNestStore {
  const store: WarmNestStore = {
    async loadEntries() {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from(tableName)
        .select("id, date, title, note, media, comments")
        .order("id", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return (data ?? []).map((row) => toEntry(row as DatabaseEntryRow));
    },

    async addEntry(entry) {
      const supabase = getSupabaseClient();
      const nextEntry = {
        id: Date.now(),
        ...entry,
      } satisfies Entry;

      const { error } = await supabase.from(tableName).insert({
        id: nextEntry.id,
        date: nextEntry.date,
        title: nextEntry.title,
        note: nextEntry.note,
        media: nextEntry.media,
        comments: nextEntry.comments,
      });

      if (error) {
        throw new Error(error.message);
      }

      return store.loadEntries();
    },

    async deleteEntry(entryId) {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from(tableName).delete().eq("id", entryId);

      if (error) {
        throw new Error(error.message);
      }

      return store.loadEntries();
    },

    async addComment(entryId, comment) {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from(tableName)
        .select("comments")
        .eq("id", entryId)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      const nextComments = [...(data?.comments ?? []), comment.trim()];

      const updateResult = await supabase
        .from(tableName)
        .update({ comments: nextComments, updated_at: new Date().toISOString() })
        .eq("id", entryId);

      if (updateResult.error) {
        throw new Error(updateResult.error.message);
      }

      return store.loadEntries();
    },

    async deleteComment(entryId, commentIndex) {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from(tableName)
        .select("comments")
        .eq("id", entryId)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      const nextComments = (data?.comments ?? []).filter((_: string, index: number) => index !== commentIndex);

      const updateResult = await supabase
        .from(tableName)
        .update({ comments: nextComments, updated_at: new Date().toISOString() })
        .eq("id", entryId);

      if (updateResult.error) {
        throw new Error(updateResult.error.message);
      }

      return store.loadEntries();
    },
  };

  return store;
}
