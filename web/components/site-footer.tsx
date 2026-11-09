import type { Locale } from "@/lib/i18n";
import { getMessages } from "@/lib/i18n";

export function SiteFooter({ locale }: { locale: Locale }) {
  const t = getMessages(locale);
  return <footer className="site-footer"><span>© {new Date().getFullYear()} {t.brand}</span><span>{t.footer}</span></footer>;
}
