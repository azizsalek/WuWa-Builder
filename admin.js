const db = window.wuwaSupabase;
const $ = (id) => document.getElementById(id);
let records = [];
let activeId = null;
let busy = false;

function setMessage(id, message, isError = false) {
  const node = $(id);
  node.textContent = message || "";
  node.classList.toggle("error", !!isError);
}
function show(id, visible) { $(id).classList.toggle("hidden", !visible); }
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function lockForm(form, locked) {
  form.querySelectorAll("button,input,textarea").forEach(el => el.disabled = locked);
}
async function checkAdmin() {
  const { data, error } = await db.rpc("is_site_admin");
  if (error) throw error;
  return data === true;
}
let sessionRenderVersion = 0;
async function renderSession(session) {
  const renderVersion = ++sessionRenderVersion;
  show("auth-panel", !session);
  show("setup-panel", false);
  show("admin-app", false);
  if (!session) return;

  let admin;
  try {
    admin = await checkAdmin();
  } catch (error) {
    if (renderVersion !== sessionRenderVersion) return;
    show("auth-panel", true);
    setMessage("auth-message", "تعذر الاتصال بخدمة التحقق من صلاحيات المدير: " + (error.message || "خطأ غير معروف"), true);
    return;
  }
  if (renderVersion !== sessionRenderVersion) return;
  if (!admin) {
    show("setup-panel", true);
    return;
  }

  show("auth-panel", false);
  show("setup-panel", false);
  show("admin-app", true);
  try {
    await switchAdminView("characters");
    if (renderVersion !== sessionRenderVersion) return;
    await loadRecords();
    await loadSiteSettings();
    renderCmsList("post","posts-list","posts-count");
    renderCmsList("page","pages-list","pages-count");
    loadAdvancedSettings();
  } catch (error) {
    if (renderVersion !== sessionRenderVersion) return;
    const message = "تم التحقق من صلاحيات المدير، لكن حدث خطأ أثناء تحميل لوحة الإدارة: " + (error.message || "خطأ غير معروف");
    const target = $("character-editor-message") ? "character-editor-message" : "auth-message";
    setMessage(target, message, true);
    console.error("Admin dashboard initialization failed:", error);
  }
}

$("auth-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  lockForm(form, true);
  setMessage("auth-message", "جارٍ تسجيل الدخول…");
  const { error } = await db.auth.signInWithPassword({
    email: $("auth-email").value.trim(),
    password: $("auth-password").value
  });
  if (error) setMessage("auth-message", error.message, true);
  else setMessage("auth-message", "تم تسجيل الدخول.");
  lockForm(form, false);
});
$("signup-button").addEventListener("click", async () => {
  const email = $("auth-email").value.trim();
  const password = $("auth-password").value;
  if (!email || password.length < 8) {
    setMessage("auth-message", "أدخل بريداً إلكترونياً وكلمة مرور من 8 أحرف على الأقل.", true);
    return;
  }
  setMessage("auth-message", "جارٍ إنشاء الحساب…");
  const { data, error } = await db.auth.signUp({ email, password });
  if (error) return setMessage("auth-message", error.message, true);
  if (!data.session) {
    setMessage("auth-message", "تم إنشاء الحساب. تحقق من بريدك لتأكيده، ثم سجّل الدخول.");
  } else {
    setMessage("auth-message", "تم إنشاء الحساب. سجّل الدخول ثم فعّل صلاحية المدير.");
    await renderSession(data.session);
  }
});
$("setup-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  lockForm(form, true);
  setMessage("setup-message", "جارٍ تفعيل صلاحية المدير…");
  const { error } = await db.rpc("claim_site_admin", { p_bootstrap_token: $("setup-token").value.trim() });
  if (error) {
    setMessage("setup-message", "لم يتم التفعيل: " + error.message, true);
  } else {
    $("setup-token").value = "";
    setMessage("setup-message", "تم تفعيل صلاحيات المدير بنجاح.");
    await renderSession((await db.auth.getSession()).data.session);
  }
  lockForm(form, false);
});
$("logout-button").addEventListener("click", async () => {
  await db.auth.signOut();
  location.reload();
});

