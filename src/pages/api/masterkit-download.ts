import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

export const prerender = false;

const BUCKET = "praxismaik-produkte";
const DATEI = "PraxisMaik_Medikamentenlehre_Masterkit.pdf";

export const GET: APIRoute = async ({ url }) => {
  const token = url.searchParams.get("token");

  if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
    return new Response("Ungültiger Downloadlink.", {
      status: 403,
    });
  }

  const supabase = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const tokenHash = createHash("sha256")
    .update(token)
    .digest("hex");

  const { data: order, error } = await supabase
    .from("masterkit_orders")
    .select(
      "stripe_session_id, payment_status, product_key, download_expires_at"
    )
    .eq("download_token_hash", tokenHash)
    .maybeSingle();

  if (error) {
    console.error("Masterkit Download Datenbankfehler:", error);

    return new Response("Download derzeit nicht verfügbar.", {
      status: 500,
    });
  }

  if (
    !order ||
    order.payment_status !== "paid" ||
    order.product_key !== "medikamentenlehre-masterkit" ||
    !order.download_expires_at ||
    new Date(order.download_expires_at).getTime() <= Date.now()
  ) {
    return new Response(
      "Dieser Downloadlink ist ungültig oder abgelaufen.",
      { status: 403 }
    );
  }

  const { data: pdf, error: storageError } = await supabase.storage
    .from(BUCKET)
    .download(DATEI);

  if (storageError || !pdf) {
    console.error(
      "Masterkit PDF konnte nicht geladen werden:",
      storageError
    );

    return new Response(
      "Die PDF ist vorübergehend nicht verfügbar.",
      { status: 500 }
    );
  }

  return new Response(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition":
        'attachment; filename="PraxisMaik_Medikamentenlehre_Masterkit.pdf"',
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
};
