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
async function renderSession(session) {
  show("auth-panel", !session);
  show("setup-panel", false);
  show("admin-app", false);
  if (!session) return;
  try {
    const admin = await checkAdmin();
    if (!admin) {
      show("setup-panel", true);
      return;
    }
    show("admin-app", true);
    await loadRecords();
    await loadSiteSettings();
  } catch (error) {
    show("auth-panel", true);
    setMessage("auth-message", "تعذر التحقق من الصلاحيات: " + error.message, true);
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
