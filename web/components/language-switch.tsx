"use client";

import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/i18n";

export function LanguageSwitch({ locale, label }: { locale: Locale; label: string }) {
  const pathname = usePathname() || "/" + locale;
  const nextLocale = locale === "en" ? "ar" : "en";
  const segments = pathname.split("/");
  segments[1] = nextLocale;
  return <a className="language-switch" href={segments.join("/")}>{label}</a>;
}
