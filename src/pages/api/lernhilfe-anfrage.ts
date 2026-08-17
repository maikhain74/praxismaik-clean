import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";

export const prerender = false;

const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY
);

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