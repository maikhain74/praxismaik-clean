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
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Stripe-Signatur fehlt.", {
      status: 400,
    });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      import.meta.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Unbekannter Webhook-Fehler";

    return new Response(
      `Webhook Error: ${message}`,
      {
        status: 400,
      }
    );
  }

  if (event.type !== "checkout.session.completed") {
    return new Response("OK", {
      status: 200,
    });
  }

  const session =
    event.data.object as Stripe.Checkout.Session;

  const premiumType =
    session.metadata?.premium_type;

  const userId =
    session.metadata?.user_id;

  const customerEmail =
    session.customer_details?.email ??
    session.customer_email;

  if (premiumType === "azubi") {
    if (!userId) {
      console.error(
        "Azubi-Checkout ohne user_id:",
        session.id
      );

      return new Response(
        "Keine Benutzer-ID für Azubi-Kauf gefunden.",
        {
          status: 400,
        }
      );
    }

    const updateData = {
      premium_azubi: true,
      stripe_customer_id:
        String(session.customer ?? ""),
      stripe_checkout_session_id:
        session.id,
    };

    const { data, error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", userId)
      .select("id");

    if (error) {
      console.error(
        "Supabase Azubi Update Error:",
        error
      );

      return new Response(
        "Supabase Update fehlgeschlagen.",
        {
          status: 500,
        }
      );
    }

    if (!data || data.length !== 1) {
      console.error(
        "Azubi-Profil nicht eindeutig gefunden:",
        {
          userId,
          sessionId: session.id,
          updatedRows: data?.length ?? 0,
        }
      );

      return new Response(
        "PraxisMaik-Profil konnte nicht eindeutig aktualisiert werden.",
        {
          status: 500,
        }
      );
    }

    return new Response("OK", {
      status: 200,
    });
  }

  if (premiumType === "praxisanleiter") {
    if (!customerEmail) {
      return new Response(
        "Keine Kunden-E-Mail gefunden.",
        {
          status: 400,
        }
      );
    }

    const updateData = {
      premium_praxisanleiter: true,
      stripe_customer_id:
        String(session.customer ?? ""),
      stripe_checkout_session_id:
        session.id,
    };

    const { data, error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("email", customerEmail)
      .select("id");

    if (error) {
      console.error(
        "Supabase Praxisanleiter Update Error:",
        error
      );

      return new Response(
        "Supabase Update fehlgeschlagen.",
        {
          status: 500,
        }
      );
    }

    if (!data || data.length !== 1) {
      console.error(
        "Praxisanleiter-Profil nicht eindeutig gefunden:",
        {
          customerEmail,
          sessionId: session.id,
          updatedRows: data?.length ?? 0,
        }
      );

      return new Response(
        "PraxisMaik-Profil konnte nicht eindeutig aktualisiert werden.",
        {
          status: 500,
        }
      );
    }

    return new Response("OK", {
      status: 200,
    });
  }

  return new Response(
    "Unbekannter Premium-Typ.",
    {
      status: 400,
    }
  );
}