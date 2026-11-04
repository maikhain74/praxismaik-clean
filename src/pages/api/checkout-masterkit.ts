export const prerender = false;

import Stripe from "stripe";

export async function POST() {
  try {
    const secretKey = import.meta.env.STRIPE_SECRET_KEY;
    const priceId = import.meta.env.STRIPE_PRICE_ID_MASTERKIT;
    const siteUrl = import.meta.env.SITE_URL;

    if (!secretKey || !priceId || !siteUrl) {
      console.error("Masterkit-Checkout: Konfiguration unvollständig.");
      return new Response(
        JSON.stringify({ error: "Der Kauf ist derzeit nicht verfügbar." }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const stripe = new Stripe(secretKey, {
      apiVersion: "2024-06-20",
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        product_key: "medikamentenlehre-masterkit",
      },
      success_url:
        `${siteUrl}/shop/medikamentenlehre-masterkit/erfolg?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:
        `${siteUrl}/shop/medikamentenlehre-masterkit/`,
    });

    if (!session.url) {
      throw new Error("Stripe Checkout URL fehlt.");
    }

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Masterkit-Checkout fehlgeschlagen:", error);

    return new Response(
      JSON.stringify({
        error: "Der Bezahlvorgang konnte nicht gestartet werden.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
