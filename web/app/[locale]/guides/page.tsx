import { notFound } from "next/navigation";
import { getMessages, isLocale, type Locale } from "@/lib/i18n";

export default async function GuidesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const t = getMessages(raw as Locale);
  return <section className="page-stack">
    <div className="page-heading"><span className="eyebrow">KNOWLEDGE ARCHIVE</span><h1>{t.guidesHeading}</h1><p>{t.guidesIntro}</p></div>
    <div className="panel-card result-placeholder"><span className="feature-icon">✧</span><h2>{t.guidesPending}</h2><p>{t.sourceNote}</p><div className="pending-chip">{t.coming}</div></div>
  </section>;
}
