import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY
);

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    const userId = body.userId;
    const slug = body.slug;
    const title = body.title ?? '';

    if (!userId || !slug) {
      return new Response(
        JSON.stringify({
          error: 'User ID oder Slug fehlt',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const { error } = await supabase
      .from('learning_progress')
      .upsert(
        {
          user_id: userId,
          slug,
          title,
          completed: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,slug',
        }
      );

    if (error) {
      return new Response(
        JSON.stringify({
          error: error.message,
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch {
    return new Response(
      JSON.stringify({
        error: 'Serverfehler',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};