import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import { isLocale, type Locale } from "@/lib/i18n";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Wuthering Hub | Wuthering Waves Companion",
  description: "A bilingual Wuthering Waves companion for characters, damage planning, and build evaluation.",
  applicationName: "Wuthering Hub",
};

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale as Locale;
  return <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
    <body><div className="app-frame"><SiteHeader locale={locale} /><main className="main-content">{children}</main><SiteFooter locale={locale} /></div></body>
  </html>;
}
