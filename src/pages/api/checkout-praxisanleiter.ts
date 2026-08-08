export const prerender = false;

import Stripe from "stripe";

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY);

export async function GET() {
  const session = await stripe.checkout.sessions.create({
    mode: "payment",

    line_items: [
      {
        price: import.meta.env.STRIPE_PRICE_ID_PRAXISANLEITER,
        quantity: 1,
      },
    ],

    metadata: {
      premium_type: "praxisanleiter",
    },

    success_url: `${import.meta.env.SITE_URL}/erfolg?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${import.meta.env.SITE_URL}/premium`,
  });

  return Response.redirect(session.url!, 303);
}