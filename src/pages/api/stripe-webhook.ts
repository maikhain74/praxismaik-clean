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
    event.type !==
    "checkout.session.completed"
  ) {
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

    const {
      data,
      error,
    } = await supabase
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
        customerEmail,
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
   *
   * Keine Freischaltung, aber auch kein
   * unnötiger Stripe-Wiederholungsversuch.
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