function resetEditor() {
  activeId = null;
  $("content-form").reset();
  $("record-id").value = "";
  $("record-content").value = "{}";
  $("editor-heading").textContent = "إنشاء سجل محتوى";
  $("editor-status").textContent = "سجل جديد";
  $("editor-status").classList.remove("saved");
  $("delete-record").disabled = true;
  setMessage("save-message", "");
}
function selectRecord(record) {
  activeId = record.id;
  $("record-id").value = record.id;
  $("record-slug").value = record.slug;
  $("record-title").value = record.title;
  $("record-content").value = JSON.stringify(record.content, null, 2);
  $("record-published").checked = !!record.published;
  $("editor-heading").textContent = "تعديل: " + record.title;
  $("editor-status").textContent = "تم تحميل السجل";
  $("editor-status").classList.add("saved");
  $("delete-record").disabled = false;
  setMessage("save-message", "");
  renderRecordList();
}
function renderRecordList() {
  const list = $("record-list");
  if (!records.length) {
    list.innerHTML = '<p class="admin-muted">لا توجد سجلات بعد. أنشئ أول سجل.</p>';
    return;
  }
  list.innerHTML = records.map(record => `
    <button type="button" class="record-button ${record.id === activeId ? "active" : ""}" data-record-id="${escapeHtml(record.id)}">
      <b>${escapeHtml(record.title)}</b>
      <small>${escapeHtml(record.slug)}</small>
      <span class="record-state ${record.published ? "" : "draft"}">${record.published ? "منشور" : "مسودة"}</span>
    </button>
  `).join("");
  list.querySelectorAll("[data-record-id]").forEach(button => {
    button.addEventListener("click", () => {
      const record = records.find(item => item.id === button.dataset.recordId);
      if (record) selectRecord(record);
    });
  });
}
async function loadRecords() {
  const { data, error } = await db.from("site_content").select("*").order("updated_at", { ascending: false });
  if (error) {
    setMessage("save-message", "تعذر تحميل المحتوى: " + error.message, true);
    return;
  }
  records = data || [];
  $("record-count").textContent = records.length;
  $("published-count").textContent = records.filter(item => item.published).length;
  const latest = records.map(item => item.updated_at).filter(Boolean).sort().at(-1);
  $("last-updated").textContent = latest ? new Date(latest).toLocaleDateString("ar") : "—";
  renderRecordList();
  renderCharacterManager();
  if (activeId) {
    const current = records.find(item => item.id === activeId);
    if (current) selectRecord(current);
    else resetEditor();
  }
}
$("new-record").addEventListener("click", resetEditor);
$("reset-editor").addEventListener("click", () => {
  if (activeId) {
    const current = records.find(item => item.id === activeId);
    if (current) selectRecord(current);
  } else resetEditor();
});
$("content-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  let content;
  try { content = JSON.parse($("record-content").value); }
  catch (error) { return setMessage("save-message", "صيغة JSON غير صحيحة: " + error.message, true); }
  const payload = {
    slug: $("record-slug").value.trim(),
    title: $("record-title").value.trim(),
    content,
    published: $("record-published").checked,
    updated_at: new Date().toISOString()
  };
  const button = event.submitter;
  if (button) button.disabled = true;
  const request = activeId
    ? db.from("site_content").update(payload).eq("id", activeId).select().single()
    : db.from("site_content").insert(payload).select().single();
  const { data, error } = await request;
  if (button) button.disabled = false;
  if (error) return setMessage("save-message", "لم يتم الحفظ: " + error.message, true);
  activeId = data.id;
  setMessage("save-message", "تم حفظ التغييرات بنجاح.");
  $("editor-status").textContent = "محفوظ";
  $("editor-status").classList.add("saved");
  await loadRecords();
  selectRecord(data);
});
$("delete-record").addEventListener("click", async () => {
  if (!activeId || !confirm("هل تريد حذف هذا السجل نهائياً؟")) return;
  const { error } = await db.from("site_content").delete().eq("id", activeId);
  if (error) return setMessage("save-message", "تعذر الحذف: " + error.message, true);
  setMessage("save-message", "تم حذف السجل.");
  resetEditor();
  await loadRecords();
});
document.querySelectorAll("[data-load-record]").forEach(button => {
  button.addEventListener("click", () => {
    const record = records.find(item => item.slug === button.dataset.loadRecord);
    if (record) selectRecord(record);
    else setMessage("save-message", "هذا السجل غير موجود في قاعدة البيانات.", true);
  });
});
$("media-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const file = $("media-file").files[0];
  if (!file) return;
  if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type) || file.size > 5 * 1024 * 1024) {
    return setMessage("media-result", "اختر صورة PNG أو JPG أو WEBP أو GIF بحجم لا يتجاوز 5MB.", true);
  }
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
  const path = Date.now() + "-" + safeName;
  setMessage("media-result", "جارٍ رفع الصورة…");
  const { error } = await db.storage.from("site-media").upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) return setMessage("media-result", "فشل الرفع: " + error.message, true);
  const { data } = db.storage.from("site-media").getPublicUrl(path);
  $("media-result").innerHTML = "";
  const link = document.createElement("a");
  link.href = data.publicUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.className = "media-result-link";
  link.textContent = data.publicUrl;
  $("media-result").append("تم رفع الصورة. انسخ الرابط لاستخدامه في محتوى JSON: ", link);
  $("media-file").value = "";
});


async function loadSiteSettings() {
  const { data, error } = await db.from("site_content").select("*").eq("slug", "site-settings").maybeSingle();
  if (error || !data) {
    $("settings-status").textContent = "تعذر التحميل";
    setMessage("settings-message", error?.message || "سجل الإعدادات غير موجود.", true);
    return;
  }
  const s = data.content || {};
  $("setting-site-name").value = s.siteName || "WuWa Builder";
  $("setting-tagline").value = s.tagline || "";
  $("setting-dashboard-title").value = s.dashboardTitle || "";
  $("setting-dashboard-description").value = s.dashboardDescription || "";
  $("setting-announcement").value = s.announcement || "";
  $("setting-show-builds").checked = s.showBuilds !== false;
  $("setting-show-echoes").checked = s.showEchoes !== false;
  $("setting-show-characters").checked = s.showCharacters !== false;
  $("setting-show-profile").checked = s.showProfile !== false;
  $("setting-maintenance").checked = s.maintenanceMode === true;
  $("settings-status").textContent = "تم التحميل";
}
$("site-settings-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const settings = {
    siteName: $("setting-site-name").value.trim(),
    tagline: $("setting-tagline").value.trim(),
    dashboardTitle: $("setting-dashboard-title").value.trim(),
    dashboardDescription: $("setting-dashboard-description").value.trim(),
    announcement: $("setting-announcement").value.trim(),
    showBuilds: $("setting-show-builds").checked,
    showEchoes: $("setting-show-echoes").checked,
    showCharacters: $("setting-show-characters").checked,
    showProfile: $("setting-show-profile").checked,
    maintenanceMode: $("setting-maintenance").checked
  };
  const button = event.submitter;
  if (button) button.disabled = true;
  $("settings-status").textContent = "جارٍ الحفظ";
  const { error } = await db.from("site_content").update({
    title: "إعدادات الموقع", content: settings, published: true,
    updated_at: new Date().toISOString()
  }).eq("slug", "site-settings");
  if (button) button.disabled = false;
  if (error) {
    $("settings-status").textContent = "فشل الحفظ";
    return setMessage("settings-message", "تعذر حفظ الإعدادات: " + error.message, true);
  }
  $("settings-status").textContent = "محفوظ";
  setMessage("settings-message", "تم حفظ إعدادات الموقع. ستظهر التغييرات للزوار عند تحديث الموقع.");
  await loadRecords();
});

(async function boot() {
  if (!db) {
    setMessage("auth-message", "تعذر تهيئة الاتصال بقاعدة البيانات.", true);
    return;
  }
  const { data } = await db.auth.getSession();
  await renderSession(data.session);
  db.auth.onAuthStateChange((_event, session) => {
    queueMicrotask(() => renderSession(session));
  });
})();

