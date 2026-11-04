export const prerender = false;

import Stripe from "stripe";

export async function POST({ request }: { request: Request }) {
  if (process.env.VERCEL_ENV !== "preview") {
    return new Response("Not Found", { status: 404 });
  }

  const secretKey = import.meta.env.STRIPE_SECRET_KEY_TEST;
  const webhookSecret = import.meta.env.STRIPE_WEBHOOK_SECRET_MASTERKIT_TEST;

  if (!secretKey || !webhookSecret) {
    console.error("Masterkit Sandbox: Konfiguration fehlt.");
    return new Response("Konfiguration fehlt.", { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Signatur fehlt.", { status: 400 });
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: "2024-06-20",
  });

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      await request.text(),
      signature,
      webhookSecret
    );
  } catch {
    return new Response("Ungültige Signatur.", { status: 400 });
  }

  if (event.livemode !== false) {
    return new Response("Live-Ereignis abgelehnt.", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    if (
      session.mode === "payment" &&
      session.payment_status === "paid" &&
      session.metadata?.product_key === "medikamentenlehre-masterkit"
    ) {
      console.log("Masterkit Sandbox-Zahlung bestätigt:", {
        sessionId: session.id,
      });
    }
  }

  return new Response("OK", { status: 200 });
}
