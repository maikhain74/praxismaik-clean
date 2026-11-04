export const prerender = false;

import Stripe from "stripe";

export async function POST() {
  try {
    const vercelEnv = process.env.VERCEL_ENV;

    if (vercelEnv !== "production" && vercelEnv !== "preview") {
      console.error("Masterkit-Checkout: Unbekannte Vercel-Umgebung.");
      return new Response(
        JSON.stringify({ error: "Der Kauf ist derzeit nicht verfügbar." }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    const isProduction = vercelEnv === "production";

    const secretKey = isProduction
      ? import.meta.env.STRIPE_SECRET_KEY
      : import.meta.env.STRIPE_SECRET_KEY_TEST;

    const priceId = isProduction
      ? import.meta.env.STRIPE_PRICE_ID_MASTERKIT
      : import.meta.env.STRIPE_PRICE_ID_MASTERKIT_TEST;

    const siteUrl = isProduction
      ? import.meta.env.SITE_URL
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : undefined;

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
