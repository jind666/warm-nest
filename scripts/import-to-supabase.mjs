import { readFile } from "fs/promises";
import { join } from "path";
import process from "process";
import { createClient } from "@supabase/supabase-js";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
  process.exit(1);
}

const tableName = "warm_nest_entries";
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const dataFilePath = join(process.cwd(), ".data", "warm-nest-entries.json");

async function main() {
  const fileContents = await readFile(dataFilePath, "utf8");
  const entries = JSON.parse(fileContents);

  if (!Array.isArray(entries)) {
    throw new Error("Local data file does not contain an array of entries.");
  }

  const rows = entries.map((entry) => ({
    id: entry.id,
    date: entry.date,
    title: entry.title,
    note: entry.note,
    media: entry.media ?? [],
    comments: entry.comments ?? [],
  }));

  const { error } = await supabase.from(tableName).upsert(rows, {
    onConflict: "id",
  });

  if (error) {
    throw new Error(error.message);
  }

  console.log(`Imported ${rows.length} entries into ${tableName}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
