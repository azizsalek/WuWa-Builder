import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { getMessages } from "@/lib/i18n";
import { LanguageSwitch } from "@/components/language-switch";

export function SiteHeader({ locale }: { locale: Locale }) {
  const t = getMessages(locale);
  const nav = [
    ["/", t.home],
    ["/characters", t.characters],
    ["/calculator", t.calculator],
    ["/build-rating", t.rating],
    ["/guides", t.guides],
  ];
  return (
    <header className="site-header">
      <Link className="brand" href={"/" + locale}>
        <span className="brand-mark">W</span>
        <span><b>{t.brand}</b><small>{t.tagline}</small></span>
      </Link>
      <nav className="main-nav" aria-label="Main navigation">
        {nav.map(([path, label]) => <Link key={path} href={"/" + locale + (path === "/" ? "" : path)}>{label}</Link>)}
      </nav>
      <LanguageSwitch locale={locale} label={t.language} />
    </header>
  );
}
