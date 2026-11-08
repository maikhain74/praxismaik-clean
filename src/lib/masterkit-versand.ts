import { createClient } from "@supabase/supabase-js";
import {
  MASTERKIT_BUCKET,
  getMasterkitProdukt,
} from "./masterkit-produkte";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY
);



function encryptionKey(): Buffer {
  const value = import.meta.env.MASTERKIT_ENCRYPTION_KEY;

  if (!value || !/^[a-f0-9]{64}$/i.test(value)) {
    throw new Error(
      "MASTERKIT_ENCRYPTION_KEY fehlt oder ist ungültig."
    );
  }

  return Buffer.from(value, "hex");
}

function encryptToken(token: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(
    "aes-256-gcm",
    encryptionKey(),
    iv
  );

  const encrypted = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);

  return [
    iv.toString("hex"),
    cipher.getAuthTag().toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

function decryptToken(value: string): string {
  const parts = value.split(":");

  if (parts.length !== 3) {
    throw new Error("Gespeicherter Download-Token ist ungültig.");
  }

  const [iv, tag, encrypted] = parts;

  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(iv, "hex")
  );

  decipher.setAuthTag(Buffer.from(tag, "hex"));

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "hex")),
    decipher.final(),
  ]).toString("utf8");
}

export async function sendMasterkitDownload(
  sessionId: string
): Promise<void> {
  const resendApiKey = import.meta.env.RESEND_API_KEY;
  const siteUrl = import.meta.env.SITE_URL;

  if (!resendApiKey || !siteUrl) {
    throw new Error("RESEND_API_KEY oder SITE_URL fehlt.");
  }

  const { data: order, error: orderError } = await supabase
    .from("masterkit_orders")
    .select(
      "stripe_session_id, customer_email, payment_status, product_key, email_sent_at, delivery_status"
    )
    .eq("stripe_session_id", sessionId)
    .single();

  if (orderError || !order) {
    throw new Error("Masterkit-Bestellung nicht gefunden.");
  }

  const produkt = getMasterkitProdukt(order.product_key);

  if (
    order.payment_status !== "paid" ||
    !produkt
  ) {
    throw new Error(
      "Masterkit-Bestellung ist nicht bezahlt oder Produkt unbekannt."
    );
  }

  if (order.email_sent_at || order.delivery_status === "sent") {
    return;
  }

  const { data: claimed, error: claimError } =
    await supabase.rpc("claim_masterkit_delivery", {
      p_session_id: sessionId,
    });

  if (claimError) {
    throw new Error(
      `Versandreservierung fehlgeschlagen: ${claimError.message}`
    );
  }

  if (claimed !== true) {
    throw new Error(
      "Masterkit-Versand nicht reserviert. Bestellung wird bereits verarbeitet oder erfordert eine manuelle Prüfung."
    );
  }

  let resendAccepted = false;
  let resendRequestStarted = false;
  let resendDefinitelyRejected = false;

  try {
    const { data: fileInfo, error: fileError } =
      await supabase.storage
        .from(MASTERKIT_BUCKET)
        .info(produkt.datei);

    if (fileError || !fileInfo) {
      throw new Error(
        "Masterkit-PDF im privaten Speicher nicht gefunden."
      );
    }

    const { data: current, error: currentError } =
      await supabase
        .from("masterkit_orders")
        .select(
          "download_token_hash, download_expires_at, delivery_token_encrypted, delivery_attempt_id"
        )
        .eq("stripe_session_id", sessionId)
        .single();

    if (currentError || !current) {
      throw new Error(
        "Versanddaten konnten nicht geladen werden."
      );
    }

    let token: string;
    let expiresAt: string;

    if (
      current.delivery_token_encrypted &&
      current.download_token_hash &&
      current.download_expires_at &&
      current.delivery_attempt_id
    ) {
      token = decryptToken(current.delivery_token_encrypted);
      expiresAt = current.download_expires_at;

      const hash = createHash("sha256")
        .update(token)
        .digest("hex");

      if (hash !== current.download_token_hash) {
        throw new Error(
          "Gespeicherter Download-Token stimmt nicht überein."
        );
      }
    } else {
      token = randomBytes(32).toString("hex");
      expiresAt = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ).toISOString();

      const tokenHash = createHash("sha256")
        .update(token)
        .digest("hex");

      const { error: tokenError } = await supabase
        .from("masterkit_orders")
        .update({
          download_token_hash: tokenHash,
          download_expires_at: expiresAt,
          delivery_token_encrypted: encryptToken(token),
          delivery_attempt_id: `masterkit-${sessionId}`,
          email_error: null,
        })
        .eq("stripe_session_id", sessionId)
        .eq("delivery_status", "processing");

      if (tokenError) {
        throw new Error(
          `Downloadberechtigung konnte nicht gespeichert werden: ${tokenError.message}`
        );
      }
    }

    const downloadUrl = new URL(
      "/api/masterkit-download",
      siteUrl
    );

    downloadUrl.searchParams.set("token", token);

    const emailText = [
      "Vielen Dank für deinen Einkauf bei PraxisMaik!",
      "",
      "Dein " + produkt.name + " steht bereit.",
      "",
      "Hier kannst du deine PDF herunterladen:",
      downloadUrl.toString(),
      "",
      "Der Downloadlink ist 7 Tage gültig.",
      "",
      "Bei Problemen erreichst du uns unter kontakt@praxismaik.de.",
      "",
      "Viel Erfolg beim Lernen!",
      "Dein PraxisMaik-Team",
    ].join("\n");

    resendRequestStarted = true;

    const response = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `masterkit-${sessionId}`,
        },
        body: JSON.stringify({
          from: "PraxisMaik <kontakt@praxismaik.de>",
          to: [order.customer_email],
          subject:
            produkt.emailBetreff,
          text: emailText,
        }),
      }
    );

    if (!response.ok) {
      // Bei 5xx bleibt unklar, ob Resend die Anfrage verarbeitet hat.
      // 4xx bedeutet eine ausdrücklich abgelehnte Anfrage.
      if (response.status >= 400 && response.status < 500) {
        resendDefinitelyRejected = true;
      }

      const errorText = await response.text();
      throw new Error(
        `Resend-Versand fehlgeschlagen (${response.status}): ${errorText.slice(0, 500)}`
      );
    }

    const resendResult = await response.json();
    resendAccepted = true;

    const { data: updated, error: sentError } = await supabase
      .from("masterkit_orders")
      .update({
        delivery_status: "sent",
        email_sent_at: new Date().toISOString(),
        resend_email_id: resendResult.id ?? null,
        email_error: null,
      })
      .eq("stripe_session_id", sessionId)
      .eq("delivery_status", "processing")
      .select("stripe_session_id");

    if (sentError || updated?.length !== 1) {
      throw new Error(
        "E-Mail angenommen, aber Versandstatus nicht eindeutig gespeichert."
      );
    }

    console.log("Masterkit-Downloadmail versendet:", {
      sessionId,
      resendEmailId: resendResult.id,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unbekannter Versandfehler";

    if (
      resendAccepted ||
      (resendRequestStarted && !resendDefinitelyRejected)
    ) {
      console.error(
        "Masterkit-E-Mail von Resend angenommen, aber Versandstatus nicht bestätigt. Manuelle Prüfung erforderlich:",
        { sessionId, error: message }
      );

      await supabase
        .from("masterkit_orders")
        .update({
          email_error: (
            "RESEND_ANGENOMMEN_MANUELL_PRUEFEN: " + message
          ).slice(0, 1000),
        })
        .eq("stripe_session_id", sessionId)
        .eq("delivery_status", "processing");

      throw error;
    }

    const { error: resetError } = await supabase
      .from("masterkit_orders")
      .update({
        email_error: message.slice(0, 1000),
        delivery_status: "pending",
        delivery_claimed_at: null,
      })
      .eq("stripe_session_id", sessionId)
      .eq("delivery_status", "processing")
      .is("email_sent_at", null);

    if (resetError) {
      console.error(
        "Masterkit-Versandstatus konnte nicht zurückgesetzt werden:",
        resetError
      );
    }

    throw error;
  }
}
