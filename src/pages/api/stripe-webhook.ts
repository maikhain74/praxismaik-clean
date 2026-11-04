export const prerender = false;

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { sendMasterkitDownload } from "../../lib/masterkit-versand";

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY
);

async function processMasterkitPurchase(
  session: Stripe.Checkout.Session
): Promise<Response | null> {
  const masterkitPriceId =
    import.meta.env.STRIPE_PRICE_ID_MASTERKIT;

  if (!masterkitPriceId) {
    console.error("STRIPE_PRICE_ID_MASTERKIT fehlt.");

    return new Response("Masterkit-Konfiguration fehlt.", {
      status: 500,
    });
  }

  const lineItems = await stripe.checkout.sessions.listLineItems(
    session.id,
    { limit: 100 }
  );

  const isMasterkitPurchase = lineItems.data.some(
    (item) => item.price?.id === masterkitPriceId
  );

  if (!isMasterkitPurchase) {
    return null;
  }

  if (
    session.mode !== "payment" ||
    session.payment_status !== "paid" ||
    session.livemode !== true
  ) {
    return new Response("OK", { status: 200 });
  }

  if (lineItems.has_more) {
    console.error("Masterkit-Checkout enthält zu viele Positionen:", session.id);

    return new Response("Positionen konnten nicht vollständig geprüft werden.", {
      status: 500,
    });
  }

  if (
    lineItems.data.length !== 1 ||
    lineItems.data[0].quantity !== 1
  ) {
    console.error("Unerwartete Masterkit-Bestellung:", session.id);

    return new Response("Unerwartete Bestellpositionen.", {
      status: 500,
    });
  }

  const customerEmail =
    session.customer_details?.email ??
    session.customer_email;

  if (!customerEmail) {
    console.error("Masterkit-Kauf ohne E-Mail-Adresse:", session.id);

    return new Response("Kunden-E-Mail fehlt.", {
      status: 500,
    });
  }

  if (session.amount_total === null || !session.currency) {
    return new Response("Zahlungsdaten unvollständig.", {
      status: 500,
    });
  }

  const { error } = await supabase
    .from("masterkit_orders")
    .upsert(
      {
        stripe_session_id: session.id,
        stripe_payment_intent_id:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id ?? null,
        stripe_price_id: masterkitPriceId,
        customer_email: customerEmail,
        product_key: "medikamentenlehre-masterkit",
        amount_total: session.amount_total,
        currency: session.currency,
        payment_status: "paid",
      },
      {
        onConflict: "stripe_session_id",
        ignoreDuplicates: true,
      }
    );

  if (error) {
    console.error("Masterkit Supabase Fehler:", error);

    return new Response("Masterkit-Bestellung konnte nicht gespeichert werden.", {
      status: 500,
    });
  }

  console.log("Masterkit-Kauf verarbeitet:", {
    sessionId: session.id,
  });

  try {
    await sendMasterkitDownload(session.id);
  } catch (error) {
    console.error("Masterkit-Versand fehlgeschlagen:", {
      sessionId: session.id,
      error,
    });

    return new Response(
      "Masterkit-Versand fehlgeschlagen.",
      { status: 500 }
    );
  }

  return new Response("OK", { status: 200 });
}

function verifyStripeEvent(
  body: string,
  signature: string
): Stripe.Event {
  const liveSecret =
    import.meta.env.STRIPE_WEBHOOK_SECRET;

  const testSecret =
    import.meta.env.STRIPE_WEBHOOK_SECRET_TEST;

  if (liveSecret) {
    try {
      return stripe.webhooks.constructEvent(
        body,
        signature,
        liveSecret
      );
    } catch {
      // Kein gültiges Live-Ereignis.
      // Anschließend wird das Sandbox-Geheimnis geprüft.
    }
  }

  if (testSecret) {
    try {
      return stripe.webhooks.constructEvent(
        body,
        signature,
        testSecret
      );
    } catch {
      // Auch die Sandbox-Signatur ist ungültig.
    }
  }

  throw new Error(
    "Stripe-Signatur konnte nicht verifiziert werden."
  );
}

