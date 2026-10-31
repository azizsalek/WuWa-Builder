const titles = { dashboard: "الرئيسية", characters: "قائمة الشخصيات" };

function go(view) {
  if (!titles[view]) return;
  document.querySelectorAll(".view").forEach(section => section.classList.toggle("active", section.id === view));
  document.querySelectorAll(".sidebar nav [data-view]").forEach(button => button.classList.toggle("active", button.dataset.view === view));
  const title = document.getElementById("page-title");
  if (title) title.textContent = titles[view];
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll(".sidebar nav [data-view]").forEach(button => {
  button.addEventListener("click", () => go(button.dataset.view));
});
document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => go(button.dataset.go));
});

async function applyPublicSiteSettings() {
  try {
    if (!window.wuwaSupabase) return;
    const { data, error } = await window.wuwaSupabase
      .from("site_content").select("content").eq("slug", "site-settings").eq("published", true).maybeSingle();
    if (error || !data?.content) return;
    const settings = data.content;
    if (settings.themePrimary) document.documentElement.style.setProperty("--cyan", settings.themePrimary);
    if (settings.themeSecondary) document.documentElement.style.setProperty("--blue", settings.themeSecondary);
    if (settings.siteName) {
      document.title = settings.siteName;
      document.querySelectorAll(".brand b").forEach(el => el.textContent = settings.siteName);
    }
    if (settings.tagline) document.querySelectorAll(".brand small").forEach(el => el.textContent = settings.tagline);
    if (settings.dashboardTitle) {
      const title = document.querySelector("#dashboard .hero-copy h2");
      if (title) title.textContent = settings.dashboardTitle;
    }
    if (settings.dashboardDescription) {
      const description = document.querySelector("#dashboard .hero-copy p");
      if (description) description.textContent = settings.dashboardDescription;
    }
    let banner = document.getElementById("site-announcement");
    if (settings.announcement) {
      if (!banner) {
        banner = document.createElement("div");
        banner.id = "site-announcement";
        banner.className = "notice site-announcement";
        const topbar = document.querySelector(".main .topbar");
        if (topbar) topbar.insertAdjacentElement("afterend", banner);
      }
      if (banner) banner.textContent = settings.announcement;
    } else if (banner) banner.remove();
    if (settings.maintenanceMode === true && !document.querySelector(".maintenance-overlay")) {
      const overlay = document.createElement("div");
      overlay.className = "maintenance-overlay";
      overlay.innerHTML = '<div class="maintenance-card"><span class="eyebrow">WUWA BUILDER</span><h2>الموقع تحت الصيانة</h2><p>نعمل على تحسين الموقع. يرجى العودة لاحقاً.</p></div>';
      document.body.appendChild(overlay);
    }
  } catch (error) {
    console.warn("Site settings could not be applied.", error);
  }
}
applyPublicSiteSettings();
