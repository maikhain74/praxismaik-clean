export const prerender = false;

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST({ request }: { request: Request }) {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({
          error: "Bitte melde dich zuerst bei PraxisMaik an.",
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const accessToken = authorization.slice(7);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user || !user.email) {
      return new Response(
        JSON.stringify({
          error:
            "Deine Anmeldung konnte nicht bestätigt werden. Bitte melde dich erneut an.",
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, premium_azubi")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error(
        "Profil für Checkout nicht gefunden:",
        profileError
      );

      return new Response(
        JSON.stringify({
          error:
            "Dein PraxisMaik-Konto konnte nicht gefunden werden.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (profile.premium_azubi === true) {
      return new Response(
        JSON.stringify({
          error: "Dein Azubi-Premiumzugang ist bereits aktiv.",
        }),
        {
          status: 409,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",

      customer_email: user.email,

      line_items: [
        {
          price: import.meta.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],

      metadata: {
        premium_type: "azubi",
        user_id: user.id,
        account_email: user.email,
      },

      success_url:
        `${import.meta.env.SITE_URL}/erfolg?session_id={CHECKOUT_SESSION_ID}`,

      cancel_url:
        `${import.meta.env.SITE_URL}/premium-interesse`,
    });

    if (!session.url) {
      throw new Error("Stripe Checkout URL fehlt.");
    }

    return new Response(
      JSON.stringify({
        url: session.url,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Checkout konnte nicht erstellt werden:", error);

    return new Response(
      JSON.stringify({
        error:
          "Der Bezahlvorgang konnte nicht gestartet werden. Bitte versuche es erneut.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}