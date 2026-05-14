import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { INITIAL_ENTRIES, type Entry } from "@/lib/warm-nest-model";
import type { WarmNestStore } from "@/lib/warm-nest-store";

const dataFilePath = join(process.cwd(), ".data", "warm-nest-entries.json");

async function ensureDataFileDirectory() {
  await mkdir(dirname(dataFilePath), { recursive: true });
}

export async function loadEntriesFromDisk() {
  try {
    const fileContents = await readFile(dataFilePath, "utf8");
    const parsed = JSON.parse(fileContents) as Entry[];

    return Array.isArray(parsed) ? parsed : INITIAL_ENTRIES;
  } catch {
    return INITIAL_ENTRIES;
  }
}

export async function saveEntriesToDisk(entries: Entry[]) {
  await ensureDataFileDirectory();
  await writeFile(dataFilePath, JSON.stringify(entries, null, 2), "utf8");
}

export function createEntryId() {
  return Date.now();
}

export const diskWarmNestStore: WarmNestStore = {
  async loadEntries() {
    return loadEntriesFromDisk();
  },

  async addEntry(entry) {
    const currentEntries = await loadEntriesFromDisk();
    const nextEntries = [{ id: Date.now(), ...entry }, ...currentEntries];
    await saveEntriesToDisk(nextEntries);
    return nextEntries;
  },

  async deleteEntry(entryId) {
    const currentEntries = await loadEntriesFromDisk();
    const nextEntries = currentEntries.filter((entry) => entry.id !== entryId);

    await saveEntriesToDisk(nextEntries);
    return nextEntries;
  },

  async addComment(entryId, comment) {
    const trimmedComment = comment.trim();
    const currentEntries = await loadEntriesFromDisk();
    const nextEntries = currentEntries.map((entry) =>
      entry.id === entryId ? { ...entry, comments: [...entry.comments, trimmedComment] } : entry,
    );

    await saveEntriesToDisk(nextEntries);
    return nextEntries;
  },

  async deleteComment(entryId, commentIndex) {
    const currentEntries = await loadEntriesFromDisk();
    const nextEntries = currentEntries.map((entry) => {
      if (entry.id !== entryId) {
        return entry;
      }

      return {
        ...entry,
        comments: entry.comments.filter((_, index) => index !== commentIndex),
      };
    });

    await saveEntriesToDisk(nextEntries);
    return nextEntries;
  },
};
