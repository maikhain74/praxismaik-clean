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

export async function POST({ request }) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Stripe-Signatur fehlt.", { status: 400 });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      import.meta.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unbekannter Webhook-Fehler";

    return new Response(`Webhook Error: ${message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const customerEmail = session.customer_details?.email;
    const premiumType = session.metadata?.premium_type;

    if (!customerEmail) {
      return new Response("Keine Kunden-E-Mail gefunden.", { status: 400 });
    }

    const updateData: {
      premium?: boolean;
      premium_azubi?: boolean;
      premium_praxisanleiter?: boolean;
      stripe_customer_id: string;
      stripe_checkout_session_id: string;
    } = {
      stripe_customer_id: String(session.customer ?? ""),
      stripe_checkout_session_id: session.id,
    };

    if (premiumType === "azubi") {
      updateData.premium = true;
      updateData.premium_azubi = true;
    } else if (premiumType === "praxisanleiter") {
      updateData.premium_praxisanleiter = true;
    } else {
      return new Response("Unbekannter Premium-Typ.", { status: 400 });
    }

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("email", customerEmail);

    if (error) {
      console.error("Supabase Update Error:", error);

      return new Response("Supabase Update fehlgeschlagen.", {
        status: 500,
      });
    }
  }

  return new Response("OK", { status: 200 });
}