const fallbackUrl = "characters-fallback.json";
const guideUrl = "character-guides.json";
const characterApiUrl = "https://api-v2.encore.moe/api/en/character?v=Release";
const box = document.getElementById("character-database");
const profilePage = document.getElementById("character-profile-page");
const profileContent = document.getElementById("character-profile-content");
const backButton = document.getElementById("character-back");
const search = document.getElementById("character-search");
const rarityFilter = document.getElementById("filter-rarity");
const elementFilter = document.getElementById("filter-element");
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
function render() {
  const query = search.value.trim().toLowerCase(), rarity = rarityFilter.value, element = elementFilter.value;
  const filtered = characters.filter(c => c.name.toLowerCase().includes(query) && (!rarity || String(c.rarity) === rarity) && (!element || c.element === element));
  count.textContent = filtered.length + " / " + characters.length + " شخصية";
  box.innerHTML = filtered.map(c => {
    const image = getImage(c);
    const art = image ? '<img class="resonator-portrait" src="' + esc(image) + '" alt="' + esc(c.name) + '" loading="lazy" referrerpolicy="no-referrer">' : '<span class="art-placeholder">' + esc(c.name.slice(0,1)) + '</span>';
    return '<button type="button" class="resonator-card element-' + esc(c.element || "unknown") + '" data-character="' + esc(c.name) + '"><div class="resonator-art">' + art + '<span class="rarity-stars">' + "★".repeat(Number(c.rarity)||0) + '</span></div><div class="resonator-info"><b>' + esc(c.name) + '</b><span>' + esc(c.element || "العنصر غير متوفر") + ' · ' + esc(c.rarity) + ' نجوم</span></div></button>';
  }).join("") || '<div class="empty-state">لا توجد نتائج مطابقة.</div>';
  box.querySelectorAll("[data-character]").forEach(card => card.addEventListener("click", () => openProfile(card.dataset.character)));
  box.querySelectorAll("img").forEach(img => img.addEventListener("error", () => {
    const placeholder=document.createElement("span"); placeholder.className="art-placeholder"; placeholder.textContent=img.alt.slice(0,1); img.replaceWith(placeholder);
  }, {once:true}));
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
    html += section("Teams · الفرق المقترحة", '<ul class="guide-list">' + guide.teams.map(team => '<li>' + esc(team) + '</li>').join("") + '</ul>');
    html += section("Echo Sets · مجموعات Echo", '<div class="guide-highlight"><b>' + esc(guide.echoSet) + '</b><p>Main Echo: ' + esc(guide.mainEcho) + '</p><p>Main Stats: ' + esc(guide.mainStats) + '</p><p>Substats: ' + esc(guide.subStats) + '</p></div>');
    html += section("Rotation · تسلسل اللعب", '<p>' + esc(guide.rotation) + '</p>');
    html += '<div class="guide-source">المصدر: <a href="' + esc(guide.source) + '" target="_blank" rel="noopener noreferrer">دليل الشخصية في بوابة Wuthering Waves الرسمية</a><p>التوصيات قد تتغير مع تحديثات اللعبة؛ راجع المصدر قبل اعتمادها.</p></div>';
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
search.addEventListener("input", render); rarityFilter.addEventListener("change", render); elementFilter.addEventListener("change", render);

async function loadCharacters() {
  try {
    const [rosterResponse,guidesResponse] = await Promise.all([fetch(fallbackUrl,{cache:"no-cache"}),fetch(guideUrl,{cache:"no-cache"})]);
    if (!rosterResponse.ok) throw new Error("Roster unavailable");
    characters = await rosterResponse.json(); guides = guidesResponse.ok ? await guidesResponse.json() : {};
    render(); sourceLabel.textContent = "قائمة الشخصيات · يتم تحميل الصور";
  } catch (error) {
    box.innerHTML='<div class="empty-state">تعذر تحميل قاعدة الشخصيات.</div>'; sourceLabel.textContent="تعذر تحميل البيانات"; return;
  }
  try {
    const response=await fetch(characterApiUrl); if(!response.ok) throw new Error("Image service unavailable");
    const data=await response.json(), list=Array.isArray(data.roleList)?data.roleList:[];
    list.forEach(item=>{if(item.Name&&item.RoleHeadIcon)imageMap.set(normalizeName(item.Name),item.RoleHeadIcon);});
    characters=characters.map(c=>({...c,id:list.find(x=>normalizeName(x.Name)===normalizeName(c.name))?.Id||""}));
    render(); sourceLabel.textContent=imageMap.size+" صورة مصغّرة متاحة · اضغط على البطاقة لفتح الملف";
  } catch (error) { sourceLabel.textContent="تعذر تحميل الصور الآن؛ ستظهر العناصر البديلة"; }
}
loadCharacters();
