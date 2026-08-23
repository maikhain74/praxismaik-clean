import { createServerClient } from "@supabase/ssr";
import type { AstroCookies } from "astro";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("PUBLIC_SUPABASE_URL fehlt");
}

if (!supabaseAnonKey) {
  throw new Error("PUBLIC_SUPABASE_ANON_KEY fehlt");
}

export function createSupabaseServerClient(
  cookies: AstroCookies
) {
  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookies.getAll().map(({ name, value }) => ({
            name,
            value,
          }));
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(
            ({ name, value, options }) => {
              cookies.set(name, value, options);
            }
          );
        },
      },
    }
  );
}