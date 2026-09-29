
// Authentication, role dashboards and learning features
const authScreen = document.querySelector("#authScreen");
const authSubmit = document.querySelector("#authSubmit");
let authMode = "login";
let currentUser = null;

function setAuthMode(mode){
  authMode=mode;
  document.querySelector("#loginTab").classList.toggle("active",mode==="login");
  document.querySelector("#registerTab").classList.toggle("active",mode==="register");
  document.querySelector("#registerFields").classList.toggle("hidden",mode!=="register");
  document.querySelector("#authTitle").textContent=mode==="login"?"Кіру":"Тіркелу";
  authSubmit.innerHTML=mode==="login"?"Кіру <b>→</b>":"Тіркелу <b>→</b>";
  document.querySelector("#authError").textContent="";
}

function openAuth(mode="login"){
  setAuthMode(mode);
  document.querySelector("#authModal")?.classList.remove("hidden");
  document.body.classList.add("auth-modal-open");
  setTimeout(()=>document.querySelector(mode==="register"?"#authName":"#authEmail")?.focus(),80);
}
function closeAuth(){
  document.querySelector("#authModal")?.classList.add("hidden");
  document.body.classList.remove("auth-modal-open");
}

document.querySelectorAll("[data-auth-open]").forEach((button)=>button.addEventListener("click",()=>openAuth(button.dataset.authOpen)));
document.querySelectorAll("[data-auth-close]").forEach((button)=>button.addEventListener("click",closeAuth));
document.addEventListener("keydown",(event)=>{if(event.key==="Escape") closeAuth();});

