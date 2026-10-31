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
  count.textContent = "Showing " + filtered.length + " / " + characters.length + " characters";
  box.innerHTML = filtered.map(c => {
    const image = getImage(c), meta = elementMeta[c.element] || {symbol:"◇",label:c.element || "Unknown"};
    const art = image
      ? '<img class="resonator-portrait" src="' + esc(image) + '" alt="' + esc(c.name) + '" loading="lazy" referrerpolicy="no-referrer">'
      : '<span class="art-placeholder">' + esc(c.name.slice(0,1)) + '</span>';
    return '<button type="button" class="resonator-card element-' + esc(c.element || "unknown") + '" data-character="' + esc(c.name) + '">' +
      '<div class="resonator-art">' + art +
      '<span class="rarity-stars" aria-label="' + esc(c.rarity) + ' stars">' + "★".repeat(Number(c.rarity)||0) + '</span>' +
      '<span class="element-badge" title="' + esc(meta.label) + '">' + esc(meta.symbol) + '</span></div>' +
      '<div class="resonator-info"><b>' + esc(c.name) + '</b><span>' + esc(meta.label) + ' · ' + esc(c.rarity) + '★</span></div></button>';
  }).join("") || '<div class="empty-state">لا توجد نتائج مطابقة. جرّب تغيير البحث أو الفلاتر.</div>';
  box.querySelectorAll("[data-character]").forEach(card => card.addEventListener("click", () => openProfile(card.dataset.character)));
  box.querySelectorAll("img").forEach(img => img.addEventListener("error", () => {
    const placeholder=document.createElement("span"); placeholder.className="art-placeholder"; placeholder.textContent=img.alt.slice(0,1); img.replaceWith(placeholder);
  }, {once:true}));
  updateFilterButtons();
}