export async function POST({
  request,
}: {
  request: Request;
}) {
  const body = await request.text();

  const signature =
    request.headers.get("stripe-signature");

  if (!signature) {
    return new Response(
      "Stripe-Signatur fehlt.",
      {
        status: 400,
      }
    );
  }

  let event: Stripe.Event;

  try {
    event = verifyStripeEvent(
      body,
      signature
    );
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Unbekannter Webhook-Fehler";

    console.error(
      "Stripe Webhook Signaturfehler:",
      message
    );

    return new Response(
      `Webhook Error: ${message}`,
      {
        status: 400,
      }
    );
  }

  /*
   * Sandbox-Ereignisse niemals für produktive
   * Premium-Freischaltungen verwenden.
   *
   * Stripe erhält trotzdem HTTP 200 und versucht
   * das Ereignis deshalb nicht erneut zuzustellen.
   */
  if (!event.livemode) {
    console.log(
      "Stripe Sandbox-Ereignis ignoriert:",
      {
        eventId: event.id,
        eventType: event.type,
      }
    );

    return new Response("OK", {
      status: 200,
    });
  }

  /*
   * Für PraxisMaik interessiert uns hier nur
   * ein erfolgreich abgeschlossener Checkout.
   */
  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.async_payment_succeeded"
  ) {
    return new Response("OK", {
      status: 200,
    });
  }

  const session =
    event.data.object as Stripe.Checkout.Session;

  if (session.payment_status !== "paid") {
    console.log("Premium-Freischaltung wartet auf Zahlung:", {
      sessionId: session.id,
      paymentStatus: session.payment_status,
    });

    return new Response("OK", {
      status: 200,
    });
  }

  /*
   * Masterkit-Käufe getrennt von Premium verarbeiten.
   */
  const masterkitResponse =
    await processMasterkitPurchase(session);

  if (masterkitResponse) {
    return masterkitResponse;
  }

  const premiumType =
    session.metadata?.premium_type;

  const userId =
    session.metadata?.user_id;

  /*
   * Checkout ohne Premium-Kennzeichnung.
   *
   * Das kann zum Beispiel die 1:1-Lernhilfe
   * oder ein anderes Produkt sein.
   *
   * Das Ereignis ist gültig, deshalb HTTP 200.
   */
  if (!premiumType) {
    console.log(
      "Nicht-Premium-Checkout ignoriert:",
      {
        sessionId: session.id,
      }
    );

    return new Response("OK", {
      status: 200,
    });
  }

  /*
   * Jeder Premium-Kauf muss eindeutig einem
   * angemeldeten PraxisMaik-Konto zugeordnet sein.
   */
  if (!userId) {
    console.error(
      "Premium-Checkout ohne user_id:",
      {
        premiumType,
        sessionId: session.id,
      }
    );

    return new Response(
      "Keine Benutzer-ID für Premium-Kauf gefunden.",
      {
        status: 400,
      }
    );
  }

  if (premiumType === "azubi") {
    const updateData = {
      premium_azubi: true,

      stripe_customer_id:
        String(session.customer ?? ""),

      stripe_checkout_session_id:
        session.id,
    };

    const {
      data,
      error,
    } = await supabase
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
          updatedRows:
            data?.length ?? 0,
        }
      );

      return new Response(
        "PraxisMaik-Profil konnte nicht eindeutig aktualisiert werden.",
        {
          status: 500,
        }
      );
    }

    console.log(
      "Azubi-Premium erfolgreich freigeschaltet:",
      {
        userId,
        sessionId: session.id,
      }
    );

    return new Response("OK", {
      status: 200,
    });
  }

  if (
    premiumType ===
    "praxisanleiter"
  ) {
    const updateData = {
      premium_praxisanleiter: true,

      stripe_customer_id:
        String(session.customer ?? ""),

      stripe_checkout_session_id:
        session.id,
    };

    const {
      data,
      error,
    } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", userId)
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
          userId,
          sessionId: session.id,
          updatedRows:
            data?.length ?? 0,
        }
      );

      return new Response(
        "PraxisMaik-Profil konnte nicht eindeutig aktualisiert werden.",
        {
          status: 500,
        }
      );
    }

    console.log(
      "Praxisanleiter-Premium erfolgreich freigeschaltet:",
      {
        userId,
        sessionId: session.id,
      }
    );

    return new Response("OK", {
      status: 200,
    });
  }

  /*
   * Es gibt zwar premium_type, aber keinen
   * von PraxisMaik unterstützten Wert.
   */
  console.error(
    "Unbekannter Premium-Typ ignoriert:",
    {
      premiumType,
      sessionId: session.id,
    }
  );

  return new Response("OK", {
    status: 200,
  });
}