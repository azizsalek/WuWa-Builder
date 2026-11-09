import Link from "next/link";
import { notFound } from "next/navigation";
import { getMessages, isLocale, type Locale } from "@/lib/i18n";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const t = getMessages(locale);
  return <div className="page-stack">
    <section className="hero-panel">
      <div className="hero-content">
        <span className="eyebrow">{t.eyebrow}</span>
        <h1>{t.heroTitle.split("\\n").map((line, i) => <span key={i}>{line}<br /></span>)}</h1>
        <p>{t.heroText}</p>
        <div className="hero-actions">
          <Link className="button button-primary" href={"/" + locale + "/characters"}>{t.explore}</Link>
          <Link className="button button-ghost" href={"/" + locale + "/calculator"}>{t.openCalculator}</Link>
        </div>
      </div>
      <div className="hero-emblem" aria-hidden="true"><div className="emblem-ring ring-one" /><div className="emblem-ring ring-two" /><div className="emblem-core">W</div><span>RESONATOR DATABASE</span></div>
    </section>
    <section className="section-block">
      <div className="section-heading"><div><span className="eyebrow">EXPLORE THE HUB</span><h2>{t.featured}</h2><p>{t.featuredText}</p></div></div>
      <div className="feature-grid">
        <Link className="feature-card" href={"/" + locale + "/characters"}><span className="feature-icon">✧</span><h3>{t.database}</h3><p>{t.databaseText}</p><b>{t.open} ↗</b></Link>
        <Link className="feature-card" href={"/" + locale + "/calculator"}><span className="feature-icon">⌁</span><h3>{t.damageTitle}</h3><p>{t.damageText}</p><b>{t.open} ↗</b></Link>
        <Link className="feature-card" href={"/" + locale + "/build-rating"}><span className="feature-icon">◈</span><h3>{t.ratingTitle}</h3><p>{t.ratingText}</p><b>{t.open} ↗</b></Link>
      </div>
    </section>
    <section className="wide-callout"><div><span className="eyebrow">THE NEXT RESONANCE</span><h2>{t.guidesTitle}</h2><p>{t.guidesText}</p></div><Link className="button button-ghost" href={"/" + locale + "/guides"}>{t.open} ↗</Link></section>
  </div>;
}