async function authRequest(url, body){
  const res=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  const data=await res.json();
  if(!res.ok) throw new Error(data.error||"Қате");
  return data;
}
async function copyTextSafe(value){
  const text=String(value ?? "");
  try{if(navigator.clipboard && window.isSecureContext){await navigator.clipboard.writeText(text);return true;}}catch(e){}
  try{const area=document.createElement("textarea");area.value=text;area.setAttribute("readonly","");area.style.position="fixed";area.style.opacity="0";document.body.appendChild(area);area.select();const ok=document.execCommand("copy");area.remove();return ok;}catch(e){return false;}
}
function levelFor(score, quizzes){
  if(quizzes >= 10 || score >= 90) return "Master";
  if(quizzes >= 5 || score >= 75) return "Explorer";
  return "Starter";
}
async function loadRoleDashboard(){
  const res=await fetch("/api/dashboard");
  if(!res.ok)return;
  const data=await res.json();
  document.querySelector("#roleDashboard").classList.remove("hidden");
  document.querySelector("#welcomeUser").textContent=`Сәлем, ${currentUser.name}!`;
  const student=currentUser.role==="student";
  document.body.classList.toggle("student-mode", student);
  document.body.classList.toggle("teacher-mode", !student);
  document.querySelector("#roleText").textContent=student?"Бүгінгі оқу жолыңды өзіңе ыңғайлы қарқынмен жалғастыр.":"Материалдар мен сыныптардың оқу процесін бір жерден басқарыңыз.";
  document.querySelector("#roleKicker").textContent=student?"STUDENT SPACE":"TEACHER WORKSPACE";
  document.querySelector("#studentDashboard").classList.toggle("hidden",!student);
  document.querySelector("#teacherDashboard").classList.toggle("hidden",student);
  document.querySelector("#studentAdaptPanel")?.classList.toggle("student-only-hidden",student);
  const adaptButton=document.querySelector("#adaptButton");
  if(adaptButton && student) adaptButton.innerHTML=`<span>✦</span> Ayla AI арқылы материалды дайындау <kbd>Ctrl ↵</kbd>`;
  const nav=document.querySelector(".sidebar nav");
  if(nav){
    nav.innerHTML=student ? `
      <button class="nav-link active" data-view="dashboard"><span>⌂</span><span>Менің оқуым</span></button>
      <button class="nav-link" data-view="materials"><span>▱</span><span>Материалдар</span></button>
      <button class="nav-link student-hub-link" data-hubnav="tutor"><span>✦</span><span>Ayla Tutor</span></button>
      <button class="nav-link student-hub-link" data-hubnav="quiz"><span>?</span><span>Quiz</span></button>
      <button class="nav-link student-hub-link" data-hubnav="flashcards"><span>▣</span><span>Flashcards</span></button>
      <button class="nav-link student-hub-link" data-hubnav="mistakes"><span>!</span><span>Қате дәптері</span></button>
      <button class="nav-link student-hub-link" data-hubnav="assignments"><span>✓</span><span>Тапсырмалар</span></button>
      <button class="nav-link student-hub-link" data-hubnav="plan"><span>◷</span><span>Study Plan</span></button>
      <button class="nav-link student-hub-link" data-hubnav="classes"><span>▤</span><span>Сыныптарым</span></button>
      <button class="nav-link student-hub-link" data-hubnav="accessibility"><span>◐</span><span>Қолжетімділік</span></button>
    ` : `
      <button class="nav-link active" data-view="dashboard"><span>⌂</span><span>Teacher Space</span></button>
      <button class="nav-link" data-view="materials"><span>▱</span><span>Материалдар</span></button>
      <button class="nav-link" data-view="about"><span>✦</span><span>Ayla AI</span></button>
    `;
    $$(".nav-link").forEach((item) => item.onclick = () => {
      if(item.dataset.hubnav){
        showView("dashboard");
        setTimeout(()=>{
          if(item.dataset.hubnav==="classes"){document.querySelector("#studentClassesCard")?.scrollIntoView({behavior:"smooth",block:"center"});return;}
          if(item.dataset.hubnav==="quiz"){document.querySelector("#quizCard")?.scrollIntoView({behavior:"smooth",block:"center"});return;}
          switchHub(item.dataset.hubnav);
          document.querySelector("#learningHub")?.scrollIntoView({behavior:"smooth",block:"start"});
        },30);
      } else showView(item.dataset.view);
    });
  }
  const aiProfile=document.querySelector(".ai-profile");
  if(aiProfile && student){ aiProfile.querySelector("small").textContent="Сенің оқу серігің"; }
  if(student){
    document.querySelector("#statQuiz").textContent=data.quiz_count||0;
    document.querySelector("#statAverage").textContent=(data.average_score||0)+"%";
    document.querySelector("#statStreak").textContent=data.streak||0;
    document.querySelector("#statLevel").textContent=data.level_name || levelFor(data.average_score||0,data.quiz_count||0);
    const progress=Math.max(0,Math.min(100,Math.round((data.average_score||0)*0.65 + Math.min(35,(data.streak||0)*5))));
    const ring=document.querySelector("#studentProgressRing");
    if(ring) ring.style.setProperty("--progress", `${progress * 3.6}deg`);
    const setStudent=(id,value)=>{const el=document.querySelector(id);if(el)el.textContent=value;};
    setStudent("#studentProgressPercent",`${progress}%`);
    setStudent("#studentXp",`${data.xp||0} XP`);
    setStudent("#studentLevelName",data.level_name||"Starter");
    setStudent("#studentProgressHint", data.quiz_count ? `Соңғы орташа нәтижең ${data.average_score||0}%. Келесі қадамды Ayla-мен жалғастыр.` : "Алғашқы Quiz орындап, жеке прогресті баста.");
    const weak=data.weak_topic;
    setStudent("#weakTopic", weak ? `${weak.title} · ${weak.n} қате` : "Әзірге әлсіз тақырып анықталған жоқ");
    const rec=document.querySelector("#studentRecommendation");
    if(rec) rec.textContent=weak ? `Ayla саған «${weak.title}» тақырыбын қайта қарап, Mistake Book-пен жұмыс істеуді ұсынады.` : (data.quiz_count ? "Ayla саған жаңа Flashcards жасап, білімді бекітуді ұсынады." : "Ayla саған бүгін бір қысқа Quiz ұсынады.");
    const weekly=data.weekly||[];
    const maxCount=Math.max(1,...weekly.map(x=>x.count||0));
    const chart=document.querySelector("#weeklyChart");
    if(chart) chart.innerHTML=weekly.map(x=>`<div class="week-bar-wrap" title="${x.day}: ${x.count} Quiz"><div class="week-bar" style="height:${Math.max(10,((x.count||0)/maxCount)*100)}%"></div></div>`).join("");
    const days=document.querySelector("#weeklyDays");
    if(days) days.innerHTML=weekly.map(x=>`<span>${new Date(`${x.day}T12:00:00`).toLocaleDateString("kk-KZ",{weekday:"short"}).replace(".","")}</span>`).join("");
    setStudent("#weeklyTotal",`${weekly.reduce((sum,x)=>sum+(x.count||0),0)} Quiz`);
    const next=(data.assignments||[]).find(x=>!x.submitted);
    setStudent("#nextAssignmentTitle",next?.title||"Бүгінгі келесі қадам");
    setStudent("#nextAssignmentText",next ? `${next.class_name} · ${next.points} pt
${next.description||"Тапсырманы орындап жібер."}` : (data.materials_count ? "Материалдан Quiz немесе Flashcards жасап көр." : "Материал қосып, оқу жолын баста."));
    setStudent("#nextAssignmentDue",next ? `DEADLINE · ${next.due_date}` : "READY");
    const mission=data.mission||{source:"system",id:null,title:"Ayla AI миссиясы",done:0,target:1,text:"Бір Quiz орындаңыз"};
    document.querySelector("#missionText").textContent=mission.text;
    document.querySelector("#missionProgress").textContent=mission.done>=mission.target ? "✓ орындалды" : `${mission.done}/${mission.target}`;
    document.querySelector("#missionFill").style.width=`${Math.min(100,(mission.done/Math.max(1,mission.target))*100)}%`;
    const missionTitle=document.querySelector("#missionTitle");
    if(missionTitle) missionTitle.textContent=mission.title || "Бүгінгі оқу миссиясы";
    const missionAction=document.querySelector("#missionAction");
    if(missionAction){
      missionAction.dataset.missionId=mission.id||"";
      missionAction.dataset.missionSource=mission.source||"system";
      missionAction.textContent=mission.done>=mission.target ? "Аяқталды ✓" : (mission.source==="teacher" ? "Белгілеу ✓" : "Бастау →");
      missionAction.disabled=mission.done>=mission.target;
    }
    document.querySelector("#studentBadges").innerHTML=(data.badges||[]).map(b=>`<div class="badge-item"><span>${b.icon}</span><b>${esc(b.title)}</b><small>${esc(b.text)}</small></div>`).join("")||'<div class="badge-empty">Алғашқы Quiz-ді орындап, бірінші белгіңді ал.</div>';
    document.querySelector("#studentClasses").innerHTML=(data.classes||[]).map(c=>`<div class="class-mini"><div><b>${esc(c.name)}</b><small>${esc(c.code)}</small></div><span>✓</span></div>`).join("")||"<div class='empty-inline'>Сыныпқа әлі қосылған жоқсыз.</div>";
    document.querySelector("#recentActivity").innerHTML=(data.recent||[]).map(x=>{const pct=Math.round((x.score/Math.max(1,x.total))*100);return `<div class="recent-item"><div><b>${esc(x.title)}</b><small>${esc(x.created_at)}</small></div><strong>${pct}%</strong></div>`}).join("")||'<div class="empty-inline">Әзірге Quiz нәтижесі жоқ.</div>';
  }else{
    document.querySelector("#teacherStudentCount").textContent=data.total_students||0;
    document.querySelector("#teacherClassCount").textContent=data.class_count||0;
    const classes=data.classes||[];
    const attempts=classes.reduce((s,c)=>s+(c.attempts||0),0);
    const avg=classes.length?Math.round(classes.reduce((s,c)=>s+(c.average||0),0)/classes.length):0;
    document.querySelector("#teacherAttempts").textContent=attempts;
    document.querySelector("#teacherAverage").textContent=avg+"%";
    document.querySelector("#teacherClasses").innerHTML=classes.map(c=>`<div class="teacher-class-card"><div class="teacher-class-top"><div><span class="class-dot">✦</span><div><b>${esc(c.name)}</b><small>${esc(c.code)}</small></div></div><button class="copy-code" data-code="${esc(c.code)}">Кодты көшіру</button></div><div class="teacher-class-metrics"><span><b>${c.students||0}</b> оқушы</span><span><b>${c.attempts||0}</b> Quiz</span><span><b>${c.average||0}%</b> орташа</span></div></div>`).join("")||'<div class="empty-inline">Алдымен бірінші сыныпты құрыңыз.</div>';
    document.querySelectorAll(".copy-code").forEach(btn=>btn.onclick=async()=>{const ok=await copyTextSafe(btn.dataset.code);toast(ok?"Сынып коды көшірілді ✓":"Көшіру орындалмады. Кодты қолмен белгілеңіз.");});
    const missionClass=document.querySelector("#missionClass");
    if(missionClass){
      missionClass.innerHTML='<option value="">Сыныпты таңдаңыз</option>'+classes.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("");
    }
    const missionList=document.querySelector("#teacherMissions");
    if(missionList){
      missionList.innerHTML=(data.missions||[]).map(m=>`<div class="mission-admin-item"><div><b>${esc(m.title)}</b><small>${esc(m.class_name)} · ${esc(m.due_date)}</small><p>${esc(m.description)}</p></div></div>`).join("")||'<div class="empty-inline">Әлі миссия берілген жоқ.</div>';
    }
  }
  if(student && typeof loadLearningHub === "function") loadLearningHub();
  if(!student && typeof loadTeacherAnalytics === "function") loadTeacherAnalytics();
}
async function checkAuth(){
  try{const res=await fetch("/api/auth/me");const data=await res.json();if(data.authenticated){currentUser=data.user;authScreen.classList.add("hidden");await loadRoleDashboard();}else authScreen.classList.remove("hidden");}
  catch(e){authScreen.classList.remove("hidden");}
}

