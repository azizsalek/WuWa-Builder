const fallbackUrl = "characters-fallback.json";
const characterApiUrl = "https://api-v2.encore.moe/api/en/character?v=Release";
const box = document.getElementById("character-database");
const modal = document.getElementById("character-detail");
const modalContent = document.getElementById("character-detail-content");
const search = document.getElementById("character-search");
const rarityFilter = document.getElementById("filter-rarity");
const elementFilter = document.getElementById("filter-element");
const count = document.getElementById("catalog-count");
const source = document.getElementById("catalog-source");

let characters = [];
let imageMap = new Map();

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
}

function normalizeName(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getImage(character) {
  return character.image || imageMap.get(normalizeName(character.name)) || "";
}

function render() {
  const query = search.value.trim().toLowerCase();
  const rarity = rarityFilter.value;
  const element = elementFilter.value;
  const filtered = characters.filter(c =>
    c.name.toLowerCase().includes(query) &&
    (!rarity || String(c.rarity) === rarity) &&
    (!element || c.element === element)
  );

  count.textContent = filtered.length + " / " + characters.length + " شخصية";
  box.innerHTML = filtered.map(c => {
    const image = getImage(c);
    const art = image
      ? '<img class="resonator-portrait" src="' + esc(image) + '" alt="' + esc(c.name) + '" loading="lazy" referrerpolicy="no-referrer">'
      : '<span class="art-placeholder">' + esc(c.name.slice(0, 1)) + '</span>';
    return '<button type="button" class="resonator-card element-' + esc(c.element || "unknown") + '" data-character="' + esc(c.name) + '">' +
      '<div class="resonator-art">' + art + '<span class="rarity-stars">' + "★".repeat(Number(c.rarity) || 0) + '</span></div>' +
      '<div class="resonator-info"><b>' + esc(c.name) + '</b><span>' + esc(c.element || "العنصر غير متوفر") + ' · ' + esc(c.rarity) + ' نجوم</span></div></button>';
  }).join("") || '<div class="empty-state">لا توجد نتائج مطابقة.</div>';

  box.querySelectorAll("[data-character]").forEach(card => {
    card.addEventListener("click", () => openDetails(card.dataset.character));
  });
  box.querySelectorAll("img").forEach(img => {
    img.addEventListener("error", () => {
      const placeholder = document.createElement("span");
      placeholder.className = "art-placeholder";
      placeholder.textContent = img.alt.slice(0, 1);
      img.replaceWith(placeholder);
    }, { once: true });
  });
}

function openDetails(name) {
  const c = characters.find(item => item.name === name);
  if (!c) return;
  const image = getImage(c);
  const art = image
    ? '<img class="detail-portrait" src="' + esc(image) + '" alt="' + esc(c.name) + '" referrerpolicy="no-referrer">'
    : '<span class="detail-art-placeholder">' + esc(c.name.slice(0, 1)) + '</span>';
  modalContent.innerHTML =
    '<div class="detail-hero"><div class="detail-art">' + art + '</div><div class="detail-heading">' +
    '<small>RESONATOR PROFILE</small><h2>' + esc(c.name) + '</h2><span>' + esc(c.element || "العنصر غير متوفر") + ' · ' + "★".repeat(Number(c.rarity) || 0) + '</span></div></div>' +
    '<section class="detail-section"><h3>المعلومات الأساسية</h3><div class="detail-stats">' +
    '<div><small>العنصر</small><b>' + esc(c.element || "غير موثق") + '</b></div>' +
    '<div><small>الندرة</small><b>' + esc(c.rarity) + ' نجوم</b></div>' +
    '<div><small>معرّف البيانات</small><b>' + esc(c.id || "—") + '</b></div>' +
    '<div><small>الصورة</small><b>' + (image ? "متوفرة" : "غير متوفرة") + '</b></div></div></section>' +
    '<section class="detail-section"><h3>ملف الشخصية الموسّع</h3><p>هذه البطاقة تعرض البيانات الأساسية المؤكدة حالياً. لم تُضف بعد معلومات القصة، الإحصائيات حسب المستوى، مهارات الشخصية، Forte، والـ Resonance Chain؛ لن نعرض قيماً تقديرية على أنها بيانات رسمية.</p></section>' +
    '<p class="data-footnote">صور الأيقونات تُحمّل من Encore API، وبيانات العنصر والندرة من قائمة الشخصيات المحلية. اللعبة وحقوق الشخصيات والصور تعود إلى Kuro Games.</p>';
  modal.classList.remove("hidden");
  document.body.classList.add("modal-open");
}

function closeDetails() {
  modal.classList.add("hidden");
  document.body.classList.remove("modal-open");
}

document.querySelectorAll("[data-close-character]").forEach(el => el.addEventListener("click", closeDetails));
document.addEventListener("keydown", e => { if (e.key === "Escape") closeDetails(); });
search.addEventListener("input", render);
rarityFilter.addEventListener("change", render);
elementFilter.addEventListener("change", render);

async function loadCharacters() {
  try {
    const response = await fetch(fallbackUrl, { cache: "no-cache" });
    if (!response.ok) throw new Error("Could not load local roster");
    characters = await response.json();
    render();
    source.textContent = "القائمة المحلية · جارٍ تحميل صور الشخصيات";
  } catch (error) {
    box.innerHTML = '<div class="empty-state">تعذر تحميل قائمة الشخصيات.</div>';
    source.textContent = "تعذر تحميل البيانات";
    return;
  }

  try {
    const response = await fetch(characterApiUrl);
    if (!response.ok) throw new Error("Character image service unavailable");
    const data = await response.json();
    const list = Array.isArray(data.roleList) ? data.roleList : [];
    for (const item of list) {
      if (item.Name && item.RoleHeadIcon) {
        imageMap.set(normalizeName(item.Name), item.RoleHeadIcon);
      }
    }
    characters = characters.map(c => ({ ...c, id: list.find(x => normalizeName(x.Name) === normalizeName(c.name))?.Id || "" }));
    render();
    source.textContent = imageMap.size
      ? "صور أيقونات الشخصيات محمّلة · " + imageMap.size + " صورة"
      : "الصور غير متاحة حالياً؛ تظهر البطاقات البديلة";
  } catch (error) {
    source.textContent = "تعذر تحميل الصور حالياً؛ ستظهر البطاقات البديلة";
  }
}

loadCharacters();
