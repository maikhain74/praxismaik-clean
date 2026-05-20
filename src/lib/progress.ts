import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

let supabase: any = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export async function saveProgress(contentSlug: string) {
  if (!supabase) {
    console.error('Supabase nicht initialisiert');
    return;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase.from('learning_progress').insert({
    user_id: user.id,
    content_slug: contentSlug,
    completed: true,
  });
}