document.querySelector("#loginTab").onclick=()=>setAuthMode("login");
document.querySelector("#registerTab").onclick=()=>setAuthMode("register");
document.querySelector("#authRole").onchange=(e)=>{const s=document.querySelector("#authSubject");const l=document.querySelector("#subjectLabel");const show=e.target.value==="teacher";s.classList.toggle("hidden",!show);if(l)l.classList.toggle("hidden",!show);};
authSubmit.onclick=async()=>{
  const error=document.querySelector("#authError");error.textContent="";
  try{
    const body={email:document.querySelector("#authEmail").value,password:document.querySelector("#authPassword").value};
    if(authMode==="register"){body.name=document.querySelector("#authName").value;body.role=document.querySelector("#authRole").value;body.subject=document.querySelector("#authSubject").value;}
    const data=await authRequest(authMode==="login"?"/api/auth/login":"/api/auth/register",body);
    currentUser=data.user;authScreen.classList.add("hidden");await loadRoleDashboard();toast(authMode==="login"?"Қош келдіңіз!":"Тіркелу сәтті аяқталды!");
  }catch(e){error.textContent=e.message;}
};
document.querySelector("#logoutButton").onclick=async()=>{await fetch("/api/auth/logout",{method:"POST"});location.reload();};
document.querySelector("#joinClass").onclick=async()=>{const code=document.querySelector("#classCode").value.trim().toUpperCase();if(!code)return toast("Алдымен сынып кодын енгізіңіз.");try{const d=await authRequest("/api/classes/join",{code});document.querySelector("#classCode").value="";toast(`Сіз «${d.class.name}» сыныбына қосылдыңыз ✓`);await loadRoleDashboard();await loadLearningHub();}catch(e){toast(e.message);}};
document.querySelector("#missionAction")?.addEventListener("click",async()=>{
  const btn=document.querySelector("#missionAction");
  const id=btn?.dataset.missionId;
  const source=btn?.dataset.missionSource;
  if(source==="teacher" && id){
    try{
      const d=await authRequest(`/api/missions/${id}/complete`,{});
      toast("Миссия орындалды ✓");
      await loadRoleDashboard();
    }catch(e){toast(e.message);}
  }else{
    showView("materials");
  }
});

document.querySelector("#createMission")?.addEventListener("click",async()=>{
  try{
    const body={
      class_id:Number(document.querySelector("#missionClass").value),
      title:document.querySelector("#missionTitleInput").value,
      description:document.querySelector("#missionDescription").value,
      due_date:document.querySelector("#missionDueDate").value
    };
    await authRequest("/api/missions",body);
    document.querySelector("#missionTitleInput").value="";
    document.querySelector("#missionDescription").value="";
    toast("Оқу миссиясы оқушыларға берілді ✓");
    await loadRoleDashboard();
  }catch(e){toast(e.message);}
});
document.querySelector("#createClass").onclick=async()=>{try{const d=await authRequest("/api/classes",{name:document.querySelector("#className").value,code:document.querySelector("#classCodeCreate").value});toast(`Сынып құрылды: ${d.code}`);await loadRoleDashboard();}catch(e){toast(e.message);}};

function initFocusMode(){
  const overlay=document.querySelector("#focusOverlay"); if(!overlay)return;
  let seconds=25*60, timer=null;
  const render=()=>{const m=String(Math.floor(seconds/60)).padStart(2,"0"),s=String(seconds%60).padStart(2,"0");document.querySelector("#focusTimer").textContent=`${m}:${s}`;};
  document.querySelector("#focusButton")?.addEventListener("click",()=>{overlay.classList.remove("hidden");render();});
  document.querySelector("#studentStudy")?.addEventListener("click",()=>{showView("materials");});
  document.querySelector("#missionAction")?.addEventListener("click",()=>{showView("materials");});
  document.querySelector("#closeFocus")?.addEventListener("click",()=>{clearInterval(timer);timer=null;overlay.classList.add("hidden");});
  document.querySelector("#focusStart")?.addEventListener("click",()=>{if(timer){clearInterval(timer);timer=null;document.querySelector("#focusStart").textContent="Жалғастыру";return;}document.querySelector("#focusStart").textContent="Пауза";timer=setInterval(()=>{seconds--;render();if(seconds<=0){clearInterval(timer);timer=null;seconds=0;render();toast("Focus сессиясы аяқталды. Жарайсың!");}},1000);});
  document.querySelector("#focusReset")?.addEventListener("click",()=>{clearInterval(timer);timer=null;seconds=25*60;document.querySelector("#focusStart").textContent="Бастау";render();});
}
checkAuth();


const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const state = {
  materialId: null,
  title: "",
  result: null,
  source: "",
  active: "simplified",
  language: "kk",
  progress: { completed: 0, score: 0 },
};

let labels = {
  simplified: "Жеңілдетілген мәтін",
  steps: "Қадам-қадаммен",
  examples: "Қосымша мысалдар",
  diagram: "Визуалды сызба",
  audio: "Аудио нұсқа",
  large: "Үлкейтілген қаріп",
  summary: "Қысқаша резюме",
  tasks: "Бейімделген тапсырмалар",
};

function t(key) {
  return window.LEARN4ALL_I18N?.[state.language]?.[key]
    || window.LEARN4ALL_I18N?.kk?.[key]
    || key;
}

function applyLanguage() {
  document.documentElement.lang = state.language;
  labels = {
    simplified: t("simplified"),
    steps: t("steps"),
    examples: t("examples"),
    diagram: t("diagram"),
    audio: t("audio"),
    large: t("large"),
    summary: t("summary"),
    tasks: t("tasks"),
  };
  $$("[data-i18n]").forEach((element) => {
    const value = t(element.dataset.i18n);
    if (element.dataset.i18n === "aboutHeadline" || element.dataset.i18n === "orChooseFile") {
      element.innerHTML = value;
    } else {
      element.textContent = value;
    }
  });
  $$("[data-i18n-placeholder]").forEach((element) => {
    element.placeholder = t(element.dataset.i18nPlaceholder);
  });
  if (!$("#adaptButton").disabled) {
    const action = state.language === "kk" ? "Ayla AI арқылы бейімдеу" : state.language === "ru" ? "Адаптировать через Ayla AI" : "Adapt with Ayla AI";
    $("#adaptButton").innerHTML = `<span>✦</span> ${action} <kbd>Ctrl ↵</kbd>`;
  }
  $("#charCount").textContent = `${state.source.length.toLocaleString("kk-KZ")} ${state.language === "kk" ? "таңба" : state.language === "ru" ? "симв." : "characters"}`;
  if (state.result) {
    renderResult({
      id: state.materialId,
      title: state.title,
      source_text: state.source,
      adaptation: state.result,
      progress: state.progress,
    });
  }
}

function toast(text) {
  const element = $("#toast");
  element.textContent = text;
  element.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove("show"), 3200);
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  }[character]));
}

function selected() {
  return $$(".format input:checked").map((input) => input.value);
}

function updateCount() {
  $("#formatCount").textContent = selected().length;
}

function setSource(text) {
  state.source = text || "";
  $("#sourceText").value = state.source;
  $("#charCount").textContent = `${state.source.length.toLocaleString("kk-KZ")} таңба`;
}