async function loadCharacterEditorData(){
 const box=$("character-editor-message"),select=$("character-editor-select");
 if(!box||!select||!db)return;
 box.classList.remove("error");box.textContent="جارٍ تحميل قائمة الشخصيات والأدلة…";
 select.innerHTML='<option value="">جارٍ التحميل…</option>';
 try{
  const {data,error}=await db.from("site_content").select("id,slug,title,content,published").in("slug",["characters-roster","character-guides"]);
  if(error)throw error;
  const rows=data||[];
  const rosterRow=rows.find(r=>r.slug==="characters-roster");
  const guidesRow=rows.find(r=>r.slug==="character-guides");
  if(!rosterRow||!guidesRow)throw new Error("سجلات قاعدة الشخصيات غير مكتملة (القائمة: "+(rosterRow?"موجودة":"مفقودة")+"، الأدلة: "+(guidesRow?"موجودة":"مفقودة")+")");
  if(!Array.isArray(rosterRow.content))throw new Error("محتوى قائمة الشخصيات ليس قائمة JSON.");
  ceRoster=rosterRow.content.filter(c=>c&&typeof c.name==="string"&&c.name.trim());
  ceGuides=guidesRow.content&&typeof guidesRow.content==="object"&&!Array.isArray(guidesRow.content)?guidesRow.content:{};
  records=records.filter(r=>!["characters-roster","character-guides"].includes(r.slug)).concat(rows);
  const previous=ceCurrentName;
  select.innerHTML='<option value="">اختر شخصية…</option>'+ceRoster.map(c=>'<option value="'+escapeHtml(c.name)+'">'+escapeHtml(c.name)+'</option>').join("");
  const selected=ceRoster.some(c=>c.name===previous)?previous:(ceRoster[0]?.name||"");
  select.value=selected;
  if(selected)loadCharacterIntoEditor(selected);
  else box.textContent="تم الاتصال بقاعدة البيانات، لكن قائمة الشخصيات فارغة.";
  if(selected){box.classList.remove("error");box.textContent="تم تحميل "+ceRoster.length+" شخصية و"+Object.keys(ceGuides).length+" دليل. اختر شخصية من القائمة لبدء التعديل.";}
 }catch(error){
  select.innerHTML='<option value="">تعذر تحميل الشخصيات</option>';
  box.textContent="فشل تحميل قاعدة الشخصيات: "+(error.message||String(error));
  box.classList.add("error");
 }
}
async function switchAdminView(name){
 document.querySelectorAll(".admin-view").forEach(v=>v.classList.toggle("active",v.dataset.panel===name));
 document.querySelectorAll(".admin-nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===name));
 const meta={posts:["المشاركات","أنشئ المقالات وأدر المسودات والمنشورات."],stats:["الإحصاءات","متابعة أداء الموقع والزيارات الحقيقية."],comments:["التعليقات","مراجعة تعليقات الزوار وإدارتها."],earnings:["الأرباح","إعدادات تحقيق الدخل والربط بالخدمات."],pages:["الصفحات","إنشاء الصفحات الثابتة وإدارتها."],layout:["التنسيق","التحكم بالأقسام الظاهرة وترتيب الواجهة."],theme:["المظهر","تخصيص ألوان وهوية الموقع."],settings:["الإعدادات","إعدادات الموقع العامة والخصوصية."],reading:["قائمة القراءة","مصادر ومراجع محفوظة."],characters:["قاعدة الشخصيات","إدارة قاعدة الشخصيات وأدلتها."],media:["مكتبة الوسائط","رفع الصور وإدارة روابطها."],backup:["النسخ الاحتياطي","تصدير المحتوى واستيراد نسخة محفوظة."],content:["محرر جميع بيانات الموقع","إضافة وتعديل وحذف سجلات المحتوى والإعدادات وقاعدة الشخصيات والأدلة مباشرة."]};
 if(!meta[name])return;
 $("view-title").textContent=meta[name][0];$("view-description").textContent=meta[name][1];
 if(name==="characters")await loadCharacterEditorData();
}
document.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>{switchAdminView(b.dataset.view);if(b.dataset.view==="content")loadRecords();}));
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>switchAdminView(b.dataset.go)));
document.querySelectorAll("[data-load-record]").forEach(b=>b.addEventListener("click",()=>{const r=records.find(x=>x.slug===b.dataset.loadRecord);if(r){selectRecord(r);switchAdminView("content");}else setMessage("save-message","هذا السجل غير موجود في قاعدة البيانات.",true);}));
$("export-backup").addEventListener("click",()=>{const blob=new Blob([JSON.stringify({format:"wuwa-builder-backup-v1",exportedAt:new Date().toISOString(),records},null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="wuwa-builder-backup-"+new Date().toISOString().slice(0,10)+".json";a.click();URL.revokeObjectURL(a.href);setMessage("backup-message","تم تجهيز النسخة الاحتياطية.");});
$("import-backup").addEventListener("click",async()=>{const file=$("backup-file").files[0];if(!file)return setMessage("backup-message","اختر ملف JSON أولاً.",true);try{const parsed=JSON.parse(await file.text());const incoming=Array.isArray(parsed)?parsed:parsed.records;if(!Array.isArray(incoming))throw new Error("بنية الملف غير صحيحة");if(!confirm("سيتم استيراد "+incoming.length+" سجل. قد يتم تحديث سجلات موجودة. هل تريد المتابعة؟"))return;for(const r of incoming){if(!r.slug||!r.title||typeof r.content!=="object")throw new Error("يوجد سجل ناقص أو غير صالح");const payload={slug:String(r.slug),title:String(r.title),content:r.content,published:!!r.published,updated_at:new Date().toISOString()};const {error}=await db.from("site_content").upsert(payload,{onConflict:"slug"});if(error)throw error;}await loadRecords();setMessage("backup-message","اكتمل استيراد "+incoming.length+" سجل.");$("backup-file").value="";}catch(e){setMessage("backup-message","تعذر الاستيراد: "+e.message,true);}});

const blogType=(r)=>r?.content?.cmsType||"";
const slugFor=(kind,value)=>kind+"-"+value.trim().toLowerCase().replace(/[^a-z0-9-]+/g,"-").replace(/^-+|-+$/g,"");
function cmsRows(kind){return records.filter(r=>blogType(r)===kind);}
let postFilter="all";
let postPage=1;
const POSTS_PER_PAGE=10;
let selectedPostIds=new Set();
function postDate(r){const value=r.updated_at||r.created_at;return value?new Date(value).toLocaleDateString("ar",{year:"numeric",month:"short",day:"numeric"}):"—";}
function postLabels(r){return Array.isArray(r.content?.labels)?r.content.labels:[];}
function postSearchMatch(r,query){
 if(!query)return true;
 const terms=query.match(/(?:title|body|label|status):(?:"[^"]+"|[^\\s]+)|"[^"]+"|[^\\s]+/g)||[query];
 return terms.every(raw=>{
  let field="",value=raw;
  const colon=raw.indexOf(":");
  if(colon>0){field=raw.slice(0,colon).toLowerCase();value=raw.slice(colon+1);}
  value=value.replace(/^"|"$/g,"").toLowerCase();
  const title=(r.title||"").toLowerCase(),body=(r.content?.body||"").toLowerCase(),labels=postLabels(r).join(" ").toLowerCase();
  if(field==="title")return title.includes(value);
  if(field==="body")return body.includes(value);
  if(field==="label")return labels.includes(value);
  if(field==="status")return value==="draft"?!r.published:value==="published"?!!r.published:true;
  return (title+" "+body+" "+labels).includes(value);
 });
}
function filteredPosts(){
 let rows=cmsRows("post");
 if(postFilter==="published")rows=rows.filter(r=>r.published);
 if(postFilter==="draft")rows=rows.filter(r=>!r.published);
 const label=$("post-label-filter")?.value||"";
 if(label)rows=rows.filter(r=>postLabels(r).includes(label));
 const query=$("post-search-input")?.value.trim()||"";
 rows=rows.filter(r=>postSearchMatch(r,query));
 const sort=$("post-sort")?.value||"updated";
 rows.sort((a,b)=>sort==="title"?(a.title||"").localeCompare(b.title||"","ar"):new Date((sort==="created"?b.created_at||b.updated_at:b.updated_at||b.created_at)||0)-new Date((sort==="created"?a.created_at||a.updated_at:a.updated_at||a.created_at)||0));
 return rows;
}
function refreshPostLabels(){
 const select=$("post-label-filter"),chosen=select.value;
 const labels=[...new Set(cmsRows("post").flatMap(postLabels))].sort((a,b)=>a.localeCompare(b,"ar"));
 select.innerHTML='<option value="">كل التصنيفات</option>'+labels.map(x=>'<option value="'+escapeHtml(x)+'">'+escapeHtml(x)+'</option>').join("");
 select.value=labels.includes(chosen)?chosen:"";
}
function renderCmsList(kind,containerId,countId,filter="all"){
 if(kind==="post"){renderPostsTable();return;}
 const rows=cmsRows(kind).filter(r=>filter==="all"||(filter==="published"?r.published:!r.published));
 $(countId).textContent=rows.length+(kind==="post"?" مشاركة":" صفحة");
 $(containerId).innerHTML=rows.length?rows.map(r=>'<button type="button" class="blog-post-item" data-cms-id="'+escapeHtml(r.id)+'"><b>'+escapeHtml(r.title)+'</b><small>'+escapeHtml(r.slug)+'</small><span class="record-state '+(r.published?"":"draft")+'">'+(r.published?"منشورة":"مسودة")+'</span></button>').join(""):'<p class="admin-muted">لا توجد عناصر بعد. أنشئ أول عنصر.</p>';
 $(containerId).querySelectorAll("[data-cms-id]").forEach(b=>b.addEventListener("click",()=>kind==="post"?openPostEditor(b.dataset.cmsId):editPage(b.dataset.cmsId)));
}
function renderPostsTable(){
 const all=cmsRows("post"),rows=filteredPosts(),pages=Math.max(1,Math.ceil(rows.length/POSTS_PER_PAGE));
 postPage=Math.min(postPage,pages);
 $("post-count-all").textContent=all.length;
 $("post-count-published").textContent=all.filter(x=>x.published).length;
 $("post-count-draft").textContent=all.filter(x=>!x.published).length;
 refreshPostLabels();
 const begin=(postPage-1)*POSTS_PER_PAGE,visible=rows.slice(begin,begin+POSTS_PER_PAGE);
 $("posts-table-body").innerHTML=visible.length?visible.map(r=>{
  const labels=postLabels(r).map(x=>'<span class="post-label-chip">'+escapeHtml(x)+'</span>').join(" ")||'<span class="admin-muted">—</span>';
  return '<tr><td><input type="checkbox" class="post-row-check" data-post-check="'+escapeHtml(r.id)+'" '+(selectedPostIds.has(r.id)?"checked":"")+'></td><td class="post-title-cell"><button type="button" class="post-title-button" data-edit-post="'+escapeHtml(r.id)+'">'+escapeHtml(r.title)+'</button><small>'+escapeHtml(r.slug.replace(/^post-/,""))+'</small></td><td>'+labels+'</td><td><span class="record-state '+(r.published?"":"draft")+'">'+(r.published?"منشورة":"مسودة")+'</span></td><td class="post-date-cell">'+postDate(r)+'</td><td><div class="post-row-actions"><button type="button" data-edit-post="'+escapeHtml(r.id)+'" title="تعديل"><i class="fa-solid fa-pen"></i></button><button type="button" data-toggle-post="'+escapeHtml(r.id)+'" title="'+(r.published?"تحويل إلى مسودة":"نشر")+'"><i class="fa-solid '+(r.published?"fa-eye-slash":"fa-paper-plane")+'"></i></button><button type="button" class="delete-row" data-delete-post="'+escapeHtml(r.id)+'" title="حذف"><i class="fa-solid fa-trash"></i></button></div></td></tr>';
 }).join(""):'<tr><td colspan="6" class="posts-empty">لا توجد مشاركات تطابق البحث أو عوامل التصفية.</td></tr>';
 $("posts-page-summary").textContent=rows.length?("عرض "+(begin+1)+"–"+Math.min(begin+POSTS_PER_PAGE,rows.length)+" من "+rows.length+" مشاركة"):"0 مشاركة";
 $("posts-prev-page").disabled=postPage<=1;$("posts-next-page").disabled=postPage>=pages;
 $("posts-select-all").checked=visible.length>0&&visible.every(r=>selectedPostIds.has(r.id));
 $("posts-selection-count").textContent=selectedPostIds.size?("تم تحديد "+selectedPostIds.size+" مشاركة"):"لم يتم تحديد أي مشاركة";
 $("posts-table-body").querySelectorAll("[data-edit-post]").forEach(b=>b.addEventListener("click",()=>openPostEditor(b.dataset.editPost)));
 $("posts-table-body").querySelectorAll("[data-toggle-post]").forEach(b=>b.addEventListener("click",()=>togglePostStatus(b.dataset.togglePost)));
 $("posts-table-body").querySelectorAll("[data-delete-post]").forEach(b=>b.addEventListener("click",()=>deletePostById(b.dataset.deletePost)));
 $("posts-table-body").querySelectorAll("[data-post-check]").forEach(b=>b.addEventListener("change",()=>{b.checked?selectedPostIds.add(b.dataset.postCheck):selectedPostIds.delete(b.dataset.postCheck);renderPostsTable();}));
}

function showPostEditor(showEditor){$("posts-manager-view").classList.toggle("hidden",showEditor);$("post-editor-view").classList.toggle("hidden",!showEditor);if(showEditor)window.scrollTo({top:0,behavior:"smooth"});}
function openPostEditor(id){const target="/post-editor.html"+(id?"?id="+encodeURIComponent(id):"");window.location.href=target;}
function resetPost(){ $("post-form").reset();$("post-id").value="";$("post-editor-heading").textContent="مشاركة جديدة";$("post-editor-page-title").textContent="مشاركة جديدة";$("post-editor-state").textContent="مسودة جديدة";$("post-delete").disabled=true;setMessage("post-message","");}
function editPost(id){const r=records.find(x=>x.id===id);if(!r)return;const c=r.content||{};$("post-id").value=r.id;$("post-title").value=r.title;$("post-editor-page-title").textContent="تعديل المشاركة";$("post-slug").value=r.slug.replace(/^post-/,"");$("post-labels").value=(c.labels||[]).join(", ");$("post-excerpt").value=c.excerpt||"";$("post-body").value=c.body||"";$("post-published").checked=!!r.published;$("post-editor-heading").textContent="تعديل المشاركة";$("post-editor-state").textContent=r.published?"منشورة":"مسودة";$("post-delete").disabled=false;setMessage("post-message","");}
async function saveCms(kind,form){const id=$(kind+"-id").value;const rawSlug=$(kind+"-slug").value.trim();const slug=slugFor(kind,rawSlug);const title=$(kind+"-title").value.trim();const body=kind==="page"&&$("page-rich-editor")?$("page-rich-editor").innerHTML:$(kind+"-body").value;const published=$(kind+"-published").checked;if(!rawSlug||!title||!body.trim())return setMessage(kind+"-message","أكمل العنوان والرابط والمحتوى.",true);const content=kind==="post"?{cmsType:"post",body,excerpt:$("post-excerpt").value.trim(),labels:$("post-labels").value.split(",").map(x=>x.trim()).filter(Boolean)}:{cmsType:"page",body};const payload={slug,title,content,published,updated_at:new Date().toISOString()};const req=id?db.from("site_content").update(payload).eq("id",id).select().single():db.from("site_content").insert(payload).select().single();const {data,error}=await req;if(error)return setMessage(kind+"-message","تعذر الحفظ: "+error.message,true);await loadRecords();if(kind==="post"){editPost(data.id);selectedPostIds.delete(data.id);showPostEditor(false);renderPostsTable();}else{editPage(data.id);renderCmsList("page","pages-list","pages-count");}setMessage(kind+"-message","تم حفظ "+(kind==="post"?"المشاركة":"الصفحة")+" بنجاح.");}
async function togglePostStatus(id){const r=records.find(x=>x.id===id);if(!r)return;const {error}=await db.from("site_content").update({published:!r.published,updated_at:new Date().toISOString()}).eq("id",id);if(error)return setMessage("post-message","تعذر تحديث الحالة: "+error.message,true);await loadRecords();renderPostsTable();}
async function deletePostById(id){if(!confirm("هل تريد حذف هذه المشاركة نهائياً؟"))return;const {error}=await db.from("site_content").delete().eq("id",id);if(error)return setMessage("post-message","تعذر الحذف: "+error.message,true);selectedPostIds.delete(id);await loadRecords();renderPostsTable();}
async function applyBulkPostAction(){const action=$("posts-bulk-action").value,ids=[...selectedPostIds];if(!action)return setMessage("post-message","اختر إجراءً جماعياً أولاً.",true);if(!ids.length)return setMessage("post-message","حدد مشاركة واحدة على الأقل.",true);if(action==="delete"&&!confirm("سيتم حذف "+ids.length+" مشاركة نهائياً. هل تريد المتابعة؟"))return;try{for(const id of ids){const row=records.find(r=>r.id===id);if(!row)continue;let result;if(action==="publish"||action==="draft")result=await db.from("site_content").update({published:action==="publish",updated_at:new Date().toISOString()}).eq("id",id);else if(action==="delete")result=await db.from("site_content").delete().eq("id",id);else if(action==="add-label"){const label=$("posts-bulk-label").value.trim();if(!label)return setMessage("post-message","اكتب اسم التصنيف قبل التطبيق.",true);const labels=[...new Set([...postLabels(row),label])];result=await db.from("site_content").update({content:{...(row.content||{}),labels},updated_at:new Date().toISOString()}).eq("id",id);}if(result?.error)throw result.error;}selectedPostIds.clear();$("posts-bulk-action").value="";$("posts-bulk-label").value="";$("posts-bulk-label").classList.add("hidden");await loadRecords();renderPostsTable();setMessage("post-message","تم تنفيذ الإجراء الجماعي بنجاح.");}catch(error){setMessage("post-message","تعذر إكمال الإجراء: "+error.message,true);}}
function resetPage(){$("page-form").reset();if($("page-rich-editor"))$("page-rich-editor").innerHTML="";$("page-id").value="";$("page-editor-heading").textContent="إنشاء صفحة";$("page-editor-state").textContent="مسودة جديدة";$("page-delete").disabled=true;setMessage("page-message","");}
function editPage(id){const r=records.find(x=>x.id===id);if(!r)return;$("page-id").value=r.id;$("page-title").value=r.title;$("page-slug").value=r.slug.replace(/^page-/,"");$("page-body").value=r.content?.body||"";if($("page-rich-editor"))$("page-rich-editor").innerHTML=r.content?.body||"";$("page-published").checked=!!r.published;$("page-editor-heading").textContent="تعديل الصفحة";$("page-editor-state").textContent=r.published?"منشورة":"مسودة";$("page-delete").disabled=false;setMessage("page-message","");}
async function deleteCms(kind){const id=$(kind+"-id").value;if(!id||!confirm("هل تريد حذف هذا العنصر نهائياً؟"))return;const {error}=await db.from("site_content").delete().eq("id",id);if(error)return setMessage(kind+"-message","تعذر الحذف: "+error.message,true);await loadRecords();kind==="post"?resetPost():resetPage();if(kind==="post"){showPostEditor(false);renderPostsTable();}else renderCmsList("page","pages-list","pages-count");setMessage(kind+"-message","تم الحذف.");}
function currentSettings(){return records.find(r=>r.slug==="site-settings")?.content||{};}
async function saveSettingsPatch(patch,messageId){const row=records.find(r=>r.slug==="site-settings");if(!row)return setMessage(messageId,"لم يتم العثور على إعدادات الموقع.",true);const {error}=await db.from("site_content").update({content:{...currentSettings(),...patch},updated_at:new Date().toISOString()}).eq("id",row.id);if(error)return setMessage(messageId,"تعذر الحفظ: "+error.message,true);await loadRecords();await loadSiteSettings();setMessage(messageId,"تم الحفظ بنجاح.");}
function loadAdvancedSettings(){const s=currentSettings();$("layout-show-builds").checked=s.showBuilds!==false;$("layout-show-echoes").checked=s.showEchoes!==false;$("layout-show-characters").checked=s.showCharacters!==false;$("layout-show-profile").checked=s.showProfile!==false;$("layout-order").value=(s.layoutOrder||["builds","echoes","characters","profile"]).join(", ");$("theme-primary").value=s.themePrimary||"#72d7e7";$("theme-secondary").value=s.themeSecondary||"#8dbbff";$("theme-mode").value=s.themeMode||"dark";renderReading();}
function renderReading(){const items=currentSettings().readingList||[];$("reading-list").innerHTML=items.map((x,i)=>'<div class="reading-item"><a href="'+escapeHtml(x.url)+'" target="_blank" rel="noopener">'+escapeHtml(x.title)+'</a><button type="button" data-remove-reading="'+i+'">حذف</button></div>').join("")||'<p class="admin-muted">قائمة القراءة فارغة.</p>';$("reading-list").querySelectorAll("[data-remove-reading]").forEach(b=>b.addEventListener("click",async()=>{const next=[...(currentSettings().readingList||[])];next.splice(Number(b.dataset.removeReading),1);await saveSettingsPatch({readingList:next},"reading-message");}));}
document.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>{switchAdminView(b.dataset.view);if(b.dataset.view==="posts")renderCmsList("post","posts-list","posts-count",postFilter);if(b.dataset.view==="pages")renderCmsList("page","pages-list","pages-count");if(["layout","theme","reading"].includes(b.dataset.view))loadAdvancedSettings();}));
$("post-create").addEventListener("click",()=>openPostEditor(null));$("quick-new-post").addEventListener("click",()=>{switchAdminView("posts");openPostEditor(null);});
$("post-editor-back").addEventListener("click",()=>{showPostEditor(false);renderPostsTable();});
$("post-form").addEventListener("submit",e=>{e.preventDefault();saveCms("post",e.currentTarget);});
$("post-reset").addEventListener("click",()=>openPostEditor(null));$("post-delete").addEventListener("click",()=>deleteCms("post"));
document.querySelectorAll("[data-post-filter]").forEach(b=>b.addEventListener("click",()=>{postFilter=b.dataset.postFilter;postPage=1;document.querySelectorAll("[data-post-filter]").forEach(x=>x.classList.toggle("active",x===b));renderPostsTable();}));
$("post-search-input").addEventListener("input",()=>{postPage=1;renderPostsTable();});
$("post-label-filter").addEventListener("change",()=>{postPage=1;renderPostsTable();});
$("post-sort").addEventListener("change",()=>{postPage=1;renderPostsTable();});
$("posts-prev-page").addEventListener("click",()=>{postPage=Math.max(1,postPage-1);renderPostsTable();});
$("posts-next-page").addEventListener("click",()=>{postPage++;renderPostsTable();});
$("posts-select-all").addEventListener("change",e=>{const start=(postPage-1)*POSTS_PER_PAGE;filteredPosts().slice(start,start+POSTS_PER_PAGE).forEach(r=>e.target.checked?selectedPostIds.add(r.id):selectedPostIds.delete(r.id));renderPostsTable();});
$("posts-bulk-action").addEventListener("change",e=>$("posts-bulk-label").classList.toggle("hidden",e.target.value!=="add-label"));
$("posts-bulk-apply").addEventListener("click",applyBulkPostAction);
$("post-form").addEventListener("submit",e=>{e.preventDefault();saveCms("post",e.currentTarget);});
$("post-reset").addEventListener("click",resetPost);$("post-delete").addEventListener("click",()=>deleteCms("post"));
document.querySelectorAll("[data-post-filter]").forEach(b=>b.addEventListener("click",()=>{postFilter=b.dataset.postFilter;document.querySelectorAll("[data-post-filter]").forEach(x=>x.classList.toggle("active",x===b));renderCmsList("post","posts-list","posts-count",postFilter);}));
$("page-create").addEventListener("click",resetPage);$("page-form").addEventListener("submit",e=>{e.preventDefault();saveCms("page",e.currentTarget);});$("page-reset").addEventListener("click",resetPage);$("page-delete").addEventListener("click",()=>deleteCms("page"));
$("layout-form").addEventListener("submit",e=>{e.preventDefault();saveSettingsPatch({showBuilds:$("layout-show-builds").checked,showEchoes:$("layout-show-echoes").checked,showCharacters:$("layout-show-characters").checked,showProfile:$("layout-show-profile").checked,layoutOrder:$("layout-order").value.split(",").map(x=>x.trim()).filter(Boolean)},"layout-message");});
$("theme-form").addEventListener("submit",e=>{e.preventDefault();saveSettingsPatch({themePrimary:$("theme-primary").value,themeSecondary:$("theme-secondary").value,themeMode:$("theme-mode").value},"theme-message");});
$("reading-form").addEventListener("submit",e=>{e.preventDefault();const list=[...(currentSettings().readingList||[]),{title:$("reading-title").value.trim(),url:$("reading-url").value.trim()}];saveSettingsPatch({readingList:list},"reading-message").then(()=>$("reading-form").reset());});


// Responsive off-canvas navigation for phones and tablets.
(function setupSidebarDrawer(){
 const app=$("admin-app"),toggle=$("sidebar-toggle"),backdrop=$("sidebar-backdrop");
 if(!app||!toggle||!backdrop)return;
 const close=()=>{app.classList.remove("sidebar-open");toggle.setAttribute("aria-expanded","false");document.body.style.overflow="";};
 const open=()=>{app.classList.add("sidebar-open");toggle.setAttribute("aria-expanded","true");document.body.style.overflow="hidden";};
 toggle.addEventListener("click",()=>app.classList.contains("sidebar-open")?close():open());
 backdrop.addEventListener("click",close);
 document.querySelectorAll(".admin-nav-item").forEach(item=>item.addEventListener("click",close));
 document.addEventListener("keydown",event=>{if(event.key==="Escape")close();});
 window.addEventListener("resize",()=>{if(window.innerWidth>950)close();});
})();


// Visual character editor — keeps the existing Supabase record schema intact.
let ceRoster = [], ceGuides = {}, ceCurrentName = "";
const ce = id => document.getElementById(id);
function ceLines(value){return Array.isArray(value)?value.join("\n"):"";}
function ceParseArray(id,label){const raw=ce(id).value.trim();if(!raw)return [];try{const v=JSON.parse(raw);if(!Array.isArray(v))throw new Error("يجب أن تكون القيمة قائمة JSON.");return v;}catch(e){throw new Error(label+": "+e.message);}}
function ceJson(value){return JSON.stringify(value??[],null,2);}
function renderCharacterManager(){
 const rosterRecord=records.find(r=>r.slug==="characters-roster");
 const guidesRecord=records.find(r=>r.slug==="character-guides");
 ceRoster=Array.isArray(rosterRecord?.content)?rosterRecord.content:[];
 ceGuides=guidesRecord?.content&&typeof guidesRecord.content==="object"?guidesRecord.content:{};
 const select=ce("character-editor-select");if(!select)return;
 const chosen=select.value||ceCurrentName;
 select.innerHTML='<option value="">اختر شخصية…</option>'+ceRoster.map(c=>'<option value="'+escapeHtml(c.name)+'">'+escapeHtml(c.name)+'</option>').join("");
 if(ceRoster.some(c=>c.name===chosen))select.value=chosen;else if(ceRoster.length)select.value=ceRoster[0].name;
 if(select.value)loadCharacterIntoEditor(select.value);
}
function loadCharacterIntoEditor(name){
 const c=ceRoster.find(x=>x.name===name);if(!c)return;
 ceCurrentName=name;const g=ceGuides[name]||{};
 const known=["role","summary","kit","skills","passives","teams","echoSet","echoOptions","mainEcho","mainStats","subStats","recommendedStats","skillPriority","rotation","advancedRotation","sequences","source","sourceName","sourceLastVerified","voiceActors","notes","materials","baseStats","minorFortes","review"];
 ce("ce-name").value=c.name||"";ce("ce-element").value=c.element||"";ce("ce-rarity").value=String(c.rarity||5);
 ce("ce-role").value=g.role||"";ce("ce-image").value=c.image||"";if(ce("ce-rich-editor"))ce("ce-rich-editor").innerHTML=g.richContent||"";
 ce("ce-summary").value=g.summary||"";ce("ce-kit").value=g.kit||"";
 ce("ce-skills").value=ceJson(g.skills);ce("ce-passives").value=ceJson(g.passives);
 ce("ce-teams").value=ceLines(g.teams);ce("ce-echo-set").value=g.echoSet||"";ce("ce-main-echo").value=g.mainEcho||"";
 ce("ce-echo-options").value=ceJson(g.echoOptions);ce("ce-main-stats").value=g.mainStats||"";ce("ce-sub-stats").value=g.subStats||"";
 ce("ce-recommended-stats").value=ceLines(g.recommendedStats);ce("ce-skill-priority").value=ceLines(g.skillPriority);
 ce("ce-rotation").value=g.rotation||"";ce("ce-advanced-rotation").value=g.advancedRotation||"";
 ce("ce-sequences").value=ceJson(g.sequences);ce("ce-source").value=g.source||"";ce("ce-source-name").value=g.sourceName||"";
 ce("ce-source-verified").value=g.sourceLastVerified||"";ce("ce-voice-actors").value=ceLines(g.voiceActors);
 ce("ce-notes").value=g.notes||"";ce("ce-materials").value=JSON.stringify(g.materials||{},null,2);
 ce("ce-base-stats").value=JSON.stringify(g.baseStats||{},null,2);
 const extra={};Object.entries(g).forEach(([k,v])=>{if(!known.includes(k))extra[k]=v;});
 ce("ce-extra").value=JSON.stringify(extra,null,2);updateCharacterImagePreview();
 setMessage("character-editor-message","تم تحميل بيانات "+name+".",false);
}
function updateCharacterImagePreview(){const img=ce("ce-image-preview");const url=ce("ce-image").value.trim();img.src=url;img.classList.toggle("visible",!!url);img.onerror=()=>img.classList.remove("visible");}
ce("character-editor-select")?.addEventListener("change",e=>loadCharacterIntoEditor(e.target.value));
ce("character-editor-refresh")?.addEventListener("click",async()=>{await loadRecords();renderCharacterManager();setMessage("character-editor-message","تم تحديث قائمة الشخصيات.");});
ce("ce-image")?.addEventListener("input",updateCharacterImagePreview);
ce("ce-upload-image")?.addEventListener("click",async()=>{
 const file=ce("ce-image-file").files[0];if(!file)return setMessage("character-editor-message","اختر صورة أولاً.",true);
 if(!/^image\/(png|jpeg|webp|gif)$/.test(file.type)||file.size>5*1024*1024)return setMessage("character-editor-message","الصيغ PNG/JPG/WEBP/GIF وبحد أقصى 5MB.",true);
 const safe=file.name.toLowerCase().replace(/[^a-z0-9._-]+/g,"-");const path="characters/"+Date.now()+"-"+safe;
 setMessage("character-editor-message","جارٍ رفع الصورة…");
 const {error}=await db.storage.from("site-media").upload(path,file,{cacheControl:"3600",upsert:false});
 if(error)return setMessage("character-editor-message","فشل الرفع: "+error.message,true);
 const {data}=db.storage.from("site-media").getPublicUrl(path);ce("ce-image").value=data.publicUrl;updateCharacterImagePreview();ce("ce-image-file").value="";
 setMessage("character-editor-message","تم رفع الصورة وربطها بالشخصية. احفظ التغييرات لتثبيتها.");
});
ce("ce-reset")?.addEventListener("click",()=>loadCharacterIntoEditor(ceCurrentName));
ce("character-editor-preview")?.addEventListener("click",()=>{
 const name=ce("ce-name").value.trim();const url=ce("ce-image").value.trim();
 ce("character-editor-preview-content").innerHTML='<div class="ce-preview-head">'+(url?'<img src="'+escapeHtml(url)+'" alt="">':'')+'<div><h3>'+escapeHtml(name)+'</h3><p>'+escapeHtml(ce("ce-role").value)+' · '+escapeHtml(ce("ce-element").value)+' · '+escapeHtml(ce("ce-rarity").value)+'★</p></div></div><p>'+escapeHtml(ce("ce-summary").value)+'</p><p>'+escapeHtml(ce("ce-kit").value)+'</p>';
 ce("character-editor-preview-panel").classList.remove("hidden");
});
ce("character-editor-form")?.addEventListener("submit",async event=>{
 event.preventDefault();const oldName=ceCurrentName;const newName=ce("ce-name").value.trim();
 if(!newName)return setMessage("character-editor-message","اسم الشخصية مطلوب.",true);
 let skills,passives,echoOptions,sequences,materials,baseStats,extra;
 try{
  skills=ceParseArray("ce-skills","المهارات");passives=ceParseArray("ce-passives","المهارات السلبية");
  echoOptions=ceParseArray("ce-echo-options","خيارات Echo");sequences=ceParseArray("ce-sequences","العقد");
  materials=JSON.parse(ce("ce-materials").value||"{}");baseStats=JSON.parse(ce("ce-base-stats").value||"{}");extra=JSON.parse(ce("ce-extra").value||"{}");
  if(!materials||Array.isArray(materials)||typeof materials!=="object")throw new Error("مواد التطوير يجب أن تكون كائن JSON.");
  if(!baseStats||Array.isArray(baseStats)||typeof baseStats!=="object")throw new Error("الإحصائيات الأساسية يجب أن تكون كائن JSON.");
  if(!extra||Array.isArray(extra)||typeof extra!=="object")throw new Error("البيانات الإضافية يجب أن تكون كائن JSON.");
 }catch(error){return setMessage("character-editor-message","تحقق من البيانات: "+error.message,true);}
 const roster=ceRoster.map(c=>c.name===oldName?{...c,name:newName,element:ce("ce-element").value,rarity:Number(ce("ce-rarity").value),image:ce("ce-image").value.trim()}:c);
 const previous={...(ceGuides[oldName]||{})};
 const guide={...previous,...extra,role:ce("ce-role").value.trim(),summary:ce("ce-summary").value.trim(),kit:ce("ce-kit").value.trim(),richContent:ce("ce-rich-editor")?.innerHTML||"",
 skills,passives,teams:ce("ce-teams").value.split("\n").map(x=>x.trim()).filter(Boolean),echoSet:ce("ce-echo-set").value.trim(),
 echoOptions,mainEcho:ce("ce-main-echo").value.trim(),mainStats:ce("ce-main-stats").value.trim(),subStats:ce("ce-sub-stats").value.trim(),
 recommendedStats:ce("ce-recommended-stats").value.split("\n").map(x=>x.trim()).filter(Boolean),
 skillPriority:ce("ce-skill-priority").value.split("\n").map(x=>x.trim()).filter(Boolean),
 rotation:ce("ce-rotation").value.trim(),advancedRotation:ce("ce-advanced-rotation").value.trim(),sequences,
 source:ce("ce-source").value.trim(),sourceName:ce("ce-source-name").value.trim(),sourceLastVerified:ce("ce-source-verified").value.trim(),
 voiceActors:ce("ce-voice-actors").value.split("\n").map(x=>x.trim()).filter(Boolean),notes:ce("ce-notes").value.trim(),materials,baseStats};
 const guides={...ceGuides};if(oldName!==newName)delete guides[oldName];guides[newName]=guide;
 const rosterRow=records.find(r=>r.slug==="characters-roster"),guideRow=records.find(r=>r.slug==="character-guides");
 if(!rosterRow||!guideRow)return setMessage("character-editor-message","لم يتم العثور على سجلي قائمة الشخصيات أو الأدلة. لم تُحفظ أي تغييرات.",true);
 const btn=event.submitter;if(btn)btn.disabled=true;
 const [rosterSave,guideSave]=await Promise.all([
  db.from("site_content").update({content:roster,updated_at:new Date().toISOString()}).eq("id",rosterRow.id),
  db.from("site_content").update({content:guides,updated_at:new Date().toISOString()}).eq("id",guideRow.id)
 ]);
 if(btn)btn.disabled=false;
 if(rosterSave.error||guideSave.error)return setMessage("character-editor-message","تعذر الحفظ: "+(rosterSave.error||guideSave.error).message,true);
 ceCurrentName=newName;await loadRecords();ce("character-editor-select").value=newName;loadCharacterIntoEditor(newName);
 setMessage("character-editor-message","تم حفظ بيانات "+newName+" بنجاح.");
});


// Character data is loaded by switchAdminView() whenever the section is opened.


// Rich text controls for static pages and character information.
(function setupRichEditors(){
 function editorFor(toolbar){return document.getElementById(toolbar.dataset.editorToolbar);}
 document.querySelectorAll("[data-editor-toolbar]").forEach(toolbar=>{
  const editor=editorFor(toolbar);if(!editor)return;
  toolbar.querySelectorAll("[data-rich-cmd]").forEach(button=>button.addEventListener("click",()=>{
   editor.focus();document.execCommand(button.dataset.richCmd,false,null);
  }));
  toolbar.querySelectorAll("[data-rich-block]").forEach(button=>button.addEventListener("click",()=>{
   editor.focus();document.execCommand("formatBlock",false,"<"+button.dataset.richBlock+">");
  }));
  toolbar.querySelector("[data-rich-link]")?.addEventListener("click",()=>{
   const url=prompt("أدخل رابطاً يبدأ بـ https:// أو http://");
   if(url&&/^https?:\/\//i.test(url)){editor.focus();document.execCommand("createLink",false,url);}
  });
  const fileInput=toolbar.querySelector("[data-rich-file]");
  toolbar.querySelector("[data-rich-image]")?.addEventListener("click",()=>{
   const url=prompt("أدخل رابط الصورة، أو ألغِ لإضافة صورة من جهازك.");
   if(url){if(/^https?:\/\//i.test(url)){editor.focus();document.execCommand("insertImage",false,url);}else alert("الرابط يجب أن يبدأ بـ https:// أو http://");}
   else fileInput?.click();
  });
  fileInput?.addEventListener("change",async()=>{
   const file=fileInput.files?.[0];if(!file)return;
   if(!/^image\/(png|jpeg|webp|gif)$/.test(file.type)||file.size>5*1024*1024){alert("اختر PNG أو JPG أو WEBP أو GIF بحجم أقل من 5MB.");fileInput.value="";return;}
   const path="rich-content/"+Date.now()+"-"+file.name.toLowerCase().replace(/[^a-z0-9._-]+/g,"-");
   const {error}=await db.storage.from("site-media").upload(path,file,{cacheControl:"3600",upsert:false});
   if(error){alert("تعذر رفع الصورة: "+error.message);return;}
   const {data}=db.storage.from("site-media").getPublicUrl(path);
   editor.focus();document.execCommand("insertImage",false,data.publicUrl);fileInput.value="";
  });
 });
 const pageEditor=$("page-rich-editor"),pageBody=$("page-body");
 if(pageEditor&&pageBody){pageEditor.addEventListener("input",()=>pageBody.value=pageEditor.innerHTML);$("page-form").addEventListener("submit",()=>pageBody.value=pageEditor.innerHTML);}
})();
