"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { getMessages } from "@/lib/i18n";

type Character = { name: string; rarity: number; element: string };
type Guide = { role?: string; summary?: string; kit?: string; skills?: {name:string;desc:string}[]; teams?: string[]; echoSet?: string; mainEcho?: string; mainStats?: string; subStats?: string; rotation?: string; source?: string; sourceName?: string; sourceLastVerified?: string };
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");

export function CharacterProfile({ locale, slug }: { locale: Locale; slug: string }) {
  const t = getMessages(locale);
  const [character,setCharacter] = useState<Character|null>(null);
  const [guide,setGuide] = useState<Guide|null>(null);
  const [busy,setBusy] = useState(true);
  useEffect(() => {
    let active=true;
    Promise.all([
      fetch("/data/characters-fallback.json").then(r=>r.json()),
      fetch("/data/character-guides.json").then(r=>r.ok?r.json():{})
    ]).then(([roster,guides]) => {
      if(!active)return;
      const found=(roster as Character[]).find(c=>slugify(c.name)===slug);
      setCharacter(found||null);
      setGuide(found ? (guides as Record<string,Guide>)[found.name] || null : null);
    }).catch(()=>{if(active)setCharacter(null)}).finally(()=>{if(active)setBusy(false)});
    return ()=>{active=false};
  },[slug]);
  if(busy)return <div className="empty-panel">{t.loading}</div>;
  if(!character)return <div className="panel-card"><h1>Character not found</h1><Link className="button button-ghost" href={"/"+locale+"/characters"}>{t.characters}</Link></div>;
  const sections = [
    [locale==="ar"?"نبذة":"Overview",guide?.summary],
    [locale==="ar"?"أسلوب اللعب والقدرات":"Kit & Playstyle",guide?.kit],
    [locale==="ar"?"مجموعة Echo":"Echo Set",guide?.echoSet],
    [locale==="ar"?"الـ Echo الرئيسي":"Main Echo",guide?.mainEcho],
    [locale==="ar"?"الإحصائيات الأساسية":"Main Stats",guide?.mainStats],
    [locale==="ar"?"الإحصائيات الفرعية":"Substats",guide?.subStats],
    [locale==="ar"?"تسلسل اللعب":"Rotation",guide?.rotation]
  ] as const;
  return <div className="page-stack">
    <Link className="back-link" href={"/"+locale+"/characters"}>← {t.characters}</Link>
    <section className="profile-hero panel-card"><div className={"profile-symbol element-"+character.element.toLowerCase()}>{character.name.slice(0,1)}</div><div><span className="eyebrow">RESONATOR PROFILE</span><h1>{character.name}</h1><p>{character.element} · {character.rarity}★ · {guide?.role || (locale==="ar"?"الدور قيد التوثيق":"Role not yet documented")}</p></div></section>
    {guide ? <>
      {sections.filter(([,value])=>!!value).map(([heading,value])=><section className="panel-card" key={heading}><h2>{heading}</h2><p>{value}</p></section>)}
      {guide.skills?.length ? <section className="panel-card"><h2>{locale==="ar"?"المهارات":"Skills"}</h2>{guide.skills.map(skill=><div className="skill-row" key={skill.name}><b>{skill.name}</b><p>{skill.desc}</p></div>)}</section>:null}
      {guide.teams?.length ? <section className="panel-card"><h2>{locale==="ar"?"الفرق المقترحة":"Suggested Teams"}</h2><ul>{guide.teams.map(team=><li key={team}>{team}</li>)}</ul></section>:null}
      {guide.source ? <p className="source-note">{locale==="ar"?"المصدر":"Source"}: <a href={guide.source} target="_blank" rel="noreferrer">{guide.sourceName||guide.source}</a> · {guide.sourceLastVerified||""}</p>:null}
    </> : <section className="panel-card"><h2>{locale==="ar"?"الملف قيد التوثيق":"Guide in progress"}</h2><p>{locale==="ar"?"لن نعرض مهارات أو توصيات غير موثقة. ستضاف التفاصيل بعد التحقق من مصادر موثوقة.":"Unverified skills and recommendations are intentionally omitted. Details will be added after checking reliable sources."}</p></section>}
  </div>;
}
