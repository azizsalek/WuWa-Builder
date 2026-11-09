import { notFound } from "next/navigation";
import { getMessages, isLocale, type Locale } from "@/lib/i18n";

export default async function BuildRatingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const t = getMessages(raw as Locale);
  return <section className="page-stack">
    <div className="page-heading"><span className="eyebrow">BUILD ANALYSIS · BETA</span><h1>{t.ratingHeading}</h1><p>{t.ratingIntro}</p></div>
    <div className="workspace-grid">
      <div className="panel-card"><h2>{t.stats}</h2><label>{t.character}<select><option>Choose a Resonator</option></select></label><label>{t.weapon}<input placeholder="Weapon name" /></label><label>{t.echoSet}<input placeholder="Echo set" /></label>
        <div className="form-grid"><label>{t.attack}<input type="number" placeholder="2000" /></label><label>{t.critRate}<input type="number" placeholder="70" /></label><label>{t.critDamage}<input type="number" placeholder="250" /></label><label>{t.energyRegen}<input type="number" placeholder="120" /></label><label>{t.damageBonus}<input type="number" placeholder="40" /></label></div>
      </div>
      <aside className="panel-card result-placeholder"><span className="feature-icon">◈</span><h2>{t.scorePending}</h2><p>{t.scorePendingText}</p><div className="pending-chip">{t.coming}</div></aside>
    </div>
  </section>;
}
