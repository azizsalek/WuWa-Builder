"use client";

import { useEffect, useMemo, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { getMessages } from "@/lib/i18n";

type Character = { name: string; rarity: number; element: string; id?: string; image?: string };
const elements = ["Aero", "Electro", "Fusion", "Glacio", "Havoc", "Spectro"];

export function CharacterDirectory({ locale }: { locale: Locale }) {
  const t = getMessages(locale);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [query, setQuery] = useState("");
  const [element, setElement] = useState("all");
  const [rarity, setRarity] = useState("all");
  const [images, setImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch("/data/characters-fallback.json")
      .then((r) => { if (!r.ok) throw new Error("Roster unavailable"); return r.json(); })
      .then((data: Character[]) => { if (alive) setCharacters(data); })
      .catch(() => { if (alive) setCharacters([]); })
      .finally(() => { if (alive) setLoading(false); });

    fetch("https://api-v2.encore.moe/api/en/character?v=Release")
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((payload) => {
        const map: Record<string, string> = {};
        for (const item of payload?.roleList ?? []) {
          const portrait = item.RoleHeadIconCircle || item.RoleHeadIcon || item.FormationRoleCard || item.RolePortrait || item.Card;
          if (item.Name && portrait) map[String(item.Name).toLowerCase().replace(/[^a-z0-9]/g, "")] = portrait;
        }
        if (alive) setImages(map);
      }).catch(() => undefined);
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => characters.filter((c) => {
    const q = query.trim().toLowerCase();
    return c.name.toLowerCase().includes(q) &&
      (element === "all" || c.element === element) &&
      (rarity === "all" || String(c.rarity) === rarity);
  }), [characters, query, element, rarity]);

  const labels: Record<string, string> = locale === "ar"
    ? { Aero: "هواء", Electro: "كهرباء", Fusion: "ناري", Glacio: "جليدي", Havoc: "فوضى", Spectro: "طيفي" }
    : { Aero: "Aero", Electro: "Electro", Fusion: "Fusion", Glacio: "Glacio", Havoc: "Havoc", Spectro: "Spectro" };

  return <div className="directory">
    <div className="directory-toolbar">
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.search} aria-label={t.search} />
      <select value={element} onChange={(e) => setElement(e.target.value)} aria-label={t.element}>
        <option value="all">{t.allElements}</option>
        {elements.map((e) => <option key={e} value={e}>{labels[e]}</option>)}
      </select>
      <select value={rarity} onChange={(e) => setRarity(e.target.value)} aria-label={t.rarity}>
        <option value="all">{t.allRarities}</option>
        <option value="5">{t.fiveStar}</option>
        <option value="4">{t.fourStar}</option>
      </select>
    </div>
    <div className="directory-meta">{loading ? t.loading : (locale === "ar" ? "عدد النتائج: " : "Results: ") + filtered.length}</div>
    {loading ? <div className="empty-panel">{t.loading}</div> : filtered.length === 0 ? <div className="empty-panel">{t.noResults}</div> :
      <div className="character-grid">{filtered.map((c) => {
        const key = c.name.toLowerCase().replace(/[^a-z0-9]/g, "");
        const image = images[key] || c.image;
        return <article className="character-card" key={c.name}>
          <div className={"character-art element-" + c.element.toLowerCase()}>
            {image ? <img src={image} alt={c.name} loading="lazy" /> : <span>{c.name.slice(0,1)}</span>}
            <b className="stars">{"★".repeat(c.rarity)}</b>
          </div>
          <div className="character-info"><strong>{c.name}</strong><span>{labels[c.element] || c.element} · {c.rarity}★</span></div>
        </article>;
      })}</div>}
    <p className="source-note">{t.sourceNote}</p>
  </div>;
}
