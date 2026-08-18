import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";

export const prerender = false;

const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY
);

const resendApiKey = import.meta.env.RESEND_API_KEY;

const notificationEmail = "praxismaik.pflege@gmail.com";

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    const vorname =
      typeof body.vorname === "string" ? body.vorname.trim() : "";

    const email =
      typeof body.email === "string" ? body.email.trim() : "";

    const themenbereich =
      typeof body.themenbereich === "string"
        ? body.themenbereich.trim()
        : "";

    const problem =
      typeof body.problem === "string" ? body.problem.trim() : "";

    const zeitpunkt =
      typeof body.zeitpunkt === "string" ? body.zeitpunkt.trim() : "";

    if (!vorname || !email || !themenbereich || !problem) {
      return new Response(
        JSON.stringify({
          error: "Bitte fülle alle Pflichtfelder aus.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!email.includes("@")) {
      return new Response(
        JSON.stringify({
          error: "Bitte gib eine gültige E-Mail-Adresse ein.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { error } = await supabase
      .from("lernhilfe_anfragen")
      .insert({
        vorname,
        email,
        themenbereich,
        problem,
        zeitpunkt: zeitpunkt || null,
      });

    if (error) {
      console.error("Lernhilfe Supabase Fehler:", error);

      return new Response(
        JSON.stringify({
          error: "Die Anfrage konnte nicht gespeichert werden.",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!resendApiKey) {
      console.error(
        "Lernhilfe Resend Fehler: RESEND_API_KEY ist nicht gesetzt."
      );
    } else {
      try {
        const emailText = [
          "Neue 1:1 Lernhilfe-Anfrage bei PraxisMaik",
          "",
          `Vorname: ${vorname}`,
          `E-Mail: ${email}`,
          `Themenbereich: ${themenbereich}`,
          `Gewünschter Zeitpunkt: ${zeitpunkt || "Keine Angabe"}`,
          "",
          "Problem / Unterstützungsbedarf:",
          problem,
          "",
          "Die vollständige Anfrage wurde zusätzlich in Supabase gespeichert.",
        ].join("\n");

        const resendResponse = await fetch(
          "https://api.resend.com/emails",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
              "User-Agent": "PraxisMaik/1.0",
            },
            body: JSON.stringify({
              from: "PraxisMaik <kontakt@praxismaik.de>",
              to: [notificationEmail],
              reply_to: email,
              subject: `Neue 1:1 Lernhilfe-Anfrage von ${vorname}`,
              text: emailText,
            }),
          }
        );

        if (!resendResponse.ok) {
          const resendError =
            await resendResponse.text();

          console.error(
            "Lernhilfe Resend Fehler:",
            resendResponse.status,
            resendError
          );
        }
      } catch (resendError) {
        console.error(
          "Lernhilfe Resend Versandfehler:",
          resendError
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Lernhilfe API Fehler:", error);

    return new Response(
      JSON.stringify({
        error: "Serverfehler.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};