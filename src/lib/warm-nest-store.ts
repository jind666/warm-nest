import type { Entry } from "@/lib/warm-nest-model";
import { createSupabaseWarmNestStore } from "@/lib/warm-nest-supabase";
import { diskWarmNestStore } from "@/lib/warm-nest-data";

export interface WarmNestStore {
  loadEntries(): Promise<Entry[]>;
  addEntry(entry: Omit<Entry, "id">): Promise<Entry[]>;
  deleteEntry(entryId: number): Promise<Entry[]>;
  addComment(entryId: number, comment: string): Promise<Entry[]>;
  deleteComment(entryId: number, commentIndex: number): Promise<Entry[]>;
}

export function createWarmNestStore(): WarmNestStore {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return createSupabaseWarmNestStore();
  }

  return diskWarmNestStore;
}
