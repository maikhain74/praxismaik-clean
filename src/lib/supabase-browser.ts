import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("PUBLIC_SUPABASE_URL fehlt");
}

if (!supabaseAnonKey) {
  throw new Error("PUBLIC_SUPABASE_ANON_KEY fehlt");
}

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  );
}