function showView(name) {
  $$(".nav-link").forEach((item) => item.classList.toggle("active", item.dataset.view === name));
  $$(".view").forEach((item) => item.classList.add("hidden"));
  $(`#${name}View`).classList.remove("hidden");
  if (name === "materials") loadMaterials();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function content(key, result) {
  if (key === "diagram") {
    const nodes = result.diagram?.nodes || [];
    return `<div class="diagram">${nodes.map((node, index) => `${index ? '<span class="arrow">→</span>' : ""}<div class="node">${esc(node)}</div>`).join("")}</div><div class="chips">${(result.keywords || []).map((item) => `<span class="chip">${esc(item)}</span>`).join("")}</div>`;
  }
  if (key === "audio") {
    return `<div class="audio"><div class="audio-controls"><button id="speak" class="audio-play" aria-label="Ойнату">▶</button><button id="pauseSpeak" class="audio-control" aria-label="Пауза">Ⅱ</button><button id="stopSpeak" class="audio-control" aria-label="Тоқтату">■</button><button id="audioToggle" class="audio-control" aria-label="Дыбысты қосу/өшіру">🔊</button></div><div class="audio-copy"><b>${esc(t("audio"))}</b><small>${esc(t("answerFromMaterial"))}</small></div><div class="wave"></div></div><div class="result-body">${esc(result.audio || result.summary || result.simplified || "")}</div>`;
  }
  return `<div class="result-body ${key === "large" ? "large" : ""}">${esc(result[key] || "Бұл формат таңдалмады.")}</div>${key === "summary" ? `<div class="chips">${(result.keywords || []).map((item) => `<span class="chip">${esc(item)}</span>`).join("")}</div>` : ""}`;
}

function renderProgress(progress = {}) {
  state.progress = {
    completed: Number(progress.completed || 0),
    score: Number(progress.score || 0),
  };
  const percent = state.progress.completed ? 100 : state.progress.score;
  $("#progressText").textContent = `${percent}% ${state.language === "kk" ? "аяқталды" : state.language === "ru" ? "завершено" : "completed"}`;
  $("#progressFill").style.width = `${percent}%`;
  $("#progressBar").classList.remove("hidden");
}

function renderPractice() {
  const rawTasks = String(state.result?.tasks || "")
    .split(/\n+/)
    .map((task) => task.replace(/^\s*\d+[.)]\s*/, "").trim())
    .filter(Boolean);
  if (!rawTasks.length) {
    $("#practiceCard").classList.add("hidden");
    return;
  }
  $("#practiceCard").classList.remove("hidden");
  $("#practiceCard").innerHTML = `
    <div class="practice-header"><div><span class="step">03</span><h3>${esc(t("practice"))}</h3><p>${esc(t("practiceHint"))}</p></div><span class="practice-score" id="practiceScore">0/${rawTasks.length}</span></div>
    <div class="practice-list">${rawTasks.map((task, index) => `<label><input type="checkbox" data-practice="${index}"><span>${esc(task)}</span></label>`).join("")}</div>
    <button id="finishPractice" class="secondary-button">${esc(t("saveProgress"))}</button>`;
  const checkboxes = $$("[data-practice]");
  const updateScore = () => {
    const score = checkboxes.filter((checkbox) => checkbox.checked).length;
    $("#practiceScore").textContent = `${score}/${checkboxes.length}`;
  };
  checkboxes.forEach((checkbox) => checkbox.addEventListener("change", updateScore));
  $("#finishPractice").onclick = async () => {
    const score = Math.round((checkboxes.filter((checkbox) => checkbox.checked).length / checkboxes.length) * 100);
    await saveProgress(score === 100, score);
    toast(score === 100 ? t("allTasksDone") : t("progressSaved"));
  };
}