function section(title, body) { return '<section class="guide-panel"><h3>' + title + '</h3>' + body + '</section>'; }
function openProfile(name) {
  const c = characters.find(item => item.name === name); if (!c) return;
  currentCharacter = c;
  const guide = guides[c.name], image = getImage(c);
  const art = image ? '<img class="profile-main-image" src="' + esc(image) + '" alt="' + esc(c.name) + '" referrerpolicy="no-referrer">' : '<div class="profile-image-placeholder">' + esc(c.name.slice(0,1)) + '</div>';
  const facts = '<div class="profile-facts"><span>' + esc(c.element || "العنصر غير موثق") + '</span><span>' + esc(c.rarity) + ' نجوم</span><span>' + (guide ? esc(guide.role) : "تفاصيل الدور قيد التوثيق") + '</span></div>';
  let html = '<div class="profile-banner"><div class="profile-image-frame">' + art + '</div><div class="profile-title"><span class="eyebrow">RESONATOR PROFILE</span><h2>' + esc(c.name) + '</h2>' + facts + '<p>ملف الشخصية ودليل اللعب</p></div></div>';
  if (guide) {
    html += section("Kit · أسلوب اللعب والقدرات", '<p>' + esc(guide.kit) + '</p>');
    if (guide.skills) html += section("Skills · المهارات", '<div class="guide-highlight">' + guide.skills.map(item => '<p><b>' + esc(item.name) + '</b><br>' + esc(item.desc) + '</p>').join("") + '</div>');
    if (guide.passives) html += section("Passive Skills · المهارات السلبية", '<div class="guide-highlight">' + guide.passives.map(item => '<p><b>' + esc(item.name) + '</b><br>' + esc(item.desc) + '</p>').join("") + '</div>');
    html += section("Teams · الفرق المقترحة", '<ul class="guide-list">' + guide.teams.map(team => '<li>' + esc(team) + '</li>').join("") + '</ul>');
    html += section("Echo Sets · مجموعات Echo", '<div class="guide-highlight"><b>' + esc(guide.echoSet) + '</b><p>Main Echo: ' + esc(guide.mainEcho) + '</p><p>Main Stats: ' + esc(guide.mainStats) + '</p><p>Substats: ' + esc(guide.subStats) + '</p>' + (guide.echoOptions || []).map(item => '<p><b>' + esc(item.name) + ':</b> ' + esc(item.desc) + '</p>').join("") + '</div>');
    if (guide.recommendedStats) html += section("Recommended Stats · الإحصائيات المقترحة", '<ul class="guide-list">' + guide.recommendedStats.map(item => '<li>' + esc(item) + '</li>').join("") + '</ul>');
    if (guide.skillPriority) html += section("Skill Priority · أولوية تطوير المهارات", '<ol class="guide-list">' + guide.skillPriority.map(item => '<li>' + esc(item) + '</li>').join("") + '</ol>');
    html += section("Rotation · تسلسل اللعب", '<p>' + esc(guide.rotation) + '</p>' + (guide.advancedRotation ? '<p><b>تدوير متقدم:</b> ' + esc(guide.advancedRotation) + '</p>' : ''));
    if (guide.review) html += section("Review · التقييم", '<div class="guide-highlight"><b>نقاط القوة</b><ul class="guide-list">' + guide.review.strengths.map(item => '<li>' + esc(item) + '</li>').join("") + '</ul><b>نقاط يجب الانتباه لها</b><ul class="guide-list">' + guide.review.limitations.map(item => '<li>' + esc(item) + '</li>').join("") + '</ul></div>');
    if (guide.sequences) html += section("Resonance Chain · العقد", '<div class="guide-highlight">' + guide.sequences.map(item => '<p><b>' + esc(item.name) + '</b> — ' + esc(item.desc) + '</p>').join("") + '</div>');
    if (guide.baseStats) html += section("Base Stats · الإحصائيات الأساسية (Lv. 90)", '<div class="guide-highlight">' + Object.entries(guide.baseStats).map(([key,value]) => '<p><b>' + esc(key) + ':</b> ' + esc(value) + '</p>').join("") + '</div>' + (guide.minorFortes ? '<p>' + guide.minorFortes.map(esc).join(" · ") + '</p>' : ''));
    if (guide.voiceActors) html += section("Voice Actors · المؤدون الصوتيون", '<ul class="guide-list">' + guide.voiceActors.map(item => '<li>' + esc(item) + '</li>').join("") + '</ul>');
    if (guide.materials) { html += section("Materials · مواد التطوير", '<div class="guide-highlight"><p><b>الصعود:</b> ' + esc(guide.materials.ascension || "غير متوفر") + '</p><p><b>تطوير المهارات:</b> ' + esc(guide.materials.forte || "غير متوفر") + '</p></div>'); }
    if (guide.notes) html += section("ملاحظات المصدر", "<p>" + esc(guide.notes) + "</p>");
    html += '<div class="guide-source">المصدر: <a href="' + esc(guide.source) + '" target="_blank" rel="noopener noreferrer">' + esc(guide.sourceName || "دليل الشخصية") + '</a><p>آخر مراجعة للبيانات: ' + esc(guide.sourceLastVerified || "غير محدد") + '. قد تتغير التوصيات مع تحديثات اللعبة؛ راجع المصدر قبل اعتمادها.</p></div>';
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
  try {
    let loadedFromCloud = false;
    if (window.wuwaSupabase) {
      const { data, error } = await window.wuwaSupabase
        .from("site_content")
        .select("slug, content")
        .in("slug", ["characters-roster", "character-guides"]);
      if (!error) {
        const rosterRow = (data || []).find(row => row.slug === "characters-roster");
        const guidesRow = (data || []).find(row => row.slug === "character-guides");
        characters = Array.isArray(rosterRow?.content) ? rosterRow.content : [];
        guides = guidesRow?.content && typeof guidesRow.content === "object" ? guidesRow.content : {};
        loadedFromCloud = true;
      }
    }
    if (!loadedFromCloud) {
      const [rosterResponse,guidesResponse] = await Promise.all([
        fetch(fallbackUrl,{cache:"no-cache"}),
        fetch(guideUrl,{cache:"no-cache"})
      ]);
      if (!rosterResponse.ok) throw new Error("Roster unavailable");
      characters = await rosterResponse.json();
      guides = guidesResponse.ok ? await guidesResponse.json() : {};
    }
    render();
    sourceLabel.textContent = loadedFromCloud
      ? "بيانات الشخصيات من قاعدة البيانات السحابية"
      : "قائمة الشخصيات · يتم تحميل الصور";
  } catch (error) {
    box.innerHTML='<div class="empty-state">تعذر تحميل قاعدة الشخصيات.</div>';
    sourceLabel.textContent="تعذر تحميل البيانات";
    return;
  }
  try {
    const response=await fetch(characterApiUrl); if(!response.ok) throw new Error("Image service unavailable");
    const data=await response.json(), list=Array.isArray(data.roleList)?data.roleList:[];
    list.forEach(item=>{if(item.Name&&item.RoleHeadIcon)imageMap.set(normalizeName(item.Name),item.RoleHeadIcon);});
    characters=characters.map(c=>({...c,id:list.find(x=>normalizeName(x.Name)===normalizeName(c.name))?.Id||""}));
    render(); sourceLabel.textContent=imageMap.size+" صورة مصغّرة متاحة · بيانات الملفات من قاعدة البيانات";
  } catch (error) { sourceLabel.textContent="تعذر تحميل الصور الآن؛ ستظهر العناصر البديلة"; }
}
loadCharacters();
