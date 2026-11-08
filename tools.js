(() => {
  const root = document.getElementById("tools-app");
  if (!root) return;
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const num = (id, fallback=0) => { const n=Number(document.getElementById(id)?.value); return Number.isFinite(n)?n:fallback; };
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  const fmt=v=>new Intl.NumberFormat(undefined,{maximumFractionDigits:0}).format(v);
  const pct=v=>Number(v).toFixed(1)+"%";
  root.innerHTML =
    '<div class="tools-intro"><div><span class="eyebrow">RESONATOR WORKSHOP</span><h2>أدوات بناء الشخصيات</h2><p>أدوات عملية لمقارنة الإحصائيات وتقدير الضرر وتنظيم الفرق. النتائج تقديرية وليست محاكاة رسمية لمحرك اللعبة.</p></div><span class="tools-mark">✦</span></div>'+
    '<div class="tool-tabs" role="tablist" aria-label="أدوات WuWa Builder">'+
    '<button class="tool-tab active" type="button" data-tool-tab="build">Build Rating</button><button class="tool-tab" type="button" data-tool-tab="damage">Damage Calculator</button><button class="tool-tab" type="button" data-tool-tab="echo">Echo Score</button><button class="tool-tab" type="button" data-tool-tab="team">Team Builder</button></div>'+
    '<section class="tool-panel active" data-tool-panel="build"><div class="tool-heading"><div><span class="eyebrow">BUILD ANALYSIS</span><h3>تقييم إحصائيات الشخصية</h3><p>أدخل إحصائياتك للحصول على مؤشر إرشادي يوضح توازن البناء.</p></div><span class="tool-icon">◈</span></div>'+
    '<form id="build-rating-form" class="tool-form"><label class="field">اسم الشخصية<input id="build-character" list="wuwa-character-options" placeholder="مثال: Jiyan"></label><label class="field">Crit Rate %<input id="build-cr" type="number" min="0" max="100" step="0.1" value="70"></label><label class="field">Crit DMG %<input id="build-cd" type="number" min="0" max="400" step="0.1" value="140"></label><label class="field">Energy Regen %<input id="build-er" type="number" min="0" max="300" step="0.1" value="120"></label><label class="field">ATK Bonus %<input id="build-atk" type="number" min="0" max="200" step="0.1" value="50"></label><label class="field">Damage Bonus %<input id="build-dmg" type="number" min="0" max="200" step="0.1" value="40"></label><div class="tool-actions wide"><button class="primary" type="submit">احسب التقييم</button><button class="secondary" type="reset">إعادة ضبط</button></div></form>'+
    '<div id="build-rating-result" class="tool-result" aria-live="polite"><div class="empty-state">أدخل الإحصائيات ثم اضغط «احسب التقييم».</div></div><p class="tool-disclaimer">المؤشر يستخدم أوزانًا عامة، ولا يمثل تقييمًا رسميًا أو ترتيبًا مطلقًا للشخصيات. تختلف الأولويات حسب الشخصية والسلاح والفريق.</p></section>'+
    '<section class="tool-panel" data-tool-panel="damage" hidden><div class="tool-heading"><div><span class="eyebrow">DAMAGE ESTIMATOR</span><h3>حاسبة الضرر التقديري</h3><p>احسب ضربة واحدة مع فصل الضرر العادي والحرج والمتوسط المتوقع.</p></div><span class="tool-icon">ϟ</span></div>'+
    '<form id="damage-form" class="tool-form"><label class="field">إجمالي ATK<input id="damage-atk" type="number" min="0" value="2500"></label><label class="field">Skill Multiplier %<input id="damage-mult" type="number" min="0" step="0.1" value="300"></label><label class="field">Damage Bonus %<input id="damage-bonus" type="number" min="-100" step="0.1" value="40"></label><label class="field">Crit Rate %<input id="damage-cr" type="number" min="0" max="100" step="0.1" value="70"></label><label class="field">Crit DMG %<input id="damage-cd" type="number" min="0" step="0.1" value="220"></label><label class="field">Defense Multiplier %<input id="damage-def" type="number" min="0" max="100" step="0.1" value="70"></label><label class="field">Resistance Multiplier %<input id="damage-res" type="number" min="0" max="200" step="0.1" value="100"></label><div class="tool-actions wide"><button class="primary" type="submit">احسب الضرر</button><button class="secondary" type="reset">إعادة ضبط</button></div></form>'+
    '<div id="damage-result" class="tool-result" aria-live="polite"><div class="empty-state">أدخل القيم لحساب الضرر التقديري.</div></div><p class="tool-disclaimer">حاسبة مبسطة لضربة واحدة. لا تحاكي كل معادلات اللعبة أو Buffs أو تفاعلات المهارات. اضبط معاملات الدفاع والمقاومة يدويًا؛ الناتج ليس DPS أو Rotation كاملة.</p></section>'+
    '<section class="tool-panel" data-tool-panel="echo" hidden><div class="tool-heading"><div><span class="eyebrow">ECHO EVALUATOR</span><h3>تقييم خصائص Echo</h3><p>قارن قيمة الخصائص الثانوية وفق أوزان عامة لهجمات الضرر.</p></div><span class="tool-icon">◇</span></div>'+
    '<form id="echo-form" class="tool-form"><label class="field">Crit Rate %<input id="echo-cr" type="number" min="0" max="100" step="0.1" value="6.3"></label><label class="field">Crit DMG %<input id="echo-cd" type="number" min="0" step="0.1" value="12.6"></label><label class="field">ATK Bonus %<input id="echo-atk" type="number" min="0" step="0.1" value="6.4"></label><label class="field">Energy Regen %<input id="echo-er" type="number" min="0" step="0.1" value="6.8"></label><label class="field">Flat ATK<input id="echo-flat" type="number" min="0" step="1" value="50"></label><label class="field">نوع الاستخدام<select id="echo-role"><option value="dps">مهاجم / DPS</option><option value="support">دعم / Support</option></select></label><div class="tool-actions wide"><button class="primary" type="submit">قيّم Echo</button><button class="secondary" type="reset">إعادة ضبط</button></div></form>'+
    '<div id="echo-result" class="tool-result" aria-live="polite"><div class="empty-state">أدخل الخصائص الثانوية لتقييم Echo.</div></div><p class="tool-disclaimer">الأوزان تقديرية وليست معيارًا رسميًا. قد تكون HP أو DEF أو Energy Regen أهم لبعض الشخصيات والدعم؛ لا تقارن أدوارًا مختلفة اعتمادًا على الدرجة وحدها.</p></section>'+
    '<section class="tool-panel" data-tool-panel="team" hidden><div class="tool-heading"><div><span class="eyebrow">TEAM PLANNER</span><h3>منشئ الفرق</h3><p>كوّن فريقًا من الشخصيات المسجلة في قاعدة البيانات واعرض عناصره وندرتها.</p></div><span class="tool-icon">⌘</span></div>'+
    '<form id="team-form" class="tool-form"><label class="field">الشخصية الأولى<select id="team-one"><option value="">اختر الشخصية</option></select></label><label class="field">الشخصية الثانية<select id="team-two"><option value="">اختر الشخصية</option></select></label><label class="field">الشخصية الثالثة<select id="team-three"><option value="">اختر الشخصية</option></select></label><div class="tool-actions wide"><button class="primary" type="submit">اعرض الفريق</button><button class="secondary" type="reset">مسح الاختيارات</button></div></form>'+
    '<div id="team-result" class="tool-result" aria-live="polite"><div class="empty-state">اختر حتى ثلاث شخصيات لتكوين فريقك.</div></div><p class="tool-disclaimer">الأداة تنظم التشكيلة فقط؛ لا تدّعي قياس التآزر أو تحديد أفضل فريق. سنضيف تقييم التآزر عندما تتوفر بيانات موثقة عن المهارات والـ Buffs.</p></section>'+
    '<datalist id="wuwa-character-options"></datalist>';

  const tabs=[...root.querySelectorAll("[data-tool-tab]")], panels=[...root.querySelectorAll("[data-tool-panel]")];
  tabs.forEach(tab=>tab.addEventListener("click",()=>{
    tabs.forEach(x=>x.classList.toggle("active",x===tab));
    panels.forEach(p=>{const active=p.dataset.toolPanel===tab.dataset.toolTab;p.hidden=!active;p.classList.toggle("active",active);});
  }));
  function showResult(id,title,score,detail){
    document.getElementById(id).innerHTML='<div class="tool-result-head"><div><span class="eyebrow">'+esc(title)+'</span><strong>'+esc(score)+'</strong></div><span class="tool-result-mark">✓</span></div>'+detail;
  }
  document.getElementById("build-rating-form").addEventListener("submit",e=>{
    e.preventDefault();
    const cr=clamp(num("build-cr"),0,100),cd=clamp(num("build-cd"),0,400),er=clamp(num("build-er"),0,300),atk=clamp(num("build-atk"),0,200),dmg=clamp(num("build-dmg"),0,200);
    const crit=Math.min(40,((cr*2+cd)/280)*40),energy=Math.min(15,Math.max(0,(er-100)/60)*15),attack=Math.min(20,atk/70*20),bonus=Math.min(25,dmg/80*25);
    const score=Math.round(crit+energy+attack+bonus),grade=score>=85?"متوازن جدًا":score>=70?"جيد":score>=50?"قابل للتحسين":"يحتاج إلى تطوير";
    showResult("build-rating-result",document.getElementById("build-character").value.trim()||"BUILD SCORE",score+"/100",'<p class="tool-grade">'+grade+'</p><div class="tool-meter"><span style="width:'+score+'%"></span></div><div class="tool-breakdown"><span>Crit Value <b>'+fmt(cr*2+cd)+'</b></span><span>Energy Regen <b>'+pct(er)+'</b></span><span>ATK Bonus <b>'+pct(atk)+'</b></span><span>Damage Bonus <b>'+pct(dmg)+'</b></span></div>');
  });
  document.getElementById("damage-form").addEventListener("submit",e=>{
    e.preventDefault();
    const atk=Math.max(0,num("damage-atk")),mult=Math.max(0,num("damage-mult"))/100,bonus=Math.max(-100,num("damage-bonus"))/100;
    const cr=clamp(num("damage-cr"),0,100)/100,cd=Math.max(0,num("damage-cd"))/100,def=clamp(num("damage-def"),0,100)/100,res=clamp(num("damage-res"),0,200)/100;
    const base=atk*mult*Math.max(0,1+bonus)*def*res,normal=base,critical=base*(1+cd),expected=base*(1+cr*cd);
    showResult("damage-result","ESTIMATED SINGLE HIT",fmt(expected),'<div class="damage-values"><div><small>ضربة عادية</small><b>'+fmt(normal)+'</b></div><div><small>ضربة حرجة</small><b>'+fmt(critical)+'</b></div><div><small>متوسط متوقع</small><b>'+fmt(expected)+'</b></div></div>');
  });
  document.getElementById("echo-form").addEventListener("submit",e=>{
    e.preventDefault();
    const role=document.getElementById("echo-role").value,cr=clamp(num("echo-cr"),0,100),cd=Math.max(0,num("echo-cd")),atk=Math.max(0,num("echo-atk")),er=Math.max(0,num("echo-er")),flat=Math.max(0,num("echo-flat"));
    const crit=Math.min(40,cr/10*20+cd/20*20),attack=Math.min(25,atk/10*25),energy=Math.min(role==="support"?25:15,er/10*(role==="support"?25:15)),flatScore=Math.min(10,flat/50*10),max=role==="support"?100:90;
    const score=Math.round((crit+attack+energy+flatScore)/max*100),label=score>=85?"قوي وفق الأوزان المختارة":score>=65?"متوسط":"محدود وفق الأوزان المختارة";
    showResult("echo-result","ECHO SUBSTAT SCORE",score+"/100",'<p class="tool-grade">'+label+'</p><div class="tool-meter"><span style="width:'+score+'%"></span></div><div class="tool-breakdown"><span>Crit Stats <b>'+fmt(crit)+'</b></span><span>ATK Bonus <b>'+fmt(attack)+'</b></span><span>Energy Regen <b>'+fmt(energy)+'</b></span><span>Flat ATK <b>'+fmt(flatScore)+'</b></span></div>');
  });
  let roster=Array.isArray(window.wuwaRoster)?window.wuwaRoster:[];
  function updateRoster(list){
    roster=Array.isArray(list)?list:[];
    root.querySelectorAll("#team-one,#team-two,#team-three").forEach(sel=>{
      const old=sel.value;
      sel.innerHTML='<option value="">اختر الشخصية</option>'+roster.map(c=>'<option value="'+esc(c.name)+'">'+esc(c.name)+' · '+esc(c.element||"Unknown")+'</option>').join("");
      if(roster.some(c=>c.name===old))sel.value=old;
    });
  }
  window.addEventListener("wuwa:roster-ready",e=>updateRoster(e.detail?.characters||[]));
  if(roster.length)updateRoster(roster);
  document.getElementById("team-form").addEventListener("submit",e=>{
    e.preventDefault();
    const names=["team-one","team-two","team-three"].map(id=>document.getElementById(id).value).filter(Boolean),unique=[...new Set(names)];
    if(!unique.length)return showResult("team-result","TEAM PLANNER","0 / 3","<p>اختر شخصية واحدة على الأقل.</p>");
    const chosen=unique.map(name=>roster.find(c=>c.name===name)).filter(Boolean),elements=[...new Set(chosen.map(c=>c.element).filter(Boolean))],duplicate=unique.length!==names.length;
    const cards=chosen.map(c=>'<div class="team-member"><b>'+esc(c.name)+'</b><span>'+esc(c.element||"Unknown")+' · '+esc(c.rarity||"?")+'★</span></div>').join("");
    showResult("team-result","YOUR RESONATOR TEAM",chosen.length+"/3",'<div class="team-members">'+cards+'</div><p class="team-elements">العناصر الموجودة: '+elements.map(esc).join(" · ")+'</p>'+(duplicate?'<p class="tool-warning">تم تجاهل الشخصية المكررة.</p>':""));
  });
  document.getElementById("team-form").addEventListener("reset",()=>setTimeout(()=>{document.getElementById("team-result").innerHTML='<div class="empty-state">اختر حتى ثلاث شخصيات لتكوين فريقك.</div>';},0));
})();