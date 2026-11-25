import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// Replace with your exact Supabase Project URL and Publishable/Anon Key
const SUPABASE_URL = "https://guhsaixfkjrbobzgacff.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_MSNDe4CnVoQCFgLGScg10A_Ko6ESINH";

const isConfigured =
  SUPABASE_URL.startsWith("https://") &&
  !SUPABASE_URL.includes("YOUR-PROJECT-REF") &&
  SUPABASE_ANON_KEY.length > 20;

export const supabase = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const LOCAL_PASSPORTS_KEY = "veripath_passports_v1";
const LOCAL_REQUESTS_KEY = "veripath_requests_v1";

function readLocal(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function writeLocal(key, rows) {
  localStorage.setItem(key, JSON.stringify(rows));
}

export async function checkConnection() {
  if (!supabase) return { connected: false, mode: "Local Fallback" };
  const { error } = await supabase.from("passports").select("id").limit(1);
  if (error) {
    console.warn("Supabase check warning:", error.message);
    return { connected: false, mode: "Local Fallback" };
  }
  return { connected: true, mode: "Live PostgreSQL Connected" };
}

export async function fetchPassports() {
  if (supabase) {
    const { data, error } = await supabase
      .from("passports")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      writeLocal(LOCAL_PASSPORTS_KEY, data);
      return data;
    }
  }
  return readLocal(LOCAL_PASSPORTS_KEY);
}

export async function createPassport(record) {
  if (supabase) {
    const { data, error } = await supabase
      .from("passports")
      .insert([record])
      .select()
      .single();
    if (!error && data) return data;
    if (error) console.error("Insert passport error:", error.message);
  }
  const fallback = { ...record, id: crypto.randomUUID(), created_at: new Date().toISOString() };
  const existing = readLocal(LOCAL_PASSPORTS_KEY);
  writeLocal(LOCAL_PASSPORTS_KEY, [fallback, ...existing]);
  return fallback;
}

export async function updatePassport(id, patch) {
  if (supabase) {
    const { data, error } = await supabase
      .from("passports")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (!error && data) return data;
    if (error) console.error("Update passport error:", error.message);
  }
  const updated = readLocal(LOCAL_PASSPORTS_KEY).map((p) =>
    p.id === id ? { ...p, ...patch } : p
  );
  writeLocal(LOCAL_PASSPORTS_KEY, updated);
  return updated.find((p) => p.id === id);
}

export async function fetchFellowshipRequests() {
  if (supabase) {
    const { data, error } = await supabase
      .from("fellowship_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      writeLocal(LOCAL_REQUESTS_KEY, data);
      return data;
    }
  }
  return readLocal(LOCAL_REQUESTS_KEY);
}

export async function createFellowshipRequest(reqRecord) {
  if (supabase) {
    const { data, error } = await supabase
      .from("fellowship_requests")
      .insert([reqRecord])
      .select()
      .single();
    if (!error && data) return data;
    if (error) console.error("Insert request error:", error.message);
  }
  const fallback = { ...reqRecord, id: crypto.randomUUID(), created_at: new Date().toISOString() };
  const existing = readLocal(LOCAL_REQUESTS_KEY);
  writeLocal(LOCAL_REQUESTS_KEY, [fallback, ...existing]);
  return fallback;
} 