function renderResult(data) {
  state.materialId = data.id || state.materialId;
  state.title = data.title || state.title || "Оқу материалы";
  state.result = data.adaptation || data;
  state.source = data.source_text || state.source;
  const formats = selected();
  if (!formats.includes(state.active)) state.active = formats[0] || "simplified";
  $("#outputMeta").textContent = `${state.title} · ${state.source.length.toLocaleString("kk-KZ")} таңба · ${formats.length} формат`;
  $("#tabs").innerHTML = formats.map((key) => `<button class="tab ${key === state.active ? "active" : ""}" data-tab="${key}">${labels[key]}</button>`).join("");
  $("#result").innerHTML = `<div class="result-top"><h3>${labels[state.active]}</h3><button class="result-copy" id="copyCurrent">${esc(t("copyAll").replace("▣ ", ""))}</button></div>${content(state.active, state.result)}`;
  $$(".tab").forEach((tab) => {
    tab.onclick = () => {
      state.active = tab.dataset.tab;
      renderResult({ id: state.materialId, title: state.title, source_text: state.source, adaptation: state.result, progress: state.progress });
    };
  });
  $("#copyCurrent").onclick = async () => {
    const value = state.result[state.active];
    const ok=await copyTextSafe(typeof value === "object" ? JSON.stringify(value) : value || "");
    toast(ok ? t("copied") : "Көшіру орындалмады. Мәтінді қолмен белгілеңіз.");
  };
  const audioText = state.result?.audio || state.result?.summary || state.result?.simplified || state.source || "";
  const audioLang = state.language === "ru" ? "ru-RU" : state.language === "en" ? "en-US" : "kk-KZ";
  let audioEnabled = localStorage.getItem("inclulearnAudioEnabled") !== "false";
  const chooseVoice = () => {
    if (!("speechSynthesis" in window)) return null;
    const voices = speechSynthesis.getVoices();
    if (!voices.length) return null;
    const base = audioLang.slice(0,2).toLowerCase();
    // Never fall back to an unrelated default voice (for example Arabic).
    // If the browser has no matching voice, let the engine use the utterance language.
    return voices.find(v => (v.lang||"").toLowerCase() === audioLang.toLowerCase()) ||
      voices.find(v => (v.lang||"").toLowerCase().startsWith(base)) || null;
  };
  const updateAudioToggle = () => {
    const btn = $("#audioToggle");
    if (btn) { btn.textContent = audioEnabled ? "🔊" : "🔇"; btn.title = audioEnabled ? "Дыбысты өшіру" : "Дыбысты қосу"; }
  };
  updateAudioToggle();
  $("#audioToggle")?.addEventListener("click", () => {
    audioEnabled = !audioEnabled;
    localStorage.setItem("inclulearnAudioEnabled", String(audioEnabled));
    if (!audioEnabled && "speechSynthesis" in window) speechSynthesis.cancel();
    updateAudioToggle();
    toast(audioEnabled ? "Аудио қосылды" : "Аудио өшірілді");
  });
  $("#speak")?.addEventListener("click", () => {
    if (!audioEnabled) return toast("Алдымен 🔇 батырмасымен аудионы қосыңыз.");
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") return toast(state.language === "kk" ? "Бұл браузерде дыбыстық оқу қолжетімсіз." : state.language === "ru" ? "В этом браузере нет озвучивания." : "Speech is not available in this browser.");
    const start = () => {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(audioText);
      utterance.lang = audioLang;
      utterance.rate = 0.88;
      utterance.pitch = 1;
      const voice = chooseVoice();
      if (voice) utterance.voice = voice;
      utterance.onstart = () => { if($("#speak")) $("#speak").textContent="▶"; };
      utterance.onend = () => { if($("#speak")) $("#speak").textContent="▶"; };
      utterance.onerror = (event) => {
        if(event.error !== "canceled" && event.error !== "interrupted") toast(state.language === "kk" ? "Қазақша дауыс браузерде табылмады. Safari/Chrome тіл баптауларын тексеріңіз." : "Аудионы іске қосу мүмкін болмады. Қайтадан ▶ басыңыз.");
      };
      speechSynthesis.resume();
      speechSynthesis.speak(utterance);
      toast(state.language === "kk" ? "Аудио ойнатылып жатыр" : state.language === "ru" ? "Аудио воспроизводится" : "Audio is playing");
    };
    if (speechSynthesis.getVoices().length) start();
    else {
      const previous=speechSynthesis.onvoiceschanged;
      speechSynthesis.onvoiceschanged = () => { speechSynthesis.onvoiceschanged = previous || null; start(); };
      setTimeout(()=>{ if(!speechSynthesis.speaking) start(); }, 700);
    }
  });
  $("#pauseSpeak")?.addEventListener("click", () => {
    if (!("speechSynthesis" in window)) return;
    if (speechSynthesis.speaking && !speechSynthesis.paused) speechSynthesis.pause();
    else if (speechSynthesis.paused) speechSynthesis.resume();
  });
  $("#stopSpeak")?.addEventListener("click", () => {
    if (!("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    if($("#speak")) $("#speak").textContent="▶";
  });
  renderProgress(data.progress || state.progress);
  renderPractice();
  $("#outputSection").classList.remove("hidden");
  $("#outputSection").scrollIntoView({ behavior: "smooth", block: "start" });
}

async function adapt() {
  const text = $("#sourceText").value.trim();
  if (!text) return toast(t("chooseMaterial"));
  const button = $("#adaptButton");
  button.disabled = true;
  button.innerHTML = `<span>◌</span> ${state.language === "kk" ? "Ayla AI талдап жатыр…" : state.language === "ru" ? "Ayla AI анализирует…" : "Ayla AI is analyzing…"}`;
  try {
    const body = new FormData();
    body.append("title", $("#materialTitle").value.trim() || "Жаңа оқу материалы");
    body.append("text", text);
    body.append("language", state.language);
    const response = await fetch("/api/materials", { method: "POST", body });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    renderResult(data);
    toast(t("saved"));
  } catch (error) {
    toast(error.message || "Қате болды.");
  } finally {
    button.disabled = false;
    button.innerHTML = `<span>✦</span> ${state.language === "kk" ? "Ayla AI арқылы бейімдеу" : state.language === "ru" ? "Адаптировать через Ayla AI" : "Adapt with Ayla AI"} <kbd>Ctrl ↵</kbd>`;
  }
}

async function upload(file) {
  if (!file) return;
  const note = $("#fileNote");
  note.className = "file-note";
  note.textContent = `${file.name} ${state.language === "kk" ? "оқылып жатыр…" : state.language === "ru" ? "читается…" : "is being read…"}`;
  $("#materialTitle").value = file.name.replace(/\.[^.]+$/, "");
  const body = new FormData();
  body.append("file", file);
  body.append("title", $("#materialTitle").value);
  body.append("language", state.language);
  try {
    const response = await fetch("/api/materials", { method: "POST", body });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    setSource(data.source_text);
    note.textContent = `✓ ${file.name} · ${state.language === "kk" ? "мәтін алынды" : state.language === "ru" ? "текст извлечён" : "text extracted"}`;
    renderResult(data);
    toast(t("saved"));
  } catch (error) {
    note.className = "file-note error";
    note.textContent = error.message;
  }
}

function demo() {
  $("#materialTitle").value = "ООП — Мұрагерлік";
  setSource("Мұрагерлік — объектіге бағытталған бағдарламалауда бір кластың басқа кластың қасиеттері мен әдістерін иелену мүмкіндігі. Ата-ана класс ортақ сипаттамаларды анықтайды, ал бала класс оларды қайта пайдаланып, жаңа қасиеттер қоса алады. Мысалы, Көлік класы қозғалу әдісіне ие болса, Автокөлік класы Көліктен мұра алып, қозғалу әдісін пайдаланады және қозғалтқыш түрін қосады. Мұрагерлік кодты қайталамай жазуға, бағдарламаны кеңейтуге және кластар арасындағы байланысты ұйымдастыруға көмектеседі.");
  toast(state.language === "kk" ? "Үлгі материал жүктелді." : state.language === "ru" ? "Демо-материал загружен." : "Demo material loaded.");
}

async function ask() {
  const question = $("#questionInput").value.trim();
  if (!question) return toast(t("questionRequired"));
  const box = $("#answer");
  const button = $("#askButton");
  button.disabled = true;
  box.classList.remove("hidden");
  box.textContent = t("answerLoading");
  try {
    const response = await fetch(`/api/materials/${state.materialId}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    box.textContent = data.answer;
  } catch (error) {
    box.textContent = error.message;
  } finally {
    button.disabled = false;
  }
}

async function saveProgress(completed, score) {
  if (!state.materialId) return;
  const response = await fetch(`/api/materials/${state.materialId}/progress`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ completed, score }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  renderProgress(data);
}

async function loadMaterials() {
  const query = $("#searchMaterials").value.trim();
  const response = await fetch(`/api/materials${query ? `?q=${encodeURIComponent(query)}` : ""}`);
  const data = await response.json();
  $("#materialsList").innerHTML = data.materials.length
    ? data.materials.map((item) => `
      <article class="material-card">
        <div class="material-card-top"><h3>${esc(item.title)}</h3><button class="delete-material" data-delete="${item.id}" title="${esc(t("materialDeleted"))}">×</button></div>
        <p>${esc(item.source_text || "")}${(item.source_text || "").length >= 180 ? "…" : ""}</p>
        <div class="card-meta"><span>${item.progress?.score || 0}% ${state.language === "kk" ? "прогресс" : state.language === "ru" ? "прогресс" : "progress"}</span><small>${esc(item.updated_at)}</small></div>
        <button class="open-material" data-open="${item.id}">${state.language === "kk" ? "Материалды ашу" : state.language === "ru" ? "Открыть материал" : "Open material"} →</button>
      </article>`).join("")
    : `<div class="empty">${t("noMaterials")}</div>`;
  $$("[data-open]").forEach((button) => button.onclick = () => openMaterial(button.dataset.open));
  $$("[data-delete]").forEach((button) => button.onclick = () => deleteMaterial(button.dataset.delete));
}

async function openMaterial(id) {
  const response = await fetch(`/api/materials/${id}`);
  const data = await response.json();
  if (!response.ok) return toast(data.error);
  state.progress = data.progress || { completed: 0, score: 0 };
  $("#materialTitle").value = data.title;
  setSource(data.source_text);
  renderResult(data);
  showView("dashboard");
}

async function deleteMaterial(id) {
  if (!window.confirm(t("deleteConfirm"))) return;
  const response = await fetch(`/api/materials/${id}`, { method: "DELETE" });
  const data = await response.json();
  if (!response.ok) return toast(data.error);
  toast(t("materialDeleted"));
  loadMaterials();
}

function setAccessibility() {
  const root = document.documentElement;
  const fontScale = Number(localStorage.getItem("learn4all-font-scale") || "1");
  root.style.setProperty("--font-scale", fontScale);
  document.body.classList.toggle("high-contrast", localStorage.getItem("learn4all-contrast") === "1");
  document.body.classList.toggle("dark-mode", localStorage.getItem("learn4all-theme") === "dark");
}

function changeFont(delta) {
  const current = Number(localStorage.getItem("learn4all-font-scale") || "1");
  const next = Math.max(0.9, Math.min(1.35, Math.round((current + delta) * 100) / 100));
  localStorage.setItem("learn4all-font-scale", String(next));
  setAccessibility();
}

$("#sourceText").oninput = (event) => {
  state.source = event.target.value;
  $("#charCount").textContent = `${state.source.length.toLocaleString("kk-KZ")} ${state.language === "kk" ? "таңба" : state.language === "ru" ? "симв." : "characters"}`;
};
$("#fileInput").onchange = (event) => upload(event.target.files[0]);
$("#demoButton").onclick = demo;
$("#adaptButton").onclick = adapt;
$("#askButton").onclick = ask;
$("#questionInput").onkeydown = (event) => { if (event.key === "Enter") ask(); };
$("#dropzone").ondragover = (event) => { event.preventDefault(); $("#dropzone").classList.add("dragging"); };
$("#dropzone").ondragleave = () => $("#dropzone").classList.remove("dragging");
$("#dropzone").ondrop = (event) => { event.preventDefault(); $("#dropzone").classList.remove("dragging"); upload(event.dataTransfer.files[0]); };
$$(".format").forEach((item) => item.onclick = () => setTimeout(() => {
  item.classList.toggle("selected", item.querySelector("input").checked);
  updateCount();
}, 0));
$$(".nav-link").forEach((item) => item.onclick = () => showView(item.dataset.view));
$("#printButton").onclick = () => window.print();
$("#copyButton").onclick = async () => {
  const text = Object.entries(state.result || {})
    .filter(([key]) => labels[key])
    .map(([key, value]) => `${labels[key]}\n${typeof value === "string" ? value : JSON.stringify(value)}`)
    .join("\n\n");
  const ok=await copyTextSafe(text);
  toast(ok?"Барлық нәтиже көшірілді ✓":"Көшіру орындалмады. Мәтінді қолмен белгілеңіз.");
};
$("#searchMaterials").oninput = () => loadMaterials();
$("#refreshMaterials").onclick = () => loadMaterials();
// Public landing page controls
const landingLanguage=document.querySelector("#landingLanguage");
if(landingLanguage){
  landingLanguage.value=localStorage.getItem("learn4all-language")||"kk";
  landingLanguage.onchange=(event)=>{
    state.language=event.target.value;
    localStorage.setItem("learn4all-language",state.language);
    if($("#language")) $("#language").value=state.language;
    applyLanguage();
    toast(state.language==="kk"?"Қазақша тіл таңдалды":state.language==="ru"?"Выбран русский язык":"English selected");
  };
}
document.querySelector("#landingFontDown")?.addEventListener("click",()=>changeFont(-0.1));
document.querySelector("#landingFontUp")?.addEventListener("click",()=>changeFont(0.1));
document.querySelector("#landingTheme")?.addEventListener("click",()=>{
  localStorage.setItem("learn4all-theme",document.body.classList.contains("dark-mode")?"light":"dark");
  setAccessibility();
});

document.querySelector("#feedbackForm")?.addEventListener("submit",(event)=>{
  event.preventDefault();
  const name=$("#feedbackName").value.trim();
  const email=$("#feedbackEmail").value.trim();
  const type=$("#feedbackType").value;
  const message=$("#feedbackMessage").value.trim();
  if(!message) return toast("Хабарламаңызды жазыңыз.");
  const subject=encodeURIComponent(`[IncluLearn AI] ${type}`);
  const body=encodeURIComponent(`Аты: ${name||"Көрсетілмеген"}\nEmail: ${email||"Көрсетілмеген"}\n\n${message}`);
  window.location.href=`mailto:turganbaikyzysymbat@gmail.com?subject=${subject}&body=${body}`;
});

const savedLanguage = localStorage.getItem("learn4all-language");
if (savedLanguage && window.LEARN4ALL_I18N?.[savedLanguage]) state.language = savedLanguage;
$("#language").value = state.language;
$("#language").onchange = (event) => {
  state.language = event.target.value;
  localStorage.setItem("learn4all-language", state.language);
  applyLanguage();
  toast(state.language === "kk" ? "Қазақша тіл таңдалды" : state.language === "ru" ? "Выбран русский язык" : "English selected");
};
$("#fontDown").onclick = () => changeFont(-0.1);
$("#fontUp").onclick = () => changeFont(0.1);
$("#fontReset").onclick = () => { localStorage.setItem("learn4all-font-scale", "1"); setAccessibility(); };
$("#contrastButton").onclick = () => {
  localStorage.setItem("learn4all-contrast", localStorage.getItem("learn4all-contrast") === "1" ? "0" : "1");
  setAccessibility();
};
$("#themeButton").onclick = () => {
  localStorage.setItem("learn4all-theme", document.body.classList.contains("dark-mode") ? "light" : "dark");
  setAccessibility();
};
document.onkeydown = (event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") adapt(); };

applyLanguage();
updateCount();
setAccessibility();
fetch("/api/health").then((response) => response.json()).then((data) => {
  if (!data.database) $("#dbStatus").innerHTML = `<i style='background:#e09a50'></i> ${t("databaseConnected")}`;
});
/* ===== IncluLearn AI 2.0 Learning Hub ===== */
async function loadLearningHub(){
  if(!currentUser || currentUser.role!="student") return;
  const res=await fetch("/api/student/learning-hub");
  if(!res.ok)return;
  const data=await res.json();
  window.learningHubData=data;
  const set=(id,v)=>{const el=document.querySelector(id);if(el)el.textContent=v;};
  set("#hubFlashCount",data.flashcards.length); set("#hubMistakeCount",data.mistakes.length); set("#hubAssignmentCount",data.assignments.length); set("#hubMaterialCount",data.materials.length);
  const next=data.assignments.find(x=>!x.submitted) || data.materials[0];
  set("#hubNextTitle",next?.title||"Оқуды бастаңыз"); set("#hubNextText",next?.description||"Материал қосып, Quiz және Flashcards арқылы білімді бекітіңіз.");
  renderHubFlashcards(data.flashcards); renderHubMistakes(data.mistakes); renderHubAssignments(data.assignments);
}
function renderHubFlashcards(cards){
  const box=document.querySelector("#flashcardDeck"); if(!box)return;
  if(!cards.length){box.innerHTML='<div class="hub-empty"><b>Flashcards деген не?</b><br>Бұл — материалдағы маңызды терминдерді жаттауға арналған карточкалар. Алдымен материалдан карточка жасаңыз.</div>';return;}
  const c=cards[0];
  box.innerHTML=`<div class="flash-explainer"><b>Қалай қолдану керек?</b><span>1. Карточканы бас → жауапты көр</span><span>2. Өзіңді бағала → Қайта / Қиын / Жақсы / Оңай</span><span>3. Бағалағаннан кейін келесі карточка ашылады</span></div><div class="flashcard" id="activeFlashcard"><div class="flash-front"><span>TERM · ${esc(c.material_title||'Материал')}</span><b>${esc(c.front)}</b><small>Карточканы басып, жауапты ашыңыз</small></div><div class="flash-back hidden"><span>ANSWER</span><p>${esc(c.back)}</p></div></div><div class="flash-actions"><button data-rate="again">Қайта</button><button data-rate="hard">Қиын</button><button data-rate="good">Жақсы</button><button data-rate="easy">Оңай</button></div><small class="flash-counter">${cards.length} карточка қалды</small>`;
  document.querySelector("#activeFlashcard").onclick=()=>document.querySelector(".flash-back")?.classList.toggle("hidden");
  document.querySelectorAll("[data-rate]").forEach(b=>b.onclick=async()=>{await authRequest(`/api/student/flashcards/${c.id}/rate`,{difficulty:b.dataset.rate});cards.shift();renderHubFlashcards(cards);});
}
function renderHubMistakes(items){
  const box=document.querySelector("#mistakeList");if(!box)return;
  box.innerHTML=items.length?items.map(x=>`<article class="mistake-item"><span>!</span><div><b>${esc(x.question)}</b><small>Сенің жауабың: ${esc(x.wrong_answer)}</small><p>Дұрыс жауап: <strong>${esc(x.correct_answer)}</strong></p></div></article>`).join(""): '<div class="hub-empty">Қате дәптері әзірге бос. Quiz кезінде қате жауаптарың осында сақталады.</div>';
}
function renderHubAssignments(items){
  const box=document.querySelector("#assignmentList");if(!box)return;
  box.innerHTML=items.length?items.map(x=>`<article class="assignment-item assignment-enhanced"><div class="assignment-main"><span class="assignment-status ${x.submitted?'done':''}">${x.submitted?(x.submission_status==='graded'?'✓ Бағаланған':'↗ Жіберілген'):'OPEN'}</span><b>${esc(x.title)}</b><small>${esc(x.class_name)} · deadline ${esc(x.due_date)} · ${x.points} pt</small><p>${esc(x.description)}</p>${x.submission_status==='graded'?`<div class="teacher-feedback"><strong>Баға: ${x.submission_score}/${x.points}</strong>${x.teacher_comment?`<span>${esc(x.teacher_comment)}</span>`:''}</div>`:''}</div>${x.submitted?`<button class="assignment-view" data-assignment-view="${x.id}">Нәтижені көру</button>`:`<button class="assignment-submit" data-assignment="${x.id}">Жауап беру →</button>`}</article>`).join(""):'<div class="hub-empty"><b>Тапсырма әзірге жоқ.</b><br>Сыныпқа қосылғаннан кейін мұғалім берген тапсырмалар осы жерде автоматты түрде шығады.</div>';
  document.querySelectorAll(".assignment-submit").forEach(btn=>btn.onclick=async()=>{const answer=prompt("Мұғалімге жіберетін жауабыңызды. Тапсырманы орындап, толық жауабыңызды енгізіңіз.");if(!answer)return;try{await authRequest(`/api/assignments/${btn.dataset.assignment}/submit`,{answer});toast("Жауап мұғалімге жіберілді ✓");loadLearningHub();}catch(e){toast(e.message)}});

  document.querySelectorAll(".assignment-view").forEach(btn=>btn.onclick=()=>{const item=items.find(x=>String(x.id)===String(btn.dataset.assignmentView));if(item)toast(item.submission_status==='graded'?`Баға: ${item.submission_score}/${item.points}${item.teacher_comment?' · '+item.teacher_comment:''}`:"Жауабыңыз мұғалімге жіберілді.");});
}
async function generateCardsForLatest(){
  const material=window.learningHubData?.materials?.[0];
  if(!material)return toast("Алдымен материал қосыңыз.");
  const res=await fetch(`/api/student/flashcards/generate/${material.id}`,{method:"POST"});const data=await res.json();if(!res.ok)return toast(data.error);renderHubFlashcards(data.flashcards);toast("Flashcards дайын ✓");
}
async function makeStudyPlan(){
  const days=document.querySelector("#planDays")?.value||7;const res=await fetch(`/api/student/study-plan?days=${days}`);const data=await res.json();const box=document.querySelector("#studyPlan");
  box.innerHTML=data.plan.map(x=>`<article class="plan-day"><span>DAY ${x.day}</span><div><b>${esc(x.topic)}</b>${x.tasks.map(t=>`<small>✓ ${esc(t)}</small>`).join("")}</div></article>`).join("");
}

async function askHubTutor(){
  const material=window.learningHubData?.materials?.[0]; const q=document.querySelector("#hubTutorInput")?.value.trim(); const box=document.querySelector("#hubTutorAnswer");
  if(!material)return toast("Алдымен материал қосыңыз."); if(!q)return toast("Сұрағыңызды жазыңыз.");
  box.classList.remove("hidden"); box.textContent="Ayla AI жауап дайындап жатыр…";
  try{const r=await fetch(`/api/materials/${material.id}/ask`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question:q})});const d=await r.json();if(!r.ok)throw new Error(d.error);box.textContent=d.answer;}catch(e){box.textContent=e.message;}
}
function switchHub(tab){
  document.querySelectorAll(".hub-tab").forEach(b=>b.classList.toggle("active",b.dataset.hubtab===tab));
  ["overview","tutor","flashcards","mistakes","assignments","plan","accessibility"].forEach(x=>document.querySelector(`#hub${x[0].toUpperCase()+x.slice(1)}`)?.classList.toggle("hidden",x!==tab));
  if(tab==="plan")makeStudyPlan();
}
function initLearningHub(){
  document.querySelectorAll("[data-hubtab]").forEach(b=>b.onclick=()=>switchHub(b.dataset.hubtab));
  document.querySelectorAll("[data-hub]").forEach(b=>b.onclick=()=>{switchHub(b.dataset.hub);document.querySelector("#learningHub")?.scrollIntoView({behavior:"smooth",block:"start"});});
  document.querySelector("#hubRefresh")?.addEventListener("click",loadLearningHub);
  document.querySelector("#generateCards")?.addEventListener("click",generateCardsForLatest);
  document.querySelector("#makePlan")?.addEventListener("click",makeStudyPlan);
  document.querySelector("#mistakePractice")?.addEventListener("click",()=>{switchHub("mistakes");toast("Қателерді қайталау режимі ашылды");});
  document.querySelector("#hubTutorAsk")?.addEventListener("click",askHubTutor);
  document.querySelector("#hubTutorInput")?.addEventListener("keydown",e=>{if(e.key==="Enter")askHubTutor();});
  document.querySelector("#hubNextButton")?.addEventListener("click",()=>showView("materials"));
  document.querySelectorAll("[data-access]").forEach(b=>b.onclick=()=>{
    const a=b.dataset.access;
    if(a==="fontUp")changeFont(0.1); if(a==="fontDown")changeFont(-0.1);
    if(a==="contrast")document.querySelector("#contrastButton")?.click();
    if(a==="dark")document.querySelector("#themeButton")?.click();
    if(a==="dyslexia")document.body.classList.toggle("dyslexia-font");
    if(a==="motion")document.body.classList.toggle("reduced-motion");
    if(a==="spacing")document.body.classList.toggle("wide-spacing");
    if(a==="speak"){
      const text=document.querySelector("#result")?.innerText||document.querySelector("#hubNextText")?.innerText||"Оқу мәтіні жоқ.";
      if("speechSynthesis" in window){speechSynthesis.cancel();speechSynthesis.speak(new SpeechSynthesisUtterance(text));}
    }
  });
}
initLearningHub();

async function loadTeacherAnalytics(){
  if(!currentUser || currentUser.role!=="teacher")return;
  const res=await fetch("/api/teacher/analytics");if(!res.ok)return;const data=await res.json();
  const box=document.querySelector("#teacherAnalytics");if(box)box.innerHTML=data.classes.length?data.classes.map(c=>`<div class="analytics-item"><div><b>${esc(c.name)}</b><small>${esc(c.code)}</small></div><strong>${c.average}%</strong><span>${c.students} оқушы · ${c.attempts} Quiz</span><div class="analytics-bar"><i style="width:${Math.min(100,c.average)}%"></i></div></div>`).join(""):'<div class="hub-empty">Analytics үшін сынып құрыңыз.</div>';
  const select=document.querySelector("#assignmentClass");if(select)select.innerHTML='<option value="">Сыныпты таңдаңыз</option>'+data.classes.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("");
  loadTeacherSubmissions();
}
async function loadTeacherSubmissions(){
  if(!currentUser || currentUser.role!=="teacher")return;
  const res=await fetch("/api/teacher/submissions");if(!res.ok)return;const data=await res.json();const box=document.querySelector("#teacherSubmissions");if(!box)return;
  box.innerHTML=data.submissions.length?data.submissions.map(x=>`<article class="submission-card"><div><span class="submission-status ${x.status==='graded'?'graded':''}">${x.status==='graded'?'✓ Бағаланған':'КҮТУДЕ'}</span><b>${esc(x.student_name)}</b><small>${esc(x.assignment_title)} · ${esc(x.class_name)} · ${esc(x.submitted_at||'')}</small><p>${esc(x.answer)}</p></div><div class="grade-box">${x.status==='graded'?`<strong>${x.score}/${x.points}</strong><small>${esc(x.teacher_comment||'Пікір жоқ')}</small>`:`<input type="number" min="0" max="${x.points}" value="${Math.round(x.points*0.8)}" data-grade-score="${x.assignment_id}:${x.student_id}"><input placeholder="Мұғалім пікірі" data-grade-comment="${x.assignment_id}:${x.student_id}"><button class="grade-submit" data-grade="${x.assignment_id}:${x.student_id}">Бағалау →</button>`}</div></article>`).join(""):'<div class="hub-empty">Оқушылар тапсырма жіберген кезде жауаптары осы жерде көрінеді.</div>';
  box.querySelectorAll(".grade-submit").forEach(btn=>btn.onclick=async()=>{const [a,st]=btn.dataset.grade.split(":");const score=Number(box.querySelector(`[data-grade-score="${a}:${st}"]`).value);const comment=box.querySelector(`[data-grade-comment="${a}:${st}"]`).value;try{await authRequest(`/api/teacher/submissions/${a}/${st}/grade`,{score,comment});toast("Баға сақталды ✓");loadTeacherSubmissions();}catch(e){toast(e.message)}});
}
document.querySelector("#refreshAnalytics")?.addEventListener("click",loadTeacherAnalytics);
document.querySelector("#refreshSubmissions")?.addEventListener("click",loadTeacherSubmissions);
document.querySelector("#createAssignment")?.addEventListener("click",async()=>{try{await authRequest("/api/assignments",{class_id:Number(document.querySelector("#assignmentClass").value),title:document.querySelector("#assignmentTitle").value,description:document.querySelector("#assignmentDescription").value,due_date:document.querySelector("#assignmentDue").value,points:Number(document.querySelector("#assignmentPoints").value||100)});toast("Assignment берілді ✓");document.querySelector("#assignmentTitle").value="";document.querySelector("#assignmentDescription").value="";loadTeacherAnalytics();}catch(e){toast(e.message)}});

/* Full Quiz: 5 questions, results, mistake book, retry */
async function generateQuiz(){
  if(!state.materialId)return toast("Алдымен материалды таңдаңыз.");
  const card=document.querySelector("#quizCard");if(!card)return;
  card.classList.remove("hidden");card.innerHTML='<div class="quiz-loading"><span>✦</span><b>Ayla AI тест дайындап жатыр...</b><small>Материалға сүйенген 5 сұрақ</small></div>';
  try{const res=await fetch(`/api/materials/${state.materialId}/quiz`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({language:state.language})});const data=await res.json();if(!res.ok)throw new Error(data.error);renderQuiz(data.quiz||[]);}catch(e){card.innerHTML=`<div class="hub-empty">${esc(e.message)}</div>`;}
}
function renderQuiz(quiz){
  const card=document.querySelector("#quizCard");if(!card)return;
  if(!quiz.length){card.innerHTML='<div class="hub-empty">Тест сұрақтары табылмады. Материалда толық мәтін көбірек болуы керек.</div>';return;}
  let index=0,answers=[];
  const draw=()=>{const q=quiz[index];card.innerHTML=`<div class="quiz-help"><b>Quiz қалай жұмыс істейді?</b><span>Бір дұрыс жауапты таңдаңыз.</span><span>Жауаптан кейін дұрыс/қате нәтиже көрсетіледі.</span><span>Соңында нәтижеңіз прогреске сақталады.</span></div><div class="quiz-head"><div><span class="mini-label">AYLA QUIZ</span><h3>Біліміңді тексер</h3><small>${index+1}/${quiz.length} сұрақ</small></div><strong>${Math.round(index/quiz.length*100)}%</strong></div><div class="quiz-progress"><i style="width:${index/quiz.length*100}%"></i></div><div class="quiz-question"><b>${esc(q.question)}</b><div class="quiz-options">${q.options.map((o,i)=>`<button data-opt="${i}">${esc(o)}</button>`).join("")}</div><div id="quizFeedback" class="quiz-feedback hidden"></div></div>`;card.querySelectorAll("[data-opt]").forEach(btn=>btn.onclick=()=>{if(card.querySelector("[data-opt][disabled]"))return;const selected=Number(btn.dataset.opt);answers[index]=selected;card.querySelectorAll("[data-opt]").forEach(b=>{b.disabled=true;if(Number(b.dataset.opt)===q.correct)b.classList.add("correct");});btn.classList.toggle("wrong",selected!==q.correct);const f=card.querySelector("#quizFeedback");f.classList.remove("hidden");f.innerHTML=selected===q.correct?"<b>Дұрыс!</b> Жауабыңызды жақсы таптыңыз.":`<b>Қате.</b> Дұрыс жауап: <strong>${esc(q.options[q.correct])}</strong>`;setTimeout(()=>{index++;if(index<quiz.length)draw();else finish();},700);});};
  const finish=async()=>{let score=0;quiz.forEach((q,i)=>{if(answers[i]===q.correct)score++;else if(answers[i]!==undefined)saveMistakeFromQuiz(q,answers[i]);});const pct=Math.round(score/quiz.length*100);try{await authRequest("/api/quiz-results",{material_id:state.materialId,score,total:quiz.length});}catch(e){};card.innerHTML=`<div class="quiz-finish"><div class="quiz-score-ring"><b>${score}</b><span>/${quiz.length}</span></div><span class="mini-label">QUIZ COMPLETE</span><h3>${pct}% · Тест аяқталды!</h3><p>${pct>=80?"Жақсы нәтиже! Енді Flashcards арқылы бекітіңіз.":"Қателерді Mistake Book арқылы қайталап көріңіз."}</p><div><button id="retryQuiz" class="dash-primary">Қайта тапсыру</button><button id="openMistakes" class="dash-ghost">Қателерді көру</button></div></div>`;document.querySelector("#retryQuiz").onclick=generateQuiz;document.querySelector("#openMistakes").onclick=()=>{switchHub("mistakes");document.querySelector("#learningHub")?.scrollIntoView({behavior:"smooth"});};loadLearningHub();};draw();
}
async function saveMistakeFromQuiz(q,wrongIndex){try{await authRequest("/api/student/mistakes",{material_id:state.materialId,question:q.question,wrong_answer:q.options[wrongIndex]||"Жауап берілмеді",correct_answer:q.options[q.correct]});}catch(e){}}
function addQuizStartButton(){
  if(!document.querySelector("#quizCard")||document.querySelector("#startQuiz"))return;
  document.querySelector("#quizCard").innerHTML='<div class="quiz-start"><div class="quiz-icon">✦</div><div><span class="mini-label">AYLA QUIZ</span><h3>Біліміңді тексер</h3><p>Материал бойынша 5 сұрақ. Нәтижең прогреске сақталады.</p></div><button id="startQuiz" class="dash-primary">Тестті бастау →</button></div>';
  document.querySelector("#startQuiz").onclick=generateQuiz;
}
const quizObserver=new MutationObserver(()=>{if(document.querySelector("#outputSection:not(.hidden)"))addQuizStartButton();});
quizObserver.observe(document.body,{subtree:true,attributes:true,attributeFilter:["class"]});

