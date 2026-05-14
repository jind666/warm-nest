export type MediaItem = {
  type: "video" | "image";
  label: string;
  key?: string | null;
  url?: string | null;
};

export type Entry = {
  id: number;
  date: string;
  title: string;
  note: string;
  media: MediaItem[];
  comments: string[];
};

export const INITIAL_ENTRIES: Entry[] = [];

export function createEntryId() {
  return Date.now();
}
