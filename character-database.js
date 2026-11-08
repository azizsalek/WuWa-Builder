const fallbackUrl = "characters-fallback.json";
const guideUrl = "character-guides.json";
const characterApiUrl = "https://api-v2.encore.moe/api/en/character?v=Release";
const box = document.getElementById("character-database");
const profilePage = document.getElementById("character-profile-page");
const profileContent = document.getElementById("character-profile-content");
const backButton = document.getElementById("character-back");
const search = document.getElementById("character-search");
const rarityButtons = [...document.querySelectorAll("[data-rarity-filter]")];
const elementButtons = [...document.querySelectorAll("[data-element-filter]")];
const resetFilters = document.getElementById("reset-character-filters");
let activeRarity = "", activeElement = "";
const count = document.getElementById("catalog-count");
const sourceLabel = document.getElementById("catalog-source");
const charactersView = document.getElementById("characters");
const listOnlySelectors = [".intro-row", ".catalog-toolbar", "#character-database", ".section-heading", "#character-form", "#character-list"];
let characters = [], guides = {}, imageMap = new Map(), currentCharacter = null;

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function normalizeName(value) { return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, ""); }
function getImage(character) { return character.image || imageMap.get(normalizeName(character.name)) || ""; }
function guideCompleteness(guide) {
  const checks = [
    !!guide?.role, !!guide?.summary, !!guide?.kit,
    Array.isArray(guide?.skills) && guide.skills.length > 0,
    Array.isArray(guide?.teams) && guide.teams.length > 0,
    !!guide?.echoSet, !!guide?.rotation,
    typeof guide?.source === "string" && /^https?:\/\//i.test(guide.source)
  ];
  return { done: checks.filter(Boolean).length, total: checks.length };
}
function safeList(value) { return Array.isArray(value) ? value : []; }
function guideProgress(guide) {
  const score = guideCompleteness(guide);
  const percent = Math.round(score.done / score.total * 100);
  return '<div class="guide-completeness"><div class="guide-completeness-label"><b>اكتمال بيانات الملف</b><span>' + score.done + ' / ' + score.total + '</span></div><div class="guide-completeness-track"><span style="width:' + percent + '%"></span></div><small>مؤشر توفر الحقول الأساسية، وليس تقييماً لجودة الدليل.</small></div>';
}
function setListVisible(visible) {
  listOnlySelectors.forEach(selector => charactersView.querySelectorAll(selector).forEach(el => el.classList.toggle("profile-list-hidden", !visible)));
  profilePage.classList.toggle("hidden", visible);
}
const elementMeta = {
  Aero:{symbol:"✧",label:"Aero"}, Electro:{symbol:"ϟ",label:"Electro"},
  Fusion:{symbol:"♨",label:"Fusion"}, Glacio:{symbol:"❄",label:"Glacio"},
  Havoc:{symbol:"◈",label:"Havoc"}, Spectro:{symbol:"☼",label:"Spectro"}
};
function updateFilterButtons() {
  rarityButtons.forEach(button => button.classList.toggle("selected", button.dataset.rarityFilter === activeRarity));
  elementButtons.forEach(button => button.classList.toggle("selected", button.dataset.elementFilter === activeElement));
}
function render() {
  const query = search.value.trim().toLowerCase();
  const filtered = characters.filter(c =>
    c.name.toLowerCase().includes(query) &&
    (!activeRarity || String(c.rarity) === activeRarity) &&
    (!activeElement || c.element === activeElement)
  );
  const guideCount = characters.filter(c => !!guides[c.name]).length;
  count.textContent = "Showing " + filtered.length + " / " + characters.length + " characters · " + guideCount + " guides";
  box.innerHTML = filtered.map(c => {
    const image = getImage(c), meta = elementMeta[c.element] || {symbol:"◇",label:c.element || "Unknown"};
    const art = image
      ? '<img class="resonator-portrait" src="' + esc(image) + '" alt="' + esc(c.name) + '" loading="lazy" referrerpolicy="no-referrer">'
      : '<span class="art-placeholder">' + esc(c.name.slice(0,1)) + '</span>';
    return '<button type="button" class="resonator-card element-' + esc(c.element || "unknown") + '" data-character="' + esc(c.name) + '">' +
      '<div class="resonator-art">' + art +
      '<span class="rarity-stars" aria-label="' + esc(c.rarity) + ' stars">' + "★".repeat(Number(c.rarity)||0) + '</span>' +
      '<span class="element-badge" title="' + esc(meta.label) + '">' + esc(meta.symbol) + '</span></div>' +
      '<div class="resonator-info"><b>' + esc(c.name) + '</b><span>' + esc(meta.label) + ' · ' + esc(c.rarity) + '★</span><small class="guide-card-status ' + (guides[c.name] ? 'has-guide' : 'pending-guide') + '">' + (guides[c.name] ? 'ملف إرشادي متاح' : 'قيد التوثيق') + '</small></div></button>';
  }).join("") || '<div class="empty-state">لا توجد نتائج مطابقة. جرّب تغيير البحث أو الفلاتر.</div>';
  box.querySelectorAll("[data-character]").forEach(card => card.addEventListener("click", () => openProfile(card.dataset.character)));
  box.querySelectorAll("img").forEach(img => img.addEventListener("error", () => {
    const placeholder=document.createElement("span"); placeholder.className="art-placeholder"; placeholder.textContent=img.alt.slice(0,1); img.replaceWith(placeholder);
  }, {once:true}));
  window.wuwaRoster = characters.slice();
  window.dispatchEvent(new CustomEvent("wuwa:roster-ready", { detail: { characters: window.wuwaRoster } }));
  updateFilterButtons();
}

