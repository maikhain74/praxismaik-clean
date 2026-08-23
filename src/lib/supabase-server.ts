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
        get(name: string) {
          return cookies.get(name)?.value;
        },

        set(
          name: string,
          value: string,
          options: Record<string, any>
        ) {
          cookies.set(name, value, options);
        },

        remove(
          name: string,
          options: Record<string, any>
        ) {
          cookies.delete(name, options);
        },
      },
    }
  );
}