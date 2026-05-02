import { getCollection } from "astro:content";

export async function GET() {
  const entries = await getCollection("themen");

  const data = entries.map((entry) => {
    let content = "";

    if (entry.body) {
      content = entry.body
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/`[^`]*`/g, " ")
        .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
        .replace(/\[[^\]]*\]\([^)]+\)/g, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/[#>*_-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    return {
      title: entry.data.title ?? "",
      description: entry.data.description ?? "",
      category: entry.slug.split("/")[0] ?? "",
      url: `/themen/${entry.slug}/`,
      content,
    };
  });

  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}