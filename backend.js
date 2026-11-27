import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// Replace with your live Supabase project URL and publishable / anon key
const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "YOUR-SUPABASE-PUBLISHABLE-OR-ANON-KEY";

const hasValidConfig =
  SUPABASE_URL.startsWith("https://") &&
  !SUPABASE_URL.includes("YOUR-PROJECT-REF") &&
  SUPABASE_PUBLISHABLE_KEY.length > 20 &&
  !SUPABASE_PUBLISHABLE_KEY.includes("YOUR-SUPABASE");

export const supabase = hasValidConfig
  ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
  : null;

export async function pingServer() {
  if (!supabase) {
    return {
      online: false,
      label: "Configure Supabase Keys in backend.js",
      detail: "Add your Supabase Project URL and publishable key in backend.js so judges read/write live PostgreSQL records.",
    };
  }

  const { error } = await supabase.from("passports").select("id").limit(1);
  if (error) {
    return {
      online: false,
      label: "Server Sync Issue",
      detail: `Database check returned: ${error.message}. Run supabase/schema.sql in Supabase SQL Editor.`,
    };
  }

  return {
    online: true,
    label: "Connected to Supabase Server",
    detail: "",
  };
}

export async function listPassports() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("passports")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function insertPassport(payload) {
  if (!supabase) {
    throw new Error("Supabase is not configured yet in backend.js.");
  }
  const { data, error } = await supabase
    .from("passports")
    .insert([payload])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function patchPassport(id, updates) {
  if (!supabase) {
    throw new Error("Supabase is not configured yet in backend.js.");
  }
  const { data, error } = await supabase
    .from("passports")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function listFellowshipRequests() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("fellowship_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function insertFellowshipRequest(payload) {
  if (!supabase) {
    throw new Error("Supabase is not configured yet in backend.js.");
  }
  const { data, error } = await supabase
    .from("fellowship_requests")
    .insert([payload])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}  