import { notFound } from "next/navigation";
import { getMessages, isLocale, type Locale } from "@/lib/i18n";

export default async function CalculatorPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const t = getMessages(raw as Locale);
  return <section className="page-stack">
    <div className="page-heading"><span className="eyebrow">DAMAGE LAB · BETA</span><h1>{t.calculatorHeading}</h1><p>{t.calculatorIntro}</p></div>
    <div className="workspace-grid">
      <div className="panel-card"><h2>{t.character} & {t.skill}</h2><label>{t.character}<select><option>Choose a Resonator</option></select></label><label>{t.skill}<select><option>Choose a verified skill</option></select></label><div className="form-grid">
        <label>{t.attack}<input type="number" placeholder="2000" /></label><label>{t.critRate}<input type="number" placeholder="70" /></label><label>{t.critDamage}<input type="number" placeholder="250" /></label><label>{t.damageBonus}<input type="number" placeholder="40" /></label><label>{t.enemyLevel}<input type="number" placeholder="ระดับ العدو" /></label><label>{t.resistance}<input type="number" placeholder="10" /></label>
      </div><h3>{t.buffs}</h3><textarea rows={3} placeholder="Buffs and debuffs configuration — next phase" /></div>
      <aside className="panel-card result-placeholder"><span className="feature-icon">⌁</span><h2>{t.enginePending}</h2><p>{t.enginePendingText}</p><div className="pending-chip">{t.coming}</div></aside>
    </div>
    <div className="panel-card"><h2>{t.rotation}</h2><p className="muted">Resonator A → Outro Skill → Resonator B → Main DPS window</p><button className="button button-ghost" disabled>{t.addStep}</button></div>
  </section>;
}
