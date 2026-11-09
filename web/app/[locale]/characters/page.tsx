import { notFound } from "next/navigation";
import { CharacterDirectory } from "@/components/character-directory";
import { getMessages, isLocale, type Locale } from "@/lib/i18n";

export default async function CharactersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const t = getMessages(locale);
  return <section className="page-stack">
    <div className="page-heading"><span className="eyebrow">RESONATOR DATABASE</span><h1>{t.rosterTitle}</h1><p>{t.rosterText}</p></div>
    <CharacterDirectory locale={locale} />
  </section>;
}
