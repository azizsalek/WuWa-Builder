const KEY="wuwabuilder.v1";
const state=load();
const titles={dashboard:"لوحة التحكم",builds:"تقييم Builds",echoes:"محلل Echoes",characters:"الشخصيات",profile:"ملف اللاعب"};
function load(){try{return JSON.parse(localStorage.getItem(KEY))||{builds:[],echoes:[],characters:[],profile:{name:""}}}catch{return {builds:[],echoes:[],characters:[],profile:{name:""}}}}
function save(){localStorage.setItem(KEY,JSON.stringify(state));renderAll()}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function go(view){document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===view));document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===view));document.getElementById("page-title").textContent=titles[view]||"WuWa Builder";window.scrollTo({top:0,behavior:"smooth"})}
document.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>go(b.dataset.view)));
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>go(b.dataset.go)));
function num(id){const v=document.getElementById(id).value;return v===""?null:Number(v)}
function evaluateBuild(b){
 const checks=[b.atk,b.cr,b.cd,b.er,b.element].filter(v=>v!==null).length;
 const completeness=Math.round(checks/5*100);
 const notes=[];
 if(b.cr!==null) notes.push(b.cr<50?"معدل Crit Rate منخفض نسبياً؛ راجع احتياج الشخصية.":b.cr>85?"Crit Rate مرتفع؛ تأكد من عدم التضحية بإحصائيات مهمة أخرى.":"Crit Rate ضمن نطاق متوازن مبدئياً.");
 if(b.cd!==null&&b.cr!==null) notes.push("نسبة Crit DMG إلى Crit Rate تحتاج إلى تقييم حسب الشخصية والسلاح والـ Echoes.");
 if(b.er!==null) notes.push("احتياج Energy Regen يختلف حسب الشخصية والروتيشن؛ لا يوجد هدف موحد لكل الشخصيات.");
 return {score:completeness,notes};
}
document.getElementById("build-form").addEventListener("submit",e=>{
 e.preventDefault();
 const b={id:Date.now(),name:document.getElementById("build-name").value.trim(),weapon:document.getElementById("weapon-type").value,set:document.getElementById("echo-set").value,atk:num("atk"),hp:num("hp"),def:num("def"),cr:num("cr"),cd:num("cd"),er:num("er"),element:num("element"),date:new Date().toLocaleDateString("ar")};
 if(b.cr!==null&&(b.cr<0||b.cr>100)){alert("Crit Rate يجب أن يكون بين 0 و100.");return}
 const report=evaluateBuild(b);b.score=report.score;b.notes=report.notes;state.builds.unshift(b);save();
 const box=document.getElementById("build-result");box.classList.remove("hidden");box.innerHTML=`<h3>تقرير البناء: ${esc(b.name)}</h3><div class="score-line"><span class="score">${report.score}%</span><b>اكتمال البيانات المدخلة</b></div><p>${report.notes.map(esc).join("<br>")||"أدخل مزيداً من الإحصائيات للحصول على ملاحظات."}</p><p>هذا المؤشر يقيس اكتمال البيانات فقط، ولا يمثل نسبة قوة أو ضرر الشخصية.</p>`;
 e.target.reset();
});
document.getElementById("echo-form").addEventListener("submit",e=>{
 e.preventDefault();
 const subs=[1,2,3,4,5].map(i=>document.getElementById("sub"+i).value.trim()).filter(Boolean);
 const item={id:Date.now(),name:document.getElementById("echo-name").value.trim(),cost:document.getElementById("echo-cost").value,main:document.getElementById("echo-main").value.trim(),subs,date:new Date().toLocaleDateString("ar")};
 state.echoes.unshift(item);save();
 const box=document.getElementById("echo-result");box.classList.remove("hidden");box.innerHTML=`<h3>تم تسجيل ${esc(item.name)}</h3><div class="score-line"><span class="score">${subs.length}/5</span><b>إحصائيات فرعية مسجلة</b></div><p>تم حفظ الـ Echo. لا نصدر حكماً على جودته حالياً لأن قيمة كل Sub Stat وأهميتها تختلف حسب الشخصية والبناء.</p>`;
 e.target.reset();
});
document.getElementById("character-form").addEventListener("submit",e=>{
 e.preventDefault();state.characters.unshift({id:Date.now(),name:document.getElementById("character-name").value.trim(),element:document.getElementById("character-element").value.trim(),weapon:document.getElementById("character-weapon").value.trim()});save();e.target.reset();
});
function removeItem(type,id){if(!confirm("هل تريد حذف هذا العنصر؟"))return;state[type]=state[type].filter(x=>x.id!==id);save()}
function renderList(id,items,type,meta){const el=document.getElementById(id);if(!items.length){el.className="saved-list empty-state";el.textContent=type==="builds"?"لم تحفظ أي بناء بعد.":"لم تحفظ أي Echo بعد.";return}el.className="saved-list";el.innerHTML=items.map(x=>`<article class="saved-item"><div><b>${esc(x.name)}</b><small>${meta(x)}</small></div><button data-delete="${type}:${x.id}">حذف</button></article>`).join("");el.querySelectorAll("[data-delete]").forEach(btn=>btn.addEventListener("click",()=>{const [t,i]=btn.dataset.delete.split(":");removeItem(t,Number(i))}))}
function renderAll(){
 document.getElementById("stat-builds").textContent=state.characters.length;
 document.getElementById("stat-echoes").textContent=state.echoes.length;
 document.getElementById("stat-saved").textContent=state.builds.length;
 renderList("build-list",state.builds,"builds",x=>`اكتمال البيانات ${x.score}% • ${esc(x.weapon||"نوع السلاح غير محدد")} • ${esc(x.date)}`);
 renderList("echo-list",state.echoes,"echoes",x=>`${x.cost} Cost • ${x.subs.length}/5 Sub Stats • ${esc(x.date)}`);
 const c=document.getElementById("character-list");
 c.innerHTML=state.characters.length?state.characters.map(x=>`<article class="character-card"><div class="char-symbol">♙</div><b>${esc(x.name)}</b><small>${esc(x.element||"العنصر غير محدد")} • ${esc(x.weapon||"السلاح غير محدد")}</small><p><button class="secondary" data-char-del="${x.id}">حذف</button></p></article>`).join(""):'<div class="empty-state">لم تضف شخصيات بعد.</div>';
 c.querySelectorAll("[data-char-del]").forEach(b=>b.addEventListener("click",()=>{state.characters=state.characters.filter(x=>x.id!==Number(b.dataset.charDel));save()}));
 document.getElementById("display-name").value=state.profile.name||"";
 document.getElementById("profile-name").textContent=state.profile.name||"لاعب زائر";
}
document.getElementById("save-profile").addEventListener("click",()=>{state.profile.name=document.getElementById("display-name").value.trim();save();alert("تم حفظ اسم العرض على هذا الجهاز.")});
document.getElementById("export-data").addEventListener("click",()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="wuwa-builder-backup.json";a.click();URL.revokeObjectURL(a.href)});
document.getElementById("clear-data").addEventListener("click",()=>{if(!confirm("سيتم حذف كل البناءات والـ Echoes والشخصيات المحفوظة محلياً. هل أنت متأكد؟"))return;localStorage.removeItem(KEY);location.reload()});
renderAll();
