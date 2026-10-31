const titles = { dashboard: "الرئيسية", characters: "قائمة الشخصيات", "site-page": "صفحة معلومات" };

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


// Published pages created in the admin dashboard are accessible through ?page=slug.
function safePageHtml(raw){
 const doc=new DOMParser().parseFromString(String(raw||""),"text/html");
 const allowed=new Set(["P","BR","B","STRONG","I","EM","U","UL","OL","LI","H1","H2","H3","H4","BLOCKQUOTE","A","IMG","TABLE","THEAD","TBODY","TR","TH","TD","HR"]);
 function walk(node){[...node.childNodes].forEach(el=>{
  if(el.nodeType===Node.TEXT_NODE)return;
  if(el.nodeType!==Node.ELEMENT_NODE){el.remove();return;}
  if(!allowed.has(el.tagName)){walk(el);el.replaceWith(...el.childNodes);return;}
  const tag=el.tagName,href=el.getAttribute("href"),src=el.getAttribute("src");
  [...el.attributes].forEach(x=>el.removeAttribute(x.name));
  if(tag==="A"&&href&&/^https?:\/\//i.test(href)){el.setAttribute("href",href);el.setAttribute("target","_blank");el.setAttribute("rel","noopener noreferrer");}
  if(tag==="IMG"&&src&&/^https:\/\//i.test(src)){el.setAttribute("src",src);el.setAttribute("loading","lazy");el.setAttribute("alt","");}
  else if(tag==="IMG")el.replaceWith(document.createTextNode("[صورة غير صالحة]"));
  else walk(el);
 });}
 walk(doc.body);return doc.body.innerHTML;
}
async function loadPublishedPages(){
 if(!window.wuwaSupabase)return;
 const {data,error}=await window.wuwaSupabase.from("site_content").select("title,slug,content").eq("published",true);
 if(error)return;
 const pages=(data||[]).filter(r=>r.content?.cmsType==="page");
 const footer=document.querySelector("footer");
 if(footer&&pages.length){
  const nav=document.createElement("nav");nav.className="public-pages-links";nav.setAttribute("aria-label","صفحات الموقع");
  nav.innerHTML=pages.map(p=>'<a href="?page='+encodeURIComponent(p.slug.replace(/^page-/,""))+'">'+String(p.title).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]))+'</a>').join("");
  footer.insertAdjacentElement("beforebegin",nav);
 }
 const requested=new URLSearchParams(location.search).get("page");
 if(!requested)return;
 const row=pages.find(p=>p.slug==="page-"+requested||p.slug===requested);
 if(!row)return;
 const main=document.querySelector(".main");if(!main)return;
 document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
 const view=document.createElement("section");view.className="view active public-static-page";
 view.innerHTML='<div class="intro-row"><div><span class="eyebrow">WUWA BUILDER · INFORMATION</span><h2></h2></div></div><article class="panel guide-panel public-page-body"></article>';
 view.querySelector("h2").textContent=row.title;
 view.querySelector(".public-page-body").innerHTML=safePageHtml(row.content.body||"");
 main.insertBefore(view,footer||null);
 const title=document.getElementById("page-title");if(title)title.textContent=row.title;
 document.title=row.title+" · WuWa Builder";
}
loadPublishedPages();
