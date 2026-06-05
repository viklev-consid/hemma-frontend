import { NextResponse } from "next/server";

import { setLocaleCookie } from "@/i18n/cookie";
import { isLocale } from "@/i18n/locales";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  const locale = (body as { locale?: unknown })?.locale;
  if (!isLocale(locale)) {
    return NextResponse.json({ error: "unsupported-locale" }, { status: 400 });
  }

  await setLocaleCookie(locale);
  return new NextResponse(null, { status: 204 });
}
