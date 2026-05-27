export const prerender = false;

export async function GET({ url, cookies, redirect }: any) {
  const code = String(url.searchParams.get("code") || "").trim();

  const validCode = import.meta.env.DOZENTEN_CODE;

  if (!validCode || code !== validCode) {
    return redirect("/dozenten-testzugang?error=1", 303);
  }

  cookies.set("praxismaik_premium", "1", {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
    secure: import.meta.env.PROD,
  });

  return redirect("/premium", 303);
}