function safeRichHtml(raw) {
  const parsed = new DOMParser().parseFromString(String(raw||""), "text/html");
  const allowed = new Set(["P","BR","B","STRONG","I","EM","U","UL","OL","LI","H2","H3","H4","BLOCKQUOTE","A","IMG"]);
  function clean(node) {
    [...node.childNodes].forEach(child=>{
      if(child.nodeType===Node.TEXT_NODE)return;
      if(child.nodeType!==Node.ELEMENT_NODE){child.remove();return;}
      if(!allowed.has(child.tagName)){clean(child);child.replaceWith(...child.childNodes);return;}
      const savedHref=child.getAttribute("href")||"";
      const savedSrc=child.getAttribute("src")||"";
      [...child.attributes].forEach(attr=>child.removeAttribute(attr.name));
      if(child.tagName==="A"){
        const href=savedHref;
        if(/^https?:\/\//i.test(href)){child.setAttribute("href",href);child.setAttribute("target","_blank");child.setAttribute("rel","noopener noreferrer");}
      }
      if(child.tagName==="IMG"){
        const src=savedSrc;
        if(/^https:\/\//i.test(src)){child.setAttribute("src",src);child.setAttribute("loading","lazy");child.setAttribute("alt","");}
        else child.replaceWith(document.createTextNode("[صورة غير صالحة]"));
      } else clean(child);
    });
  }
  clean(parsed.body);return parsed.body.innerHTML;
}
function section(title, body) { return '<section class="guide-panel"><h3>' + title + '</h3>' + body + '</section>'; }
function openProfile(name) {
  const c = characters.find(item => item.name === name); if (!c) return;
  currentCharacter = c;
  const guide = guides[c.name], image = getImage(c);
  const art = image ? '<img class="profile-main-image" src="' + esc(image) + '" alt="' + esc(c.name) + '" referrerpolicy="no-referrer">' : '<div class="profile-image-placeholder">' + esc(c.name.slice(0,1)) + '</div>';
  const facts = '<div class="profile-facts"><span>' + esc(c.element || "العنصر غير موثق") + '</span><span>' + esc(c.rarity) + ' نجوم</span><span>' + (guide?.role ? esc(guide.role) : "تفاصيل الدور قيد التوثيق") + '</span></div>';
  let html = '<div class="profile-banner"><div class="profile-image-frame">' + art + '</div><div class="profile-title"><span class="eyebrow">RESONATOR PROFILE</span><h2>' + esc(c.name) + '</h2>' + facts + '<p>ملف الشخصية ودليل اللعب</p></div></div>';
  if (guide) {
    html += guideProgress(guide);
    if (guide.summary) html += section("نبذة عن الشخصية", '<p>' + esc(guide.summary) + '</p>');
    if (guide.richContent) html += section("معلومات إضافية", safeRichHtml(guide.richContent));
    html += section("Kit · أسلوب اللعب والقدرات", '<p>' + esc(guide.kit || "لم تتم إضافة وصف بعد.") + '</p>');
    if (safeList(guide.skills).length) html += section("Skills · المهارات", '<div class="guide-highlight">' + safeList(guide.skills).map(item => '<p><b>' + esc(item.name) + '</b><br>' + esc(item.desc) + '</p>').join("") + '</div>');
    if (safeList(guide.passives).length) html += section("Passive Skills · المهارات السلبية", '<div class="guide-highlight">' + safeList(guide.passives).map(item => '<p><b>' + esc(item.name) + '</b><br>' + esc(item.desc) + '</p>').join("") + '</div>');
    if (guide.forteCircuit) html += section("Forte Circuit · آلية Forte", '<p>' + esc(guide.forteCircuit) + '</p>');
    html += section("Teams · الفرق المقترحة", '<ul class="guide-list">' + safeList(guide.teams).map(team => '<li>' + esc(team) + '</li>').join("") || '<li>لم تتم إضافة فرق موصى بها بعد.</li>' + '</ul>');
    html += section("Echo Sets · مجموعات Echo", '<div class="guide-highlight"><b>' + esc(guide.echoSet || "لم تتم إضافة مجموعة Echo بعد.") + '</b><p>Main Echo: ' + esc(guide.mainEcho || "لم يتم تحديد Echo رئيسي بعد.") + '</p><p>Main Stats: ' + esc(guide.mainStats || "الإحصائيات الأساسية قيد التوثيق.") + '</p><p>Substats: ' + esc(guide.subStats || "الإحصائيات الفرعية قيد التوثيق.") + '</p>' + safeList(guide.echoOptions).map(item => '<p><b>' + esc(item.name) + ':</b> ' + esc(item.desc) + '</p>').join("") + '</div>');
    if (safeList(guide.recommendedStats).length) html += section("Recommended Stats · الإحصائيات المقترحة", '<ul class="guide-list">' + guide.recommendedStats.map(item => '<li>' + esc(item) + '</li>').join("") + '</ul>');
    if (safeList(guide.skillPriority).length) html += section("Skill Priority · أولوية تطوير المهارات", '<ol class="guide-list">' + guide.skillPriority.map(item => '<li>' + esc(item) + '</li>').join("") + '</ol>');
    html += section("Rotation · تسلسل اللعب", '<p>' + esc(guide.rotation || "لم تتم إضافة تدويرة موثقة بعد.") + '</p>' + (guide.advancedRotation ? '<p><b>تدوير متقدم:</b> ' + esc(guide.advancedRotation) + '</p>' : ''));
    if (guide.review) html += section("Review · التقييم", '<div class="guide-highlight"><b>نقاط القوة</b><ul class="guide-list">' + safeList(guide.review.strengths).map(item => '<li>' + esc(item) + '</li>').join("") + '</ul><b>نقاط يجب الانتباه لها</b><ul class="guide-list">' + safeList(guide.review.limitations).map(item => '<li>' + esc(item) + '</li>').join("") + '</ul></div>');
    const sequences = safeList(guide.sequences || guide.resonanceChain);
    if (sequences.length) html += section("Resonance Chain · العقد", '<div class="guide-highlight">' + sequences.map(item => '<p><b>' + esc(item.name) + '</b> — ' + esc(item.desc) + '</p>').join("") + '</div>');
    if (guide.baseStats) html += section("Base Stats · الإحصائيات الأساسية (Lv. 90)", '<div class="guide-highlight">' + Object.entries(guide.baseStats).map(([key,value]) => '<p><b>' + esc(key) + ':</b> ' + esc(value) + '</p>').join("") + '</div>' + (guide.minorFortes ? '<p>' + guide.minorFortes.map(esc).join(" · ") + '</p>' : ''));
    if (safeList(guide.voiceActors).length) html += section("Voice Actors · المؤدون الصوتيون", '<ul class="guide-list">' + safeList(guide.voiceActors).map(item => '<li>' + esc(item) + '</li>').join("") + '</ul>');
    if (guide.materials) { html += section("Materials · مواد التطوير", '<div class="guide-highlight"><p><b>الصعود:</b> ' + esc(guide.materials.ascension || "غير متوفر") + '</p><p><b>تطوير المهارات:</b> ' + esc(guide.materials.forte || "غير متوفر") + '</p></div>'); }
    if (guide.notes) html += section("ملاحظات المصدر", "<p>" + esc(guide.notes) + "</p>");
    if (typeof guide.source === "string" && /^https?:\/\//i.test(guide.source)) {
      html += '<div class="guide-source">المصدر: <a href="' + esc(guide.source) + '" target="_blank" rel="noopener noreferrer">' + esc(guide.sourceName || "دليل الشخصية") + '</a><p>آخر مراجعة للبيانات: ' + esc(guide.sourceLastVerified || "غير محدد") + '. قد تتغير التوصيات مع تحديثات اللعبة؛ راجع المصدر قبل اعتمادها.</p></div>';
    } else {
      html += '<div class="guide-pending">مصدر هذا الملف لم يُضف أو لم يتم التحقق من رابطه بعد.</div>';
    }
  } else {
    html += '<div class="guide-pending"><b>المعلومات التفصيلية لهذه الشخصية لم توثّق بعد.</b><p>لن نضع مهارات أو فرقاً أو تدويرات تخمينية. ستظهر البيانات بعد مطابقتها مع دليل رسمي أو مصدر موثوق.</p></div>';
    html += section("Kit · القدرات", "<p>بانتظار توثيق وصف المهارات وآليات Forte.</p>");
    html += section("Teams · الفرق", "<p>بانتظار اختبار التآزر مع الشخصيات الأخرى.</p>");
    html += section("Echo Sets · مجموعات Echo", "<p>بانتظار التحقق من المجموعة والإحصائيات المناسبة.</p>");
    html += section("Rotation · تسلسل اللعب", "<p>بانتظار تدوير موثّق من دليل موثوق أو اختبار عملي.</p>");
  }
  html += '<p class="profile-disclaimer">هذا الموقع مشروع مجتمعي غير رسمي. توصيات الدليل مرتبطة بالمصدر المذكور لكل شخصية.</p>';
  profileContent.innerHTML = html; setListVisible(false);
  document.getElementById("page-title").textContent = c.name;
  window.scrollTo({top:0,behavior:"smooth"});
  history.pushState({characterProfile:c.name}, "", "#character-" + encodeURIComponent(normalizeName(c.name)));
}
function closeProfile() {
  currentCharacter = null; setListVisible(true); document.getElementById("page-title").textContent = "الشخصيات";
  if (location.hash.startsWith("#character-")) history.replaceState({}, "", location.pathname + location.search);
  window.scrollTo({top:0,behavior:"smooth"});
}
backButton.addEventListener("click", closeProfile);
window.addEventListener("popstate", () => { if (currentCharacter) closeProfile(); });
search.addEventListener("input", render);
rarityButtons.forEach(button => button.addEventListener("click", () => {
  activeRarity = activeRarity === button.dataset.rarityFilter ? "" : button.dataset.rarityFilter;
  render();
}));
elementButtons.forEach(button => button.addEventListener("click", () => {
  activeElement = activeElement === button.dataset.elementFilter ? "" : button.dataset.elementFilter;
  render();
}));
resetFilters.addEventListener("click", () => {
  search.value = ""; activeRarity = ""; activeElement = ""; render();
});

async function loadCharacters() {
  // Render the bundled roster first so the catalogue never depends on the
  // Supabase request completing successfully.
  try {
    const [rosterResponse, guidesResponse] = await Promise.all([
      fetch(fallbackUrl, { cache: "no-cache" }),
      fetch(guideUrl, { cache: "no-cache" })
    ]);
    if (!rosterResponse.ok) throw new Error("Roster fallback returned HTTP " + rosterResponse.status);
    const fallbackRoster = await rosterResponse.json();
    if (!Array.isArray(fallbackRoster) || fallbackRoster.length === 0) {
      throw new Error("Roster fallback is empty or has an invalid format");
    }
    characters = fallbackRoster;
    guides = guidesResponse.ok ? await guidesResponse.json() : {};
    render();
    sourceLabel.textContent = "قائمة محلية احتياطية · " + characters.length + " شخصية";
  } catch (fallbackError) {
    console.error("Character fallback failed:", fallbackError);
    box.innerHTML = '<div class="empty-state">تعذر تحميل قائمة الشخصيات. تحقق من اتصال الإنترنت ثم أعد تحميل الصفحة.</div>';
    sourceLabel.textContent = "تعذر تحميل بيانات الشخصيات";
    return;
  }

  // Upgrade the initial data from the cloud only when a real, non-empty
  // roster is returned. An empty response must not replace valid local data.
  if (window.wuwaSupabase) {
    try {
      const cloudRequest = window.wuwaSupabase
        .from("site_content")
        .select("slug, content")
        .in("slug", ["characters-roster", "character-guides"]);
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Supabase request timed out")), 8000)
      );
      const { data, error } = await Promise.race([cloudRequest, timeout]);
      if (error) throw error;
      const rows = Array.isArray(data) ? data : [];
      const rosterRow = rows.find(row => row.slug === "characters-roster");
      const guidesRow = rows.find(row => row.slug === "character-guides");
      if (Array.isArray(rosterRow?.content) && rosterRow.content.length > 0) {
        characters = rosterRow.content.filter(item => item && typeof item.name === "string");
        if (characters.length > 0) {
          if (guidesRow?.content && typeof guidesRow.content === "object" && !Array.isArray(guidesRow.content)) {
            guides = guidesRow.content;
          }
          render();
          sourceLabel.textContent = "بيانات الشخصيات من قاعدة البيانات السحابية · " + characters.length + " شخصية";
        }
      } else {
        console.warn("Supabase returned no usable roster; keeping bundled fallback data.");
      }
    } catch (cloudError) {
      console.warn("Cloud character data unavailable; keeping bundled fallback data:", cloudError);
    }
  }

  // Portraits are optional: failures must never hide the character list.
  try {
    const response = await fetch(characterApiUrl);
    if (!response.ok) throw new Error("Image service returned HTTP " + response.status);
    const data = await response.json();
    const list = Array.isArray(data.roleList) ? data.roleList : [];
    list.forEach(item => {
      // Encore's current character payload commonly exposes RoleHeadIconCircle;
      // keep older and larger portrait fields as compatible fallbacks.
      const portrait = item.RoleHeadIconCircle || item.RoleHeadIcon ||
        item.FormationRoleCard || item.RolePortrait || item.Card || "";
      if (item.Name && typeof portrait === "string" && portrait.trim()) {
        imageMap.set(normalizeName(item.Name), portrait.trim());
      }
    });
    characters = characters.map(c => ({
      ...c,
      id: list.find(x => normalizeName(x.Name) === normalizeName(c.name))?.Id || ""
    }));
    render();
    sourceLabel.textContent = imageMap.size + " صورة مصغّرة متاحة · " + characters.length + " شخصية";
  } catch (imageError) {
    console.warn("Character portraits unavailable; showing fallback initials:", imageError);
    sourceLabel.textContent = characters.length + " شخصية · تعذر تحميل الصور، وتظهر الأحرف البديلة";
  }
}
loadCharacters();
