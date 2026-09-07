/* =====================================================================
   ALPHA ENGLISH KIDS – engine
   Hướng Nghiệp Alpha · bám sát SGK Global Success (GDPT 2018)
   ===================================================================== */
const $  = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const KEY = "alphaEnglishKids_v1";

/* Mã môn học trong hệ thống "Học Cùng Con" của HNA.
   TA1 Tiếng Anh tiểu học · TO1 Toán tiểu học · TA2 Tiếng Anh THCS
   TO2 Toán THCS · TA10 Luyện Anh vào 10 · KH2 KHTN THCS
   Tất cả chạy chung một tên miền nên phụ huynh chỉ đăng ký MỘT lần. */
const APP_CODE = "TA1";
const UKEY = "hnaHocCungCon_user_v1";   // hồ sơ phụ huynh dùng chung mọi môn
const HNA_DOMAIN = "huongnghiepalpha.vn";
const onHNA = () => location.hostname === HNA_DOMAIN || location.hostname.endsWith("."+HNA_DOMAIN);

/* Mỗi môn nằm ở một tên miền con riêng (ta1. to1. ta2. …). Trình duyệt coi mỗi
   tên miền con là một kho lưu trữ riêng, nên hồ sơ phụ huynh phải để trong
   COOKIE gắn với .huongnghiepalpha.vn thì cả 6 môn mới đọc chung được.
   localStorage giữ thêm một bản để mở lại môn cũ là vào ngay, kể cả offline. */
function cookieGet(k){
  const m = document.cookie.match(new RegExp("(?:^|; )"+k+"=([^;]*)"));
  try{ return m ? JSON.parse(decodeURIComponent(m[1])) : null; }catch(e){ return null; }
}
function cookieSet(k, v){
  if(!onHNA()) return;                       // chạy thử ở nơi khác thì bỏ qua
  const d = ";domain=."+HNA_DOMAIN+";path=/;samesite=Lax"+(location.protocol==="https:"?";secure":"");
  document.cookie = v
    ? k+"="+encodeURIComponent(JSON.stringify(v))+";max-age=63072000"+d   // 2 năm
    : k+"=;max-age=0"+d;
}
function loadUser(){
  let r = null;
  try{ r = JSON.parse(localStorage.getItem(UKEY)); }catch(e){}
  if(!(r && r.name && r.phone)) r = cookieGet(UKEY);
  return (r && r.name && r.phone) ? r : null;
}
function saveUser(u){
  try{ u ? localStorage.setItem(UKEY, JSON.stringify(u)) : localStorage.removeItem(UKEY); }catch(e){}
  cookieSet(UKEY, u);
}

/* Dán URL Google Apps Script của HNA vào đây để mọi lượt đăng nhập tự gửi về
   Google Sheet của trung tâm mà phụ huynh không phải cấu hình gì.
   Để trống thì app vẫn chạy bình thường, chỉ lưu trong máy. */
const HNA_GAS = "";

/* Google Form "Danh sách học sinh sử dụng App - Tiếng Anh" của HNA.
   Phụ huynh điền form trong app → dữ liệu vào thẳng Form/Sheet của trung tâm. */
/* Cơ sở dữ liệu Supabase của HNA (dự án hna-app).
   Khoá công khai này chỉ được phép GHI THÊM vào bảng ek_dangky —
   không đọc, không sửa, không xoá được dữ liệu của ai (đã bật RLS). */
const HNA_SB = {
  url : "https://pnzuufaoymxnnvebvxme.supabase.co/rest/v1/ek_dangky",
  key : "sb_publishable_EWku2NZNFVEvsczd3ox1MQ_Wxtq7mc-"
};

const HNA_FORM = {
  url  : "https://docs.google.com/forms/d/e/1FAIpQLSdi3eWOnJ7mjZQpntMvsWyShToLC2hbYFLIFegUxNIX-WWelA/formResponse",
  view : "https://docs.google.com/forms/d/e/1FAIpQLSdi3eWOnJ7mjZQpntMvsWyShToLC2hbYFLIFegUxNIX-WWelA/viewform",
  name : "entry.2084599815",   // Họ tên học sinh
  grade: "entry.67557030",     // Bé học lớp  (giá trị phải đúng dạng "Lớp 3")
  area : "entry.25860603",     // Khu vực
  phone: "entry.2037998561",   // Số điện thoại phụ huynh
  email: "entry.1607927163"    // Email
};

const DEF = { name:"", grade:3, sound:true, gas:"", user:null, userSent:"", pending:[],
  settings:{ len:10, time:25, voice:"" }, progress:{}, stickers:{} };
let S = load();
if(!S.gas && HNA_GAS) S.gas = HNA_GAS;

function load(){
  let st = null;
  try{ const r = JSON.parse(localStorage.getItem(KEY)); if(r) st = Object.assign({}, DEF, r,
      {settings:Object.assign({}, DEF.settings, r.settings||{})}); }catch(e){}
  if(!st) st = JSON.parse(JSON.stringify(DEF));
  /* Đã đăng ký ở môn khác trong "Học Cùng Con" thì vào thẳng, không hỏi lại */
  if(!st.user){
    const u = loadUser();
    if(u){ st.user = u; st.name = st.name || u.name; if(u.grade) st.grade = +u.grade; }
  }else{
    saveUser(st.user);   // nâng hồ sơ cũ lên kho dùng chung
  }
  return st;
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){} }

/* ---------- tiện ích ---------- */
const rnd  = n => Math.floor(Math.random()*n);
const shuf = a => { a=a.slice(); for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]];} return a; };
const pick = (a,n) => shuf(a).slice(0,n);
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9' ]/g,"").replace(/\s+/g," ").trim();
const cap  = s => s.charAt(0).toUpperCase()+s.slice(1);
const esc  = s => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

/* ---------- Sổ tay chương trình theo lớp ---------- */
const G3_GROUPS = [
 {label:"ME AND MY FRIENDS",vi:"Em và bạn bè",icon:"🧑‍🤝‍🧑",units:[1,2,3,4,5]},
 {label:"ME AND MY SCHOOL",vi:"Em và trường học",icon:"🏫",units:[6,7,8,9,10]},
 {label:"ME AND MY FAMILY",vi:"Em và gia đình",icon:"👨‍👩‍👧",units:[11,12,13,14,15]},
 {label:"ME AND THE WORLD AROUND",vi:"Em và thế giới quanh em",icon:"🌏",units:[16,17,18,19,20]}
];
const BOOK = {
  1:{units:G1, groups:G1_GROUPS, title:"Tiếng Anh 1 – Global Success",
     sub:"16 bài học · 16 chữ cái · làm quen tiếng Anh qua trò chơi"},
  2:{units:G2, groups:G2_GROUPS, title:"Tiếng Anh 2 – Global Success",
     sub:"16 bài học · 16 âm · bắt đầu đọc và viết từ ngắn"},
  3:{units:G3, groups:G3_GROUPS, title:"Tiếng Anh 3 – Global Success",
     sub:"20 bài học · 4 chủ điểm · Nghe – Nói – Đọc – Viết"},
  4:{units:G4, groups:G4_GROUPS, title:"Tiếng Anh 4 – Global Success",
     sub:"20 bài học · 4 chủ điểm · thêm thì quá khứ, chỉ đường, trọng âm"},
  5:{units:G5, groups:G5_GROUPS, title:"Tiếng Anh 5 – Global Success",
     sub:"20 bài học · 4 chủ điểm · trọng âm, nhịp câu và ngữ điệu"}
};
let GRADE = BOOK[S.grade] ? S.grade : 3;
const UNITS   = () => BOOK[GRADE].units;
const findU   = n => UNITS().find(u=>u.n===n);

const ALLW={}; [G1,G2,G3,G4,G5].forEach(bk=>bk.forEach(u=>u.words.forEach(w=>{ if(!ALLW[w.w]) ALLW[w.w]=w; })));
/* kho từ của lớp đang học – dùng để lấy phương án nhiễu */
let POOL = [], PICPOOL = [];
function buildPool(){
  POOL = [];
  UNITS().forEach(u => u.words.forEach(w => {
    if(!POOL.some(x=>x.w===w.w)) POOL.push(Object.assign({u:u.n}, w)); }));
  PICPOOL = POOL.filter(w => !w.g);
}
/* phiên âm kiểu Việt: gộp từ vựng của mọi lớp */
const VPMAP = {};
[G1,G2,G3,G4,G5].forEach(bk => bk.forEach(u => u.words.forEach(w => { VPMAP[w.w.toLowerCase()] = w.vp; })));

/* phiên âm kiểu Việt cho cả câu (phục vụ phụ huynh) – ưu tiên khớp cụm từ */
function vpLook(k){
  if(!k) return null;
  if(VPMAP[k]) return VPMAP[k];
  if(VP_EXTRA[k]) return VP_EXTRA[k];
  if(k.endsWith("s")){ const b=k.slice(0,-1); if(VPMAP[b]||VP_EXTRA[b]) return (VPMAP[b]||VP_EXTRA[b])+"-z"; }
  if(k.endsWith("es")){ const b=k.slice(0,-2); if(VPMAP[b]||VP_EXTRA[b]) return (VPMAP[b]||VP_EXTRA[b])+"-iz"; }
  return null;
}
function vnSay(sentence){
  const toks = sentence.split(/\s+/).map(t=>t.toLowerCase().replace(/[.,!?]/g,"")).filter(Boolean);
  const out=[];
  for(let i=0;i<toks.length;){
    let hit=null, take=1;
    for(let n=Math.min(3,toks.length-i); n>=1; n--){
      const found = vpLook(toks.slice(i,i+n).join(" "));
      if(found){ hit=found; take=n; break; }
    }
    out.push(hit || toks[i]); i+=take;
  }
  return out.join(" ");
}
const viOf = s => TRANS[s] || "";

/* ---------- âm thanh ---------- */
let AC=null;
function actx(){ if(!AC){ try{ AC=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } return AC; }

/* ---------- MỞ KHOÁ ÂM THANH TRÊN ĐIỆN THOẠI ----------
   Điện thoại (Android và iPhone) chặn mọi âm thanh cho tới khi người dùng
   chạm vào màn hình. Máy tính không chặn nên chạy thử trên máy tính không
   thấy lỗi. Hai thứ phải mở khoá riêng:
     · AudioContext  — sinh ra ở trạng thái "suspended", phải resume()
     · speechSynthesis — lần phát đầu tiên phải nằm trong một thao tác chạm
   Cách xử lý: mỗi lần bố mẹ/bé chạm màn hình thì đánh thức lại, và lần chạm
   đầu tiên phát một câu câm (volume 0) để xin quyền cho giọng đọc. */
let AUDIO_WARM = false;
function unlockAudio(){
  try{
    const c = actx();
    if(c && c.state === "suspended") c.resume().catch(()=>{});
  }catch(e){}
  if(!AUDIO_WARM && window.speechSynthesis){
    AUDIO_WARM = true;
    try{
      if(speechSynthesis.paused) speechSynthesis.resume();
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0; u.rate = 2; u.lang = "en-GB";
      speechSynthesis.speak(u);
    }catch(e){}
  }
}
["pointerdown","touchend","keydown"].forEach(ev =>
  addEventListener(ev, unlockAudio, {capture:true, passive:true}));
function tone(f,t,dur,type,vol){
  const c=actx(); if(!c||!S.sound) return;
  const o=c.createOscillator(), g=c.createGain();
  o.type=type||"sine"; o.frequency.setValueAtTime(f, c.currentTime+t);
  g.gain.setValueAtTime(0, c.currentTime+t);
  g.gain.linearRampToValueAtTime(vol||.16, c.currentTime+t+.02);
  g.gain.exponentialRampToValueAtTime(.0001, c.currentTime+t+dur);
  o.connect(g); g.connect(c.destination); o.start(c.currentTime+t); o.stop(c.currentTime+t+dur+.05);
}
const SFX = {
  ok(){ [523,659,784].forEach((f,i)=>tone(f,i*.07,.22,"triangle",.15)); },
  no(){ tone(220,0,.18,"sawtooth",.10); tone(165,.12,.26,"sawtooth",.10); },
  tap(){ tone(880,0,.06,"sine",.07); },
  win(){ [523,659,784,1047,1319].forEach((f,i)=>tone(f,i*.1,.3,"triangle",.16)); },
  tick(){ tone(1200,0,.03,"square",.04); }
};

/* ---------- giọng đọc ---------- */
let VOICES=[];
function loadVoices(){
  if(!window.speechSynthesis) return;
  VOICES = speechSynthesis.getVoices().filter(v=>/^en/i.test(v.lang));
  const sel=$("#setVoice");
  if(sel){
    sel.innerHTML = '<option value="">Tự động chọn</option>' +
      VOICES.map(v=>`<option value="${esc(v.name)}">${esc(v.name)} (${esc(v.lang)})</option>`).join("");
    sel.value = S.settings.voice||"";
  }
}
if(window.speechSynthesis){
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
  /* Android nạp danh sách giọng chậm và không phải máy nào cũng bắn sự kiện */
  [200,600,1200,2500].forEach(t=>setTimeout(loadVoices,t));
}

/* Máy có đọc được thật không? null = chưa biết · true = đã nghe thấy · false = hỏng.
   Dùng để tự bật chữ thay cho tiếng ở các bài "Nghe & chọn". */
let TTS_OK = window.speechSynthesis ? null : false;
function ttsHong(){
  if(TTS_OK === false) return;
  TTS_OK = false;
  document.body.classList.add("nosound");
  const b=$("#showSay"); if(b) b.click();
}
function ttsChay(){
  if(TTS_OK === true) return;
  TTS_OK = true;
  document.body.classList.remove("nosound");
}

function speak(text, rate){
  if(!window.speechSynthesis || !S.sound || !text) return;
  try{
    unlockAudio();
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(text));
    u.lang = "en-GB"; u.rate = rate || .85; u.pitch = 1.05;
    let v = VOICES.find(x=>x.name===S.settings.voice);
    if(!v) v = VOICES.find(x=>/en-GB/i.test(x.lang)) || VOICES.find(x=>/en/i.test(x.lang));
    if(v) { u.voice=v; u.lang=v.lang; }
    let xong = false;
    u.onstart = ()=>{ xong=true; ttsChay(); };
    u.onend   = ()=>{ xong=true; ttsChay(); };
    u.onerror = e =>{
      const l = e && e.error;
      if(l==="interrupted" || l==="canceled") return;   // do mình chủ động dừng
      ttsHong();
    };
    /* Android bị kẹt nếu speak() gọi ngay sau cancel() — lùi một nhịp */
    setTimeout(()=>{ try{
      if(speechSynthesis.paused) speechSynthesis.resume();
      speechSynthesis.speak(u);
    }catch(e){ ttsHong(); } }, 40);
    /* Không thấy đọc sau 1,8 giây thì coi như máy không đọc được */
    setTimeout(()=>{ if(!xong && !speechSynthesis.speaking) ttsHong(); }, 1800);
  }catch(e){ ttsHong(); }
}

function speakSeq(list,i){
  i=i||0; if(i>=list.length) return;
  speak(list[i]);
  setTimeout(()=>speakSeq(list,i+1), 1200);
}
/* ---------- pháo hoa ---------- */
const cvs=$("#confetti"), ctx2=cvs.getContext("2d"); let parts=[], anim=null;
function sizeCvs(){ cvs.width=innerWidth; cvs.height=innerHeight; }
sizeCvs(); addEventListener("resize", sizeCvs);
function confetti(n){
  const cols=["#F6B115","#FF9900","#4f8dfd","#ff6ea9","#22c3a6","#a97bff","#7bc96f"];
  for(let i=0;i<(n||70);i++) parts.push({x:innerWidth/2+(Math.random()-.5)*220, y:innerHeight*.35,
    vx:(Math.random()-.5)*9, vy:-Math.random()*12-4, s:5+Math.random()*7,
    c:cols[rnd(cols.length)], r:Math.random()*6, vr:(Math.random()-.5)*.4});
  if(!anim) anim=requestAnimationFrame(drawConf);
}
function drawConf(){
  ctx2.clearRect(0,0,cvs.width,cvs.height);
  parts = parts.filter(p=>p.y < innerHeight+40);
  parts.forEach(p=>{ p.vy+=.32; p.x+=p.vx; p.y+=p.vy; p.r+=p.vr;
    ctx2.save(); ctx2.translate(p.x,p.y); ctx2.rotate(p.r); ctx2.fillStyle=p.c;
    ctx2.fillRect(-p.s/2,-p.s/2,p.s,p.s*.6); ctx2.restore(); });
  if(parts.length) anim=requestAnimationFrame(drawConf); else { anim=null; ctx2.clearRect(0,0,cvs.width,cvs.height); }
}

/* ---------- điều hướng màn hình ---------- */
const SCREENS=["scHome","scUnits","scModes","scAdv","scPlay","scResult","scParent"];
function show(id){
  SCREENS.forEach(s=>$("#"+s).classList.toggle("hide", s!==id));
  document.body.classList.toggle("playing", id==="scPlay");
  scrollTo({top:0,behavior:"instant"});
  const nav = id==="scHome"?"home": id==="scParent"?"parent": (id==="scUnits"||id==="scModes"||id==="scAdv")?"units":"";
  $$(".bottomnav button").forEach(b=>b.classList.toggle("on", b.dataset.nav===nav));
}

/* ===================================================================
   MÀN HÌNH: TRANG CHỦ
   =================================================================== */
function renderHome(){
  $("#kidName").value = S.name||"";
  $("#gradeGrid").innerHTML = GRADE_MAP.map(g=>`
    <button class="grade ${g.cls} ${g.ready?"":"soon"}" data-g="${g.g}">
      ${g.ready?"":'<span class="badge">Sắp có</span>'}
      <span class="em">${g.em}</span>
      <b>Lớp ${g.g}</b>
      <span>${g.units} Unit · ${g.label}</span>
    </button>`).join("");
  $$("#gradeGrid .grade").forEach(b=>b.onclick=()=>{
    const g = GRADE_MAP.find(x=>x.g==b.dataset.g);
    SFX.tap();
    if(!g.ready){ alert("Lớp "+g.g+" đang được xây dựng.\n\n"+g.note+"\n\nHiện tại con hãy học Lớp 1 hoặc Lớp 3 nhé!"); return; }
    setGrade(g.g); renderUnits(); show("scUnits");
  });
  renderStickers();
}
function setGrade(g){ GRADE=g; S.grade=g; save(); buildPool(); }
function renderStickers(){
  const EM=["🌟","🎖️","🏆","🥇","🎯","🚀","🌈","🦄","🐬","🎨","🎪","🍀","💎","🔥","👑","🧩","🎵","⚡","🌻","🐧"];
  $("#stickerBook").innerHTML = UNITS().map((u,i)=>{
    const got = S.stickers[pkey(u.n)];
    return `<div class="sticker ${got?"":"off"}" title="Unit ${u.n} – ${esc(u.t)}">${got?EM[i%EM.length]:"🔒"}<small>U${u.n}</small></div>`;
  }).join("");
  $("#stickerNote").textContent = "Lớp "+GRADE+" · mỗi Unit đạt từ 80% trở lên, con nhận 1 huy hiệu. Cố lên nào! 🌟";
}

/* ===================================================================
   MÀN HÌNH: DANH SÁCH BÀI
   =================================================================== */
const pkey = n => GRADE+"-"+n;
function progOf(n){ return S.progress[pkey(n)] || {best:0,plays:0,wrong:{}}; }
function starsOf(p){ return p.best>=85?3 : p.best>=70?2 : p.best>=50?1 : 0; }

function renderUnits(){
  const bk=BOOK[GRADE];
  $("#unitsTitle").textContent = bk.title;
  $("#unitsSub").textContent   = bk.sub;
  const wk=weakWordList();
  $("#weakCard").innerHTML = wk.length>=4 ? `
    <button class="reviewcard weak" id="btnWeak">
      <span class="rc-em">🔁</span>
      <span class="rc-txt"><b>Ôn ${wk.length} từ con hay sai</b>
      <span>Gom từ nhầm nhiều nhất ở lớp ${GRADE} · trả lời đúng thì từ rời danh sách</span></span>
      <span class="rc-go">▶</span>
    </button>` : `<div class="card muted" style="text-align:center">🔁 Khi con làm bài và có từ sai, mục <b>Ôn từ hay sai</b> sẽ hiện ở đây.</div>`;
  if($("#btnWeak")) $("#btnWeak").onclick=()=>{ SFX.tap(); const u=weakUnit(); if(u) openUnitObj(u); };

  const nExt=extPool().length;
  $("#advCard").innerHTML=`
    <button class="reviewcard adv" id="btnAdv">
      <span class="rc-em">🚀</span>
      <span class="rc-txt"><b>Phần nâng cao lớp ${GRADE}</b>
      <span>Thử thách khó hơn · ${nExt} từ mở rộng ngoài SGK · luyện thi ${CAMB[GRADE]} · ngữ pháp</span></span>
      <span class="rc-go">▶</span>
    </button>`;
  $("#btnAdv").onclick=()=>{ SFX.tap(); renderAdv(); show("scAdv"); };

  $("#unitList").innerHTML = bk.groups.map((gr,gi)=>{
    const us = gr.units.map(findU).filter(Boolean);
    return `<div class="theme-bar"><i>${gr.icon}</i> ${esc(gr.vi)} <span class="muted" style="font-weight:600">· ${esc(gr.label)}</span></div>
    <div class="units">${us.map(u=>{
      const p=progOf(u.n), st=starsOf(p);
      return `<button class="unit" data-u="${u.n}">
        <div class="top"><span class="no">${u.n}</span>${u.letter?`<span class="ltag">${u.letter.U}${u.letter.l}</span>`:""}<span class="em">${u.e}</span></div>
        <h4>${esc(u.t)}</h4><div class="vi">${esc(u.vi)}</div>
        <div class="stars">${[1,2,3].map(i=>i<=st?"<b>★</b>":"★").join("")}</div>
        <div class="bar"><i style="width:${p.best}%"></i></div>
      </button>`;}).join("")}</div>
    ${(()=>{ const rp=progOf("R"+(gi+1));
      return `<button class="reviewcard" data-block="${gi}">
      <span class="rc-em">🏁</span>
      <span class="rc-txt"><b>Review ${gi+1}</b><span>Ôn cả chặng ${gr.units[0]}–${gr.units[gr.units.length-1]}${rp.best?` · điểm cao nhất ${rp.best}%`:""}</span></span>
      <span class="rc-go">▶</span></button>`; })()}`;
  }).join("");
  $$("#unitList .unit").forEach(b=>b.onclick=()=>{ SFX.tap(); openUnit(+b.dataset.u); });
  $$("#unitList .reviewcard").forEach(b=>b.onclick=()=>{ SFX.tap(); openUnitObj(blockUnit(+b.dataset.block)); });
}

/* ===================================================================
   MÀN HÌNH: CHỌN CHẾ ĐỘ
   =================================================================== */
const MODES3=[
 {id:"listen",em:"🎧",t:"Nghe & chọn",d:"Nghe cô đọc rồi chọn đúng hình",cls:"m-listen"},
 {id:"pic",   em:"🖼️",t:"Nhìn hình đoán từ",d:"Xem hình, chọn từ tiếng Anh",cls:"m-pic"},
 {id:"vi",    em:"🇻🇳",t:"Anh ↔ Việt",d:"Ghép từ với nghĩa tiếng Việt",cls:"m-vi"},
 {id:"phon",  em:"🔤",t:"Phonics – Ghép âm",d:"Tìm từ có âm giống bài học",cls:"m-phon"},
 {id:"spell", em:"⌨️",t:"Nghe & viết",d:"Nghe rồi gõ lại đúng chính tả",cls:"m-spell"},
 {id:"order", em:"🧱",t:"Xếp câu",d:"Sắp xếp các từ thành câu đúng",cls:"m-order"},
 {id:"dialog",em:"💬",t:"Hỏi & đáp",d:"Chọn câu trả lời phù hợp",cls:"m-dialog"},
 {id:"speak", em:"🎙️",t:"Luyện nói",d:"Đọc to, máy chấm phát âm",cls:"m-speak"},
 {id:"read",  em:"📖",t:"Đọc hiểu đoạn văn",d:"Đọc đoạn ngắn rồi trả lời câu hỏi",cls:"m-dialog"},
 {id:"write", em:"✍️",t:"Viết có gợi ý",d:"Điền từ vào đoạn, viết lại câu",cls:"m-spell"},
 {id:"match", em:"🃏",t:"Ghép cặp",d:"Nối từ với nghĩa thật nhanh",cls:"m-match"},
 {id:"mix",   em:"🎲",t:"Thử thách tổng hợp",d:"Trộn tất cả các dạng bài",cls:"m-mix"}
];
/* Lớp 1: bé chưa đọc được chữ → không có gõ chính tả và xếp câu.
   Thay bằng nhận diện chữ cái, âm đầu và nghe – chọn hình. */
const MODES1=[
 {id:"chant",   em:"🎵",t:"Bài vè",d:"Đọc theo nhịp cùng cô, bé nhắc lại",cls:"m-dialog"},
 {id:"g1listen",em:"🎧",t:"Nghe & chọn hình",d:"Nghe cô đọc rồi chỉ vào đúng hình",cls:"m-listen"},
 {id:"g1letter",em:"🔠",t:"Chữ hoa – chữ thường",d:"Tìm chữ thường của chữ hoa",cls:"m-phon"},
 {id:"g1sound", em:"🔤",t:"Âm đầu của từ",d:"Hình nào bắt đầu bằng chữ này?",cls:"m-order"},
 {id:"g1find",  em:"🔍",t:"Tìm chữ trong từ",d:"Từ nào có chứa chữ cái này?",cls:"m-dialog"},
 {id:"g1fill",  em:"✏️",t:"Điền chữ còn thiếu",d:"Chọn chữ cái còn thiếu trong từ",cls:"m-spell"},
 {id:"g1sent",  em:"💬",t:"Nghe câu & chọn hình",d:"Nghe cả câu rồi chọn hình đúng",cls:"m-pic"},
 {id:"g1vi",    em:"🇻🇳",t:"Từ này nghĩa gì?",d:"Nghe từ, chọn nghĩa tiếng Việt",cls:"m-vi"},
 {id:"speak",   em:"🎙️",t:"Nhắc lại theo cô",d:"Đọc to theo cô, máy chấm điểm",cls:"m-speak"},
 {id:"match",   em:"🃏",t:"Ghép hình với chữ",d:"Nối hình với từ tiếng Anh",cls:"m-match"},
 {id:"mix",     em:"🎲",t:"Thử thách tổng hợp",d:"Trộn tất cả các dạng bài",cls:"m-mix"}
];
/* Lớp 2: giữ các trò nhận diện âm của lớp 1, thêm đọc từ và viết từ ngắn */
const MODES2=[
 {id:"chant",   em:"🎵",t:"Bài vè",d:"Đọc theo nhịp cùng cô, bé nhắc lại",cls:"m-dialog"},
 {id:"g1listen",em:"🎧",t:"Nghe & chọn hình",d:"Nghe cô đọc rồi chọn đúng hình",cls:"m-listen"},
 {id:"pic",     em:"🖼️",t:"Nhìn hình đoán từ",d:"Xem hình, đọc và chọn từ đúng",cls:"m-pic"},
 {id:"vi",      em:"🇻🇳",t:"Anh ↔ Việt",d:"Ghép từ với nghĩa tiếng Việt",cls:"m-vi"},
 {id:"g1sound", em:"🔤",t:"Âm của bài",d:"Hình nào có âm con vừa học?",cls:"m-phon"},
 {id:"g1fill",  em:"✏️",t:"Điền chữ còn thiếu",d:"Chọn chữ cái còn thiếu trong từ",cls:"m-order"},
 {id:"g1sent",  em:"💬",t:"Nghe câu & chọn hình",d:"Nghe cả câu rồi chọn hình đúng",cls:"m-dialog"},
 {id:"dialog",  em:"🗨️",t:"Hỏi & đáp",d:"Chọn câu trả lời phù hợp",cls:"m-mix"},
 {id:"speak",   em:"🎙️",t:"Luyện nói",d:"Đọc to theo cô, máy chấm điểm",cls:"m-speak"},
 {id:"match",   em:"🃏",t:"Ghép cặp",d:"Nối từ với nghĩa thật nhanh",cls:"m-match"},
 {id:"mix",     em:"🎲",t:"Thử thách tổng hợp",d:"Trộn tất cả các dạng bài",cls:"m-mix"}
];
const MODES4 = MODES3.map(m => m.id==="phon"
  ? {id:"stress",em:"🔊",t:"Trọng âm",d:"Từ nào nhấn mạnh ở âm tiết này?",cls:"m-phon"} : m);
const MODES5 = (() => {
  const m = MODES4.slice();
  m.splice(m.findIndex(x=>x.id==="stress")+1, 0,
    {id:"intonation",em:"📈",t:"Lên giọng – Xuống giọng",d:"Câu nào đọc lên giọng ở cuối?",cls:"m-dialog"});
  return m;
})();
const ADV_MODES=[
 {id:"xtype", em:"🅰️",t:"Nhìn hình, tự gõ từ",d:"Không còn 4 lựa chọn",cls:"m-spell",sec:0},
 {id:"xdict", em:"📝",t:"Nghe & viết cả câu",d:"Chép chính tả nguyên câu",cls:"m-order",sec:0},
 {id:"xspeak",em:"🎤",t:"Nói cả câu",d:"Đọc trọn câu, máy chấm phát âm",cls:"m-speak",sec:0},
 {id:"elisten",em:"🌱",t:"Nghe & chọn hình",d:"Từ mới ngoài sách giáo khoa",cls:"m-listen",sec:1},
 {id:"epic",  em:"🌿",t:"Nhìn hình đoán từ",d:"Từ mới ngoài sách giáo khoa",cls:"m-pic",sec:1},
 {id:"evi",   em:"🍀",t:"Anh ↔ Việt",d:"Nghĩa của từ mở rộng",cls:"m-vi",sec:1},
 {id:"cscram",em:"🔤",t:"Sắp xếp chữ cái",d:"Dạng Spelling trong đề thi",cls:"m-phon",sec:2},
 {id:"codd",  em:"🧩",t:"Từ lạc nhóm",d:"Odd one out",cls:"m-dialog",sec:2},
 {id:"cyn",   em:"✅",t:"Đúng hay sai",d:"Nhìn hình, xét câu Yes/No",cls:"m-match",sec:2},
 {id:"cgap",  em:"🕳️",t:"Điền từ vào câu",d:"Gap fill",cls:"m-mix",sec:2},
 {id:"gform", em:"🔧",t:"Chọn dạng đúng",d:"is/are, do/does, a/an…",cls:"m-order",sec:3},
 {id:"gvi2en",em:"✍️",t:"Nhìn nghĩa Việt, viết câu Anh",d:"Dạng khó nhất",cls:"m-speak",sec:3}
];
const ADV_SECS=()=>[
 {t:"⚡ Thử thách · vẫn bám SGK nhưng khó hơn",
  n:"Bỏ 4 lựa chọn, đồng hồ ngắn hơn 40%, sai 3 lần là dừng lượt chơi."},
 {t:"🌱 Từ vựng mở rộng · ngoài SGK",
  n:"Từ cùng chủ đề với các bài trong lớp nhưng không có trong sách — mở rộng vốn từ."},
 {t:"🎓 Luyện thi Cambridge "+CAMB[GRADE],
  n:"Bốn dạng bài mô phỏng đề thi "+CAMB[GRADE]+" (trình độ thường gặp ở lớp "+GRADE+")."},
 {t:"🔧 Ngữ pháp & viết câu",
  n:"Chọn đúng dạng từ và tự viết trọn câu — bước chuyển sang kĩ năng viết."}
];
const ALLMODES=()=>MODES1.concat(MODES2,MODES3,MODES4,MODES5,ADV_MODES);
const curModes = () => GRADE===1 ? MODES1 : GRADE===2 ? MODES2
                     : GRADE===4 ? MODES4 : GRADE===5 ? MODES5 : MODES3;

let HARD=false, strikes=0;
let CUR=null; // unit hiện tại (có thể là "bài ảo": ôn tập / Review)

/* gom các từ con còn hay sai của lớp đang học */
function weakWordList(){
  const agg={};
  Object.keys(S.progress).filter(k=>k.startsWith(GRADE+"-")).forEach(k=>{
    const wr=S.progress[k].wrong||{};
    Object.keys(wr).forEach(w=>agg[w]=(agg[w]||0)+wr[w]);
  });
  return Object.keys(agg).map(w=>{ const d=POOL.find(x=>x.w===w); return d?Object.assign({miss:agg[w]},d):null; })
    .filter(Boolean).sort((a,b)=>b.miss-a.miss);
}
function weakUnit(){
  const words=weakWordList();
  if(words.length<4) return null;
  return {n:"W",t:"Ôn từ hay sai",vi:"Những từ con còn nhầm nhiều nhất",e:"🔁",
          words,pat:[],review:true,weak:true};
}
function blockUnit(gi){
  const gr=BOOK[GRADE].groups[gi];
  const us=gr.units.map(findU).filter(Boolean);
  const words=[],pat=[],letters=[],ph=[];
  us.forEach(u=>{
    u.words.forEach(w=>{ if(!words.some(x=>x.w===w.w)) words.push(w); });
    (u.pat||[]).forEach(p=>pat.push(p));
    if(u.letter) letters.push(u.letter);
    if(u.ph) u.ph.forEach(x=>ph.push(x));
  });
  const o={n:"R"+(gi+1),t:"Review "+(gi+1),vi:gr.vi+" · Unit "+gr.units[0]+"–"+gr.units[gr.units.length-1],
           e:"🏁",words,pat,review:true,block:gi};
  if(letters.length){ o.letters=letters; o.letter=letters[0]; }
  if(ph.length) o.ph=ph;
  return o;
}
function unitHeadHTML(u,p){
  const head=`
    <div style="display:flex;gap:12px;align-items:flex-start">
      <div style="font-size:40px">${u.e}</div>
      <div style="flex:1;min-width:0">
        <div class="muted" style="font-size:12px;font-weight:800;text-transform:uppercase">Unit ${u.n} · Lớp ${GRADE}${u.th?" · "+esc(THEMES[u.th].vi):""}</div>
        <div style="font-family:'Baloo 2',sans-serif;font-size:22px;line-height:1.15">${esc(u.t)}</div>
        <div class="muted">${esc(u.vi)}</div>
      </div>
      <div style="text-align:right"><div style="font-family:'Baloo 2',sans-serif;font-size:26px;color:var(--navy)">${p.best}%</div><div class="muted" style="font-size:11px">điểm cao nhất</div></div>
    </div>`;
  if(u.review){
    return head+`
    <div style="margin-top:12px;border-top:1px solid var(--line);padding-top:12px">
      <div class="note">${u.weak
        ? `🎯 Bộ này gom <b>${u.words.length} từ</b> con còn nhầm nhiều nhất ở lớp ${GRADE}. Mỗi lần con trả lời đúng, từ đó sẽ bớt “nợ” một lần; đúng hết thì từ rời khỏi danh sách.`
        : `🏁 Bài ôn cuối chặng, gộp <b>${u.words.length} từ</b> và <b>${u.pat.length} mẫu câu</b> của cả ${BOOK[GRADE].groups[u.block].units.length} bài trong chặng.`}</div>
      <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px">
        ${u.words.slice(0,14).map(w=>`<span style="background:var(--pale);border-radius:10px;padding:4px 10px;font-weight:800;font-size:13px">${w.e||"🔹"} ${esc(w.w)}${w.miss?` <span style="color:#b3271e">·${w.miss}</span>`:""}</span>`).join("")}
        ${u.words.length>14?`<span class="muted" style="align-self:center">…và ${u.words.length-14} từ nữa</span>`:""}
      </div>
    </div>`;
  }
  if(u.letter){
    const L=u.letter;
    return head+`
    <div style="margin-top:12px;border-top:1px solid var(--line);padding-top:12px">
      <div class="lettercard">
        <div class="big">${L.U}${L.l}</div>
        <div>
          <div style="font-weight:800;font-size:15px">Chữ cái của bài này</div>
          <div class="muted">Đọc tên chữ là “${esc(L.name)}” · phát âm “${esc(L.vp)}”</div>
          <div class="muted" style="margin-top:3px">${L.pos==="s"?"Nằm ở <b>đầu</b> các từ":"Nằm <b>bên trong</b> các từ"}: ${u.words.map(w=>hiLetter(w.w,L)).join(", ")}</div>
        </div>
        <button class="tbtn" style="background:var(--pale);color:var(--navy)" data-say="${esc(L.U)}, ${esc(L.l)}">🔊</button>
      </div>
      <div style="font-weight:800;font-size:13px;margin:12px 0 5px">🗣️ Mẫu câu của bài:</div>
      ${u.pat.map(p=>`<div style="font-size:14px;margin-bottom:3px">• <b>${esc(p[0])}</b> <span class="muted">${esc(viOf(p[0]))}</span></div>`).join("")}
    </div>`;
  }
  return head+`
    <div style="margin-top:12px;border-top:1px solid var(--line);padding-top:10px">
      <div style="font-weight:800;font-size:13px;margin-bottom:5px">🎯 Sau bài này con sẽ làm được:</div>
      <ul style="margin:0;padding-left:18px;font-size:13.5px;color:var(--muted);line-height:1.6">${u.comp.map(c=>`<li>${esc(c)}</li>`).join("")}</ul>
      <div style="font-weight:800;font-size:13px;margin:10px 0 5px">🗣️ Mẫu câu trọng tâm:</div>
      ${u.pat.map(p=>`<div style="font-size:13.5px;margin-bottom:3px">• <b>${esc(p[0])}</b> – ${esc(p[1])}</div>`).join("")}
      ${u.ph ? `<div style="font-weight:800;font-size:13px;margin:10px 0 5px">🔤 Âm cần luyện:</div>
      <div>${u.ph.map(x=>`<span style="display:inline-block;background:var(--pale);border-radius:10px;padding:5px 11px;margin:0 6px 6px 0;font-weight:800">${esc(x.k)} <span style="color:var(--muted);font-weight:600">như trong</span> ${esc(x.w)}</span>`).join("")}</div>` : ""}
      ${u.focus ? `<div style="font-weight:800;font-size:13px;margin:10px 0 5px">🔤 ${esc(u.focus.label)} của bài (theo SGK):</div>
      <div>${u.focus.items.map(x=>`<span style="display:inline-block;background:var(--pale);border-radius:10px;padding:5px 11px;margin:0 6px 6px 0;font-weight:800">${esc(x)}</span>`).join("")}</div>` : ""}
    </div>`;
}
/* tô đậm chữ cái mục tiêu trong một từ */
function hiLetter(word,L){
  const i = L.pos==="s" ? word.toLowerCase().indexOf(L.l) : word.toLowerCase().indexOf(L.l);
  if(i<0) return esc(word);
  return esc(word.slice(0,i))+'<b style="color:#e0342b">'+esc(word.slice(i,i+1))+'</b>'+esc(word.slice(i+1));
}
function openUnit(n){
  openUnitObj(typeof n==="object" ? n : findU(n));
}
function openUnitObj(u){
  CUR = u;
  const p=progOf(CUR.n);
  $("#unitHead").innerHTML = unitHeadHTML(CUR,p);
  $$("#unitHead [data-say]").forEach(b=>b.onclick=()=>speak(b.dataset.say));
  $("#modeGrid").innerHTML = curModes().map(m=>{
    const ready = buildQuestions(CUR,m.id,1).length>0;
    return `<button class="mode ${m.cls} ${ready?"":"lock"}" data-m="${m.id}" ${ready?"":"disabled"}>
      <span class="em">${m.em}</span><b>${m.t}</b><span>${ready?m.d:"Bài này chưa có dạng bài đó"}</span></button>`;
  }).join("");
  $$("#modeGrid .mode").forEach(b=>b.onclick=()=>{ SFX.tap(); startSession(b.dataset.m); });
  $("#unitWords").innerHTML = CUR.words.map(w=>`
    <div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--line)">
      <span style="font-size:23px;width:30px;text-align:center">${w.e||"🔹"}</span>
      <div style="flex:1;min-width:0"><b>${esc(w.w)}</b> <span class="muted">${esc(w.ipa)}</span><div class="muted" style="font-size:12.5px">${esc(w.vi)} · đọc là “${esc(w.vp)}”</div></div>
      <button class="tbtn" style="background:var(--pale);color:var(--navy)" data-say="${esc(w.w)}">🔊</button>
    </div>`).join("");
  $$("#unitWords [data-say]").forEach(b=>b.onclick=()=>speak(b.dataset.say));
  show("scModes");
}

function renderAdv(){
  CUR = advUnit();
  $("#advSub").textContent = "Lớp "+GRADE+" · "+CUR.words.length+" từ SGK + "+CUR.ext.length+" từ mở rộng · luôn mở, con thích thì vào";
  const secs=ADV_SECS();
  $("#advList").innerHTML = secs.map((sec,si)=>{
    const ms=ADV_MODES.filter(m=>m.sec===si);
    return `<div class="sect-title"><span class="dot"></span>${esc(sec.t)}</div>
      <div class="note" style="margin-bottom:10px">${esc(sec.n)}</div>
      <div class="modes">${ms.map(m=>{
        const ready = buildQuestions(CUR,m.id,1).length>0;
        return `<button class="mode ${m.cls} ${ready?"":"lock"}" data-m="${m.id}" ${ready?"":"disabled"}>
          <span class="em">${m.em}</span><b>${m.t}</b><span>${ready?m.d:"Lớp này chưa đủ dữ liệu"}</span></button>`;
      }).join("")}</div>`;
  }).join("");
  $$("#advList .mode").forEach(b=>b.onclick=()=>{ SFX.tap(); startSession(b.dataset.m); });
}

/* ===================================================================
   SINH CÂU HỎI
   =================================================================== */
/* phương án nhiễu: ưu tiên từ trong cùng bài → cùng chủ điểm → toàn cấp lớp */
function distract(correct, n, near, wide, uniqE){
  const out=[], seen=new Set([correct.w]);
  const es = uniqE ? new Set([correct.e]) : null;
  const take = arr => { for(const c of shuf(arr||[])){ if(out.length>=n) break;
    if(seen.has(c.w)) continue;
    if(es){ if(!c.e || es.has(c.e)) continue; es.add(c.e); }
    seen.add(c.w); out.push(c); } };
  take(near); take(wide);
  if(es && out.length<n){            // không đủ hình khác nhau thì mới nới lỏng
    const s2=new Set([correct.w,...out.map(o=>o.w)]);
    for(const c of shuf((near||[]).concat(wide||[]))){ if(out.length>=n) break;
      if(s2.has(c.w)) continue; s2.add(c.w); out.push(c); }
  }
  return out;
}
function unitWords(u,onlyPic){ return (onlyPic? u.words.filter(w=>!w.g) : u.words); }

function qListen(u){
  const ws=unitWords(u,true); if(ws.length<2) return null;
  const c=ws[rnd(ws.length)];
  const d=distract(c,3,ws,PICPOOL,true);
  const opts=shuf([c].concat(d));
  return {mode:"listen",tag:"Nghe & chọn",say:c.w,auto:true,word:c,
    prompt:"Con nghe rồi chọn hình đúng nhé!",big:"🎧",opts,correct:c.w,optView:"emoji"};
}
function qPic(u){
  const ws=unitWords(u,true); if(ws.length<2) return null;
  const c=ws[rnd(ws.length)];
  const opts=shuf([c].concat(distract(c,3,ws,PICPOOL,true)));
  return {mode:"pic",tag:"Nhìn hình đoán từ",word:c,big:c.e,
    prompt:"Đây là gì trong tiếng Anh?",opts,correct:c.w,optView:"word",say:null};
}
function qVi(u){
  const ws=u.words; const c=ws[rnd(ws.length)];
  const e2v = Math.random()<.5;
  const opts=shuf([c].concat(distract(c,3,ws,POOL)));
  if(e2v) return {mode:"vi",tag:"Anh → Việt",word:c,say:c.w,
    prompt:c.w,sub:c.ipa,opts,correct:c.w,optView:"vi"};
  return {mode:"vi",tag:"Việt → Anh",word:c,
    prompt:c.vi,sub:"Từ tiếng Anh nào có nghĩa này?",opts,correct:c.w,optView:"word"};
}
/* Phonics: lọc theo ÂM (ký hiệu IPA) chứ không chỉ theo chữ cái, để không dạy sai
   mối tương ứng âm – chữ (vd "o" trong old /əʊ/ khác "o" trong mother /ʌ/). */
function qPhon(u){
  if(!u.ph || !u.ph.length) return null;
  const t = u.ph[rnd(u.ph.length)];
  const hasSp = w => t.p==="s" ? w.w.toLowerCase().startsWith(t.k) : w.w.toLowerCase().includes(t.k);
  const hasSo = w => !t.s || String(w.ipa||"").includes(t.s);
  const inU = (u.words||[]).filter(w=>hasSp(w)&&hasSo(w));
  const good = inU.length ? inU : POOL.filter(w=>hasSp(w)&&hasSo(w));
  let bad = POOL.filter(w=>!hasSp(w) && !hasSo(w));
  if(bad.length<3) bad = POOL.filter(w=>!hasSp(w));
  if(!good.length||bad.length<3) return null;
  const c = good[rnd(good.length)];
  const opts=shuf([c].concat(pick(bad,3)));
  const am = t.s ? `âm /${t.s}/` : `chữ “${t.k}”`;
  return {mode:"phon",tag:"Phonics",word:c,say:t.w,big:"🔤",
    prompt:`Từ nào có ${am} như trong từ ${t.w}?`,
    sub: t.s ? `Chữ “${t.k}” ở đây đọc là /${t.s}/` : "",
    opts,correct:c.w,optView:"word",
    explain:`<b>${esc(c.w)}</b> ${esc(c.ipa)} – ${esc(c.vi)} · cùng ${am} với <b>${esc(t.w)}</b>`};
}
function qSpell(u){
  const ws=u.words.filter(w=>w.w.length<=12 && !/\s/.test(w.w));
  if(!ws.length) return null;
  const c=ws[rnd(ws.length)];
  return {mode:"spell",tag:"Nghe & viết",word:c,say:c.w,auto:true,
    prompt:"Nghe rồi gõ lại từ con vừa nghe",correct:c.w,input:true};
}
function qOrder(u){
  if(!u.pat || !u.pat.length) return null;
  const sents=[]; u.pat.forEach(p=>{ p.forEach(s=>{ if(s.split(/\s+/).length>=3 && s.split(/\s+/).length<=8) sents.push(s); }); });
  if(!sents.length) return null;
  const s=sents[rnd(sents.length)];
  return {mode:"order",tag:"Xếp câu",say:s,prompt:"Sắp xếp các từ thành câu đúng",
    sub:viOf(s), correct:s, tokens:shuf(s.split(/\s+/))};
}
function qDialog(u){
  if(!u.pat || !u.pat.length) return null;
  const c=u.pat[rnd(u.pat.length)];
  const others=[]; UNITS().forEach(x=>x.pat.forEach(p=>{ if(p[1]!==c[1]) others.push(p[1]); }));
  const opts=shuf([c[1]].concat(pick([...new Set(others)],3))).map(t=>({w:t,vi:viOf(t)}));
  return {mode:"dialog",tag:"Hỏi & đáp",say:c[0],prompt:c[0],sub:viOf(c[0]),
    opts,correct:c[1],optView:"sent"};
}
function qSpeak(u){
  if(!u.words || !u.words.length) return null;
  const useSent = (u.pat && u.pat.length) ? Math.random()<.45 : false;
  if(useSent){ const p=u.pat[rnd(u.pat.length)]; const s=p[rnd(2)];
    return {mode:"speak",tag:"Luyện nói",say:s,prompt:s,sub:viOf(s),correct:s,mic:true}; }
  const c=u.words[rnd(u.words.length)];
  return {mode:"speak",tag:"Luyện nói",say:c.w,prompt:c.w,sub:c.ipa+" · "+c.vi,word:c,correct:c.w,mic:true,big:c.e};
}
function qMatch(u){
  const ws=pick(u.words, Math.min(5,u.words.length));
  return {mode:"match",tag:"Ghép cặp",prompt:"Nối từ tiếng Anh với nghĩa tiếng Việt",pairs:ws,board:true};
}
/* ================= LỚP 1 – dạng bài cho bé chưa đọc được chữ ================= */
function frameSent(u,w){
  if(!u.frame || !u.frame.words.includes(w.w)) return null;
  const f=u.frame, word = f.plural ? (w.pl || w.w+"s") : w.w;
  const be = (f.plural || w.many) ? "are" : "is";
  return { en:f.t.replace("{w}",word).replace("{p}",word).replace("{be}",be),
           vi:f.vi.replace("{v}",w.vi) };
}
const pickL = u => (u.letters && u.letters.length) ? u.letters[rnd(u.letters.length)] : u.letter;
const hasLetter = (word,L) => L.pos==="s"
  ? word.toLowerCase().startsWith(L.l)
  : word.toLowerCase().includes(L.l);

function g1Listen(u){
  const ws=u.words; if(ws.length<2) return null;
  const c=ws[rnd(ws.length)];
  const opts=shuf([c].concat(distract(c,3,ws,PICPOOL,true)));
  return {mode:"g1listen",tag:"Nghe & chọn hình",say:c.w,auto:true,word:c,big:"🎧",
    prompt:"Con nghe rồi chạm vào đúng hình nhé!",opts,correct:c.w,optView:"emojiOnly"};
}
function g1Letter(u){
  if(!u.letter) return null;
  const L=pickL(u);
  const pool = UNITS().map(x=>x.letter).filter(x=>x.l!==L.l);
  const c={w:L.l};
  const opts=shuf([c].concat(pick(pool,3).map(o=>({w:o.l}))));
  return {mode:"g1letter",tag:"Chữ hoa – chữ thường",say:L.U+", "+L.l,bigLetter:L.U,
    prompt:"Chữ thường của chữ này là chữ nào?",sub:"Tên chữ: "+L.name+" · đọc “"+L.vp+"”",
    opts,correct:L.l,optView:"letter",
    explain:`Chữ hoa <b>${L.U}</b> đi cùng chữ thường <b>${L.l}</b> · tên chữ “${L.name}”, đọc là “${L.vp}”`};
}
function g1Sound(u){
  if(!u.letter) return null;
  const L=pickL(u);
  const good=POOL.filter(w=>hasLetter(w.w,L));
  const bad =POOL.filter(w=>!hasLetter(w.w,L) && w.e);
  if(!good.length||bad.length<3) return null;
  const c=good[rnd(good.length)];
  const opts=shuf([c].concat(pick(bad,3)));
  return {mode:"g1sound",tag:"Âm đầu của từ",say:L.U+" "+L.l,bigLetter:L.U+L.l,
    prompt:L.pos==="s" ? `Hình nào bắt đầu bằng chữ “${L.l}”?` : `Hình nào có chữ “${L.l}” trong từ?`,
    sub:`Đọc là “${L.vp}”`, opts,correct:c.w,optView:"emojiOnly",word:c};
}
function g1Find(u){
  if(!u.letter) return null;
  const L=pickL(u);
  const good=POOL.filter(w=>hasLetter(w.w,L));
  const bad =POOL.filter(w=>!w.w.toLowerCase().includes(L.l));
  if(!good.length||bad.length<3) return null;
  const c=good[rnd(good.length)];
  const opts=shuf([c].concat(pick(bad,3)));
  return {mode:"g1find",tag:"Tìm chữ trong từ",say:L.l,bigLetter:L.U+L.l,
    prompt:`Từ nào có chữ “${L.l}”?`,sub:"Con nhìn thật kĩ nhé!",
    opts,correct:c.w,optView:"wordBig",word:c};
}
function g1Fill(u){
  if(!u.letter) return null;
  const L=pickL(u);
  const ws=u.words.filter(w=>!/\s/.test(w.w) && w.w.toLowerCase().includes(L.l));
  if(!ws.length) return null;
  const c=ws[rnd(ws.length)];
  const i=c.w.toLowerCase().indexOf(L.l);
  const gap=c.w.slice(0,i)+"_"+c.w.slice(i+1);
  const pool=UNITS().map(x=>x.letter.l).filter(x=>x!==L.l);
  const opts=shuf([{w:L.l}].concat(pick([...new Set(pool)],3).map(x=>({w:x}))));
  return {mode:"g1fill",tag:"Điền chữ còn thiếu",say:c.w,word:c,big:c.e,
    prompt:gap,sub:c.vi+" · chọn chữ cái còn thiếu",opts,correct:L.l,optView:"letter",gapWord:true};
}
function g1Sent(u){
  const ws=u.words.filter(w=>frameSent(u,w));
  if(!ws.length) return null;
  const c=ws[rnd(ws.length)];
  const s=frameSent(u,c);
  const opts=shuf([c].concat(distract(c,3,u.words,PICPOOL,true)));
  return {mode:"g1sent",tag:"Nghe câu & chọn hình",say:s.en,auto:true,word:c,big:"🗣️",
    prompt:"Nghe cả câu rồi chọn hình đúng",sub:"Chạm loa để nghe lại nhé!",opts,correct:c.w,optView:"emojiOnly",
    explain:`<b>${s.en}</b> – ${s.vi}`};
}
function g1Vi(u){
  const ws=u.words; const c=ws[rnd(ws.length)];
  const opts=shuf([c].concat(distract(c,3,ws,POOL)));
  return {mode:"g1vi",tag:"Từ này nghĩa gì?",say:c.w,auto:true,word:c,big:c.e,
    prompt:c.w,sub:c.ipa,opts,correct:c.w,optView:"vi"};
}

function qStress(u){
  const pool = POOL.filter(w=>w.st && !/\s/.test(w.w));
  const mine = u.words.filter(w=>w.st && !/\s/.test(w.w));
  if(pool.length<6) return null;
  const c = (mine.length && Math.random()<.7) ? mine[rnd(mine.length)] : pool[rnd(pool.length)];
  const bad = pool.filter(w=>w.st!==c.st);
  if(bad.length<3) return null;
  const ord = ["nhất","hai","ba"][c.st-1] || String(c.st);
  const opts = shuf([c].concat(pick(bad,3)));
  return {mode:"stress",tag:"Trọng âm",word:c,
    prompt:`Từ nào nhấn trọng âm ở âm tiết thứ ${ord}?`,
    sub:"Bấm nút loa để nghe cả 4 từ, chú ý chỗ đọc mạnh hơn nhé!",
    sayAll:opts.map(o=>o.w),
    opts,correct:c.w,optView:"wordBig",
    explain:`<b>${c.w}</b> ${c.ipa} – ${c.vi} · nhấn ở âm tiết thứ ${ord}`};
}
const WH_Q = /^(what|where|when|who|whose|why|which|how)\b/i;
const YN_Q = /^(do|does|did|is|are|was|were|will|would|can|could|shall|should|have|has|may)\b/i;
function intoOf(sent){
  const t=String(sent).trim();
  if(!/\?$/.test(t)) return "fall";      // câu kể -> xuống giọng
  if(WH_Q.test(t))    return "fall";      // câu hỏi Wh- -> xuống giọng
  if(YN_Q.test(t))    return "rise";      // câu hỏi Yes/No -> lên giọng
  return null;
}
function sentPool(){
  const out=[];
  UNITS().forEach(u=>u.pat.forEach(p=>p.forEach(s=>{
    const d=intoOf(s);
    if(d && s.split(/\s+/).length>=3 && !out.some(x=>x.w===s)) out.push({w:s,vi:viOf(s),dir:d});
  })));
  return out;
}
function qIntonation(u){
  if(!u.pat) return null;
  const all=sentPool(); if(all.length<8) return null;
  const mine=[]; u.pat.forEach(p=>p.forEach(s=>{ const f=all.find(x=>x.w===s); if(f) mine.push(f); }));
  const dir = Math.random()<.5 ? "rise" : "fall";
  const good=(mine.filter(x=>x.dir===dir).length && Math.random()<.7 ? mine : all).filter(x=>x.dir===dir);
  const bad = all.filter(x=>x.dir!==dir);
  if(!good.length || bad.length<3) return null;
  const c=good[rnd(good.length)];
  const opts=shuf([c].concat(pick(bad,3)));
  const up = dir==="rise";
  return {mode:"intonation",tag:"Ngữ điệu",
    prompt: up ? "Câu nào đọc LÊN giọng ở cuối? ↗" : "Câu nào đọc XUỐNG giọng ở cuối? ↘",
    sub: up ? "Mẹo: câu hỏi Yes/No thì lên giọng"
            : "Mẹo: câu kể và câu hỏi Wh- (What, Where, How…) thì xuống giọng",
    sayAll:opts.map(o=>o.w), opts, correct:c.w, optView:"sent",
    explain:`<b>${esc(c.w)}</b> – ${esc(c.vi||"")} · ${up?"câu hỏi Yes/No nên đọc <b>lên giọng ↗</b>":"đọc <b>xuống giọng ↘</b>"}`};
}

/* ===================================================================
   PHẦN NÂNG CAO
   =================================================================== */
const TOPIC_VI={animals:"con vật",food:"đồ ăn thức uống",body:"bộ phận cơ thể",
 school:"đồ dùng học tập",home:"đồ trong nhà",clothes:"quần áo",colours:"màu sắc",
 family:"người trong gia đình",jobs:"nghề nghiệp",sports:"thể thao",transport:"phương tiện đi lại",
 nature:"thiên nhiên",weather:"thời tiết",time:"thời gian",numbers:"con số",
 feelings:"cảm xúc",places:"địa điểm",activities:"hoạt động",toys:"đồ chơi",travel:"du lịch"};

function extPool(){
  const out=[];
  (EXT_GRADE[GRADE]||[]).forEach(t=>(EXT[t]||[]).forEach(w=>{
    if(POOL.some(x=>x.w.toLowerCase()===w.w.toLowerCase())) return;   // trùng SGK thì bỏ
    if(!out.some(x=>x.w===w.w)) out.push(Object.assign({ext:1,topic:t},w));
  }));
  return out;
}
function advUnit(){
  const words=[],pat=[];
  UNITS().forEach(u=>{
    u.words.forEach(w=>{ if(!words.some(x=>x.w===w.w)) words.push(w); });
    (u.pat||[]).forEach(p=>pat.push(p));
  });
  return {n:"A",t:"Nâng cao lớp "+GRADE,vi:"Thử thách · mở rộng · Cambridge · ngữ pháp",
          e:"🚀",words,pat,ext:extPool(),review:true,adv:true};
}
function allSents(u){
  const out=[]; (u.pat||[]).forEach(p=>p.forEach(x=>{ if(!out.includes(x)) out.push(x); })); return out;
}

/* --- Thử thách: khó hơn trên cùng nội dung SGK --- */
function qXType(u){
  const ws=u.words.filter(w=>!w.g && w.e && !/\s/.test(w.w) && w.w.length<=12);
  if(!ws.length) return null;
  const c=ws[rnd(ws.length)];
  return {mode:"xtype",tag:"Thử thách",word:c,big:c.e,say:c.w,
    prompt:"Từ này viết thế nào?",sub:c.vi+" · "+c.w.length+" chữ cái · không có gợi ý",
    correct:c.w,input:true,noHint:true};
}
function qXDict(u){
  const ss=allSents(u).filter(x=>{const n=x.split(/\s+/).length; return n>=3&&n<=8;});
  if(!ss.length) return null;
  const x=ss[rnd(ss.length)];
  return {mode:"xdict",tag:"Chép chính tả",say:x,auto:true,
    prompt:"Nghe rồi viết lại CẢ CÂU",sub:x.split(/\s+/).length+" từ · bấm loa để nghe lại",
    correct:x,input:true,noHint:true,explain:`Câu đúng: <b>${esc(x)}</b> – ${esc(viOf(x)||"")}`};
}
function qXSpeak(u){
  const ss=allSents(u).filter(x=>x.split(/\s+/).length>=3);
  if(!ss.length) return null;
  const x=ss[rnd(ss.length)];
  return {mode:"xspeak",tag:"Nói cả câu",say:x,prompt:x,sub:viOf(x),correct:x,mic:true};
}

/* --- Từ vựng mở rộng ngoài SGK --- */
function extQ(u,kind){
  const ex=u.ext||[]; if(ex.length<4) return null;
  const c=ex[rnd(ex.length)];
  const opts=shuf([c].concat(distract(c,3,ex,POOL,true)));
  const tag="Mở rộng · "+(TOPIC_VI[c.topic]||"");
  if(kind==="elisten") return {mode:"elisten",tag,say:c.w,auto:true,word:c,
    prompt:"Nghe rồi chọn hình đúng",opts,correct:c.w,optView:"emojiOnly"};
  if(kind==="epic") return {mode:"epic",tag,word:c,big:c.e,
    prompt:"Đây là gì trong tiếng Anh?",opts,correct:c.w,optView:"word"};
  return {mode:"evi",tag,word:c,say:c.w,auto:true,
    prompt:c.w,sub:c.ipa,opts,correct:c.w,optView:"vi"};
}
const qEListen=u=>extQ(u,"elisten"), qEPic=u=>extQ(u,"epic"), qEVi=u=>extQ(u,"evi");

/* --- Luyện thi Cambridge --- */
function qCScram(u){
  const pool=u.words.concat(u.ext||[]).filter(w=>!/\s/.test(w.w)&&w.w.length>=3&&w.w.length<=9&&w.e);
  if(!pool.length) return null;
  const c=pool[rnd(pool.length)];
  return {mode:"cscram",tag:CAMB[GRADE]+" · Spelling",word:c,big:c.e,say:c.w,
    prompt:"Sắp xếp các chữ cái thành từ đúng",sub:c.vi,
    correct:c.w,tokens:shuf(c.w.split("")),join:""};
}
function qCOdd(u){
  const gs=[], byTopic={};
  (u.ext||[]).forEach(w=>{ (byTopic[w.topic]=byTopic[w.topic]||[]).push(w); });
  Object.keys(byTopic).forEach(k=>{ if(byTopic[k].length>=3) gs.push({k,vi:TOPIC_VI[k]||k,ws:byTopic[k]}); });
  UNITS().forEach(x=>{ const ws=x.words.filter(w=>!w.g&&w.e&&!/\s/.test(w.w));
    if(ws.length>=3) gs.push({k:"u"+x.n,vi:"Unit "+x.n+" – "+x.t,ws}); });
  if(gs.length<2) return null;
  const g=gs[rnd(gs.length)];
  const three=pick(g.ws,3);
  const others=gs.filter(x=>x.k!==g.k);
  for(const og of shuf(others)){
    const cand=og.ws.filter(w=>!three.some(t=>t.w===w.w) && !g.ws.some(t=>t.w===w.w));
    if(!cand.length) continue;
    const odd=cand[rnd(cand.length)];
    return {mode:"codd",tag:CAMB[GRADE]+" · Odd one out",word:odd,
      prompt:"Từ nào KHÔNG cùng nhóm với ba từ kia?",sub:"Đọc kĩ cả bốn từ nhé",
      opts:shuf(three.concat([odd])),correct:odd.w,optView:"wordBig",
      explain:`Ba từ kia đều thuộc nhóm <b>${esc(g.vi)}</b>; <b>${esc(odd.w)}</b> (${esc(odd.vi)}) thì không.`};
  }
  return null;
}
function qCYN(u){
  const ws=u.words.concat(u.ext||[]).filter(w=>!w.g&&w.e&&!/\s/.test(w.w));
  if(ws.length<4) return null;
  const pic=ws[rnd(ws.length)];
  const yes=Math.random()<.5;
  const other=shuf(ws.filter(w=>w.w!==pic.w && w.e!==pic.e))[0];
  if(!other) return null;
  const name=yes?pic:other;
  const art=/^[aeiou]/i.test(name.w)?"an":"a";
  const sent=`This is ${art} ${name.w}.`;
  return {mode:"cyn",tag:CAMB[GRADE]+" · Yes / No",big:pic.e,say:sent,
    prompt:sent,sub:"Câu này nói ĐÚNG về bức hình chứ?",
    opts:[{w:"Yes",vi:"Đúng"},{w:"No",vi:"Sai"}],correct:yes?"Yes":"No",optView:"yn",
    explain: yes ? `Đúng — đây là <b>${esc(pic.w)}</b> (${esc(pic.vi)}).`
                 : `Sai — trong hình là <b>${esc(pic.w)}</b> (${esc(pic.vi)}), không phải <b>${esc(name.w)}</b>.`};
}
function qCGap(u){
  const ss=allSents(u).filter(x=>x.split(/\s+/).length>=4);
  for(const x of shuf(ss)){
    const toks=x.split(/\s+/);
    const cands=toks.map((t,i)=>({t,i}))
      .filter(o=>POOL.some(w=>w.w.toLowerCase()===o.t.replace(/[.,!?]/g,"").toLowerCase() && !/\s/.test(w.w)));
    if(!cands.length) continue;
    const g=cands[rnd(cands.length)];
    const clean=g.t.replace(/[.,!?]/g,"");
    const cw=POOL.find(w=>w.w.toLowerCase()===clean.toLowerCase());
    const bad=POOL.filter(w=>w.w.toLowerCase()!==clean.toLowerCase() && !/\s/.test(w.w));
    if(bad.length<3) continue;
    return {mode:"cgap",tag:CAMB[GRADE]+" · Gap fill",say:x,
      prompt:toks.map((t,i)=>i===g.i?"_____":t).join(" "),
      sub:"Chọn từ đúng điền vào chỗ trống",
      opts:shuf([cw].concat(pick(bad,3))),correct:cw.w,optView:"word",
      explain:`Câu đúng: <b>${esc(x)}</b> – ${esc(viOf(x)||"")}`};
  }
  return null;
}

/* --- Ngữ pháp & viết câu --- */
function qGForm(u){
  for(const x of shuf(allSents(u))){
    const toks=x.split(/\s+/);
    for(const i of shuf(toks.map((_,k)=>k))){
      const clean=toks[i].replace(/[.,!?]/g,"").toLowerCase();
      const set=GRAM_SETS.find(gg=>gg.includes(clean));
      if(!set) continue;
      const others=set.filter(v=>v!==clean);
      if(others.length<1) continue;
      const opts=shuf([clean].concat(pick(others,Math.min(3,others.length)))).map(v=>({w:v}));
      return {mode:"gform",tag:"Ngữ pháp",say:x,
        prompt:toks.map((t,k)=>k===i?"____":t).join(" "),
        sub:"Chọn dạng đúng để hoàn thành câu",
        opts,correct:clean,optView:"word",
        explain:`Câu đúng: <b>${esc(x)}</b> – ${esc(viOf(x)||"")}`};
    }
  }
  return null;
}
function qGVi2En(u){
  const ss=allSents(u).filter(x=>viOf(x) && x.split(/\s+/).length>=3 && x.split(/\s+/).length<=7);
  if(!ss.length) return null;
  const x=ss[rnd(ss.length)];
  return {mode:"gvi2en",tag:"Viết câu",say:x,
    prompt:viOf(x),sub:"Viết lại câu này bằng tiếng Anh · gợi ý chữ đầu: "+x.split(/\s+/).map(t=>t[0]).join(" "),
    correct:x,input:true,noHint:true,explain:`Câu đúng: <b>${esc(x)}</b>`};
}

/* ================= ĐỌC HIỂU – VIẾT CÓ GỢI Ý (lớp 3–5) =================
   Chuẩn Thông tư 32/2018 cuối tiểu học: đọc hiểu văn bản ngắn 30–40 từ;
   viết văn bản ngắn 10–20 từ có gợi ý. Đoạn văn là văn bản gốc của HNA,
   chỉ dùng từ vựng và mẫu câu của chính bài đó. */
const READB = {3:(typeof READ3!=="undefined"?READ3:null),
               4:(typeof READ4!=="undefined"?READ4:null),
               5:(typeof READ5!=="undefined"?READ5:null)};
function readOf(u){ const R=READB[GRADE]; return (R && u && u.n && R[u.n]) ? R[u.n] : null; }
const splitSent = s => String(s).split(/(?<=[.!?])\s+/).filter(x=>x.trim());

function qRead(u){
  const r=readOf(u); if(!r||!r.q||!r.q.length) return null;
  const qq=r.q[rnd(r.q.length)];
  return {mode:"read",tag:"Đọc hiểu",passage:r.p,pvi:r.vi,say:r.p,
    prompt:qq.q, sub:"Đọc kỹ đoạn văn ở trên rồi chọn đáp án",
    opts:shuf(qq.o.map(w=>({w}))), correct:qq.a, optView:"sent"};
}
function qWrite(u){
  const r=readOf(u); if(!r) return null;
  const en=splitSent(r.p), vi=splitSent(r.vi);
  /* (b) viết lại 2 câu đầu bằng tiếng Anh – chỉ mở khi bản dịch tách câu khớp */
  if(en.length===vi.length && en.length>=3 && Math.random()<.4){
    const i=rnd(en.length-1);
    const target=(en[i]+" "+en[i+1]).trim();
    const n=target.split(/\s+/).length;
    if(n>=8 && n<=22){
      return {mode:"write",tag:"Viết có gợi ý",passage:r.p,pvi:r.vi,hidePassage:true,
        prompt:(vi[i]+" "+vi[i+1]).trim(),
        sub:"Viết lại bằng tiếng Anh · gợi ý chữ đầu: "+target.split(/\s+/).map(w=>w[0]).join(" "),
        correct:target,input:true,noHint:true,
        explain:`Câu đúng: <b>${esc(target)}</b>`};
    }
  }
  /* (a) điền từ còn thiếu vào đoạn */
  const bare = r.p.replace(/[.,!?;:]/g," ").split(/\s+/).filter(Boolean);
  const cand=[...new Set(bare.filter(w=>(u.words||[]).some(x=>x.w.toLowerCase()===w.toLowerCase())))];
  if(!cand.length) return null;
  const c=cand[rnd(cand.length)];
  const re=new RegExp("\\b"+c.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"\\b");
  const w0=(u.words||[]).find(x=>x.w.toLowerCase()===c.toLowerCase());
  return {mode:"write",tag:"Viết có gợi ý",passage:r.p.replace(re,"______"),pvi:r.vi,
    prompt:"Điền từ còn thiếu vào chỗ trống",
    correct:c,input:true,word:w0,say:c};
}
/* ================= BÀI VÈ (lớp 1–2) =================
   Chương trình Làm quen Tiếng Anh lớp 1–2 nêu đích danh "bài vè và bài hát".
   Lời vè do HNA sáng tác, dùng từ vựng của chính bài. */
function qChant(u){
  const C=(typeof CHANT!=="undefined")?CHANT:null;
  const c = (C && C[GRADE] && u && u.n) ? C[GRADE][u.n] : null;
  if(!c||!c.l||!c.l.length) return null;
  const i=rnd(c.l.length);
  return {mode:"chant",tag:`Bài vè · dòng ${i+1}/${c.l.length}`,say:c.l[i],big:"🎵",
    prompt:c.l[i], sub:c.vi[i], correct:c.l[i], mic:true,
    chantLines:c.l, chantVi:c.vi, chantI:i};
}

const GEN={listen:qListen,pic:qPic,vi:qVi,phon:qPhon,spell:qSpell,order:qOrder,dialog:qDialog,
  speak:qSpeak,match:qMatch,
  g1listen:g1Listen,g1letter:g1Letter,g1sound:g1Sound,g1find:g1Find,g1fill:g1Fill,
  g1sent:g1Sent,g1vi:g1Vi,stress:qStress,intonation:qIntonation,
  xtype:qXType,xdict:qXDict,xspeak:qXSpeak,
  elisten:qEListen,epic:qEPic,evi:qEVi,
  cscram:qCScram,codd:qCOdd,cyn:qCYN,cgap:qCGap,
  gform:qGForm,gvi2en:qGVi2En,
  read:qRead,write:qWrite,chant:qChant};

function buildQuestions(u,mode,len){
  const out=[]; const seen=new Set();
  const kinds = mode!=="mix" ? [mode]
    : GRADE===1 ? ["g1listen","g1letter","g1sound","g1find","g1fill","g1sent","g1vi","chant"]
    : GRADE===2 ? ["g1listen","pic","vi","g1sound","g1fill","g1sent","dialog","chant"]
    : GRADE===4 ? ["listen","pic","vi","stress","spell","order","dialog","read","write"]
    : GRADE===5 ? ["listen","pic","vi","stress","intonation","spell","order","dialog","read","write"]
                : ["listen","pic","vi","phon","spell","order","dialog","read","write"];
  const draw = unique => {
    let guard=0;
    while(out.length<len && guard++<len*20){
      const k = kinds[rnd(kinds.length)];
      const q = GEN[k](u);
      if(!q) continue;
      if(q.board){ out.push(q); continue; }
      const sig = q.mode+"|"+(q.correct||"")+"|"+(q.prompt||"");
      if(unique && seen.has(sig)) continue;
      seen.add(sig); q.sig=sig; out.push(q);
    }
  };
  draw(true);            // ưu tiên câu hỏi không trùng
  if(out.length<len) draw(false);  // hết dữ liệu mới cho lặp lại (bài ít từ)
  return out.slice(0,len);
}

/* ===================================================================
   PHIÊN CHƠI
   =================================================================== */
let Q=[], qi=0, score=0, streak=0, best=0, correctN=0, totalN=0, wrongWords=[], rightWords=[], timer=null, tLeft=0, locked=false, MODE="";

function startSession(mode){
  MODE=mode; HARD=/^x/.test(mode); strikes=0;
  const len = mode==="match" ? Math.max(2,Math.round(S.settings.len/5)) : S.settings.len;
  Q = buildQuestions(CUR, mode, len);
  if(!Q.length){ alert("Bài này chưa đủ dữ liệu cho dạng chơi đã chọn."); return; }
  qi=0; score=0; streak=0; best=0; correctN=0; totalN=0; wrongWords=[]; rightWords=[];
  show("scPlay"); nextQ();
}
function stopTimer(){ if(timer){ clearInterval(timer); timer=null; } }
function startTimer(){
  stopTimer();
  const lim = +S.settings.time;
  const wrap=$("#timerWrap"), bar=$("#timerBar");
  if(!lim || Q[qi].board || Q[qi].mic){ wrap.style.visibility="hidden"; bar.style.width="100%"; return; }
  wrap.style.visibility="visible"; wrap.className="timer";
  tLeft = HARD ? Math.max(8, Math.round(lim*0.6)) : lim;
  bar.style.width="100%";
  timer=setInterval(()=>{
    tLeft-=.1;
    const p=Math.max(0,tLeft/(HARD?Math.max(8,Math.round(lim*0.6)):lim)*100); bar.style.width=p+"%";
    wrap.className = "timer"+(p<25?" danger":p<50?" warn":"");
    if(tLeft<=5 && Math.abs(tLeft%1)<.06) SFX.tick();
    if(tLeft<=0){ stopTimer(); judge(null); }
  },100);
}
function hud(){
  $("#hudQ").textContent=(qi+1)+"/"+Q.length;
  $("#hudStreak").textContent = HARD ? ("❤️".repeat(Math.max(0,3-strikes))||"💔") : ("🔥 "+streak);
  $("#hudScore").textContent="⭐ "+score;
}
function nextQ(){
  if(qi>=Q.length) return finish();
  locked=false; hud();
  $("#fbArea").innerHTML=""; $("#nextBtn").classList.add("hide");
  const q=Q[qi];
  const R={listen:rMCQ,pic:rMCQ,vi:rMCQ,phon:rMCQ,dialog:rMCQ,spell:rInput,order:rOrder,speak:rSpeak,match:rMatch,
    g1listen:rMCQ,g1letter:rMCQ,g1sound:rMCQ,g1find:rMCQ,g1fill:rMCQ,g1sent:rMCQ,g1vi:rMCQ,stress:rMCQ,intonation:rMCQ,
    xtype:rInput,xdict:rInput,gvi2en:rInput,xspeak:rSpeak,
    elisten:rMCQ,epic:rMCQ,evi:rMCQ,
    cscram:rOrder,codd:rMCQ,cyn:rMCQ,cgap:rMCQ,gform:rMCQ,
    read:rMCQ,write:rInput,chant:rSpeak};
  R[q.mode](q);
  startTimer();
  if(q.auto) setTimeout(()=>speak(q.say),350);
}

/* ---------- render: trắc nghiệm ---------- */
function optHTML(o,view){
  if(view==="emoji")     return `<span class="oem">${o.e||"🔹"}</span><span>${esc(o.w)}</span>`;
  if(view==="emojiOnly") return `<span class="oem xl">${o.e||"🔹"}</span>`;
  if(view==="letter")    return `<span class="oletter">${esc(o.w)}</span>`;
  if(view==="wordBig")   return `<span class="oem">${o.e||"🔹"}</span><span class="owordbig">${esc(o.w)}</span>`;
  if(view==="vi")        return `<span>${esc(o.vi)}</span>`;
  if(view==="yn")        return `<span class="oletter" style="font-size:26px">${esc(o.w)}</span><span class="ovi">${esc(o.vi)}</span>`;
  if(view==="sent")      return `<span style="font-size:15px">${esc(o.w)}</span>${o.vi?`<span class="ovi">${esc(o.vi)}</span>`:""}`;
  return `<span>${esc(o.w)}</span>`;
}
/* khung đoạn văn cho dạng Đọc hiểu / Viết có gợi ý */
function passageHTML(q){
  if(!q.passage || q.hidePassage) return "";
  return `<div class="passage">
    <div class="ptitle">📖 Đoạn văn <button class="tbtn" id="pspk">🔊 Nghe</button></div>
    <p class="ptext">${esc(q.passage)}</p>
    <details class="pvi"><summary>Nghĩa tiếng Việt (cho bố mẹ)</summary><p>${esc(q.pvi||"")}</p></details>
  </div>`;
}
function bindPassage(q){
  const b=$("#pspk"); if(b) b.onclick=()=>speak(String(q.passage).replace(/_+/g," blank "));
}

/* Lối thoát cho bài "Nghe & ...": máy nào không đọc được (điện thoại tắt tiếng,
   máy chưa cài giọng tiếng Anh) thì bé vẫn làm bài được bằng cách xem chữ.
   Bài chép chính tả thì KHÔNG cho xem — xem là lộ đáp án. */
function sayFallback(q){
  if(!q.say || q.mode==="spell" || q.mode==="xdict") return "";
  return `<div class="saybox">
    <button class="saylink" id="showSay">🔇 Không nghe được? Xem chữ</button>
    <div class="saytext hide" id="sayText">${esc(q.say)}</div>
  </div>`;
}
function bindSayFallback(){
  const b=$("#showSay"), t=$("#sayText");
  if(!b || !t) return;
  b.onclick = ()=>{ t.classList.remove("hide"); b.classList.add("hide"); };
  if(TTS_OK === false) b.click();     // đã biết máy không đọc được thì hiện luôn
}
function rMCQ(q){
  const oneCol = q.optView==="sent";
  const grid = q.optView==="emojiOnly" ? "opts pics"
             : q.optView==="letter"    ? "opts letters"
             : oneCol ? "opts one" : "opts";
  const visual = q.bigLetter ? `<div class="letterbig">${esc(q.bigLetter)}</div>`
    : q.auto  ? `<button class="speaker pulse" id="spk">🔊</button>${sayFallback(q)}`
    : q.big   ? `<span class="bigem">${q.big}</span>` : "";
  $("#qArea").innerHTML=`
   ${passageHTML(q)}
   <div class="qcard">
     <span class="qtag">${q.tag}</span>
     ${visual}
     <p class="qtext ${q.gapWord?"gapword":""}">${esc(q.prompt)}</p>
     ${q.sub?`<div class="qsub">${esc(q.sub)}</div>`:""}
     ${q.say && !q.auto ? `<button class="tbtn" id="spk2" style="background:var(--pale);color:var(--navy);margin:9px auto 0">🔊 Nghe lại</button>`:""}
     ${q.sayAll ? `<button class="btn amber" id="spkAll" style="margin:10px auto 0">🔊 Nghe cả ${q.sayAll.length} ${q.optView==="sent"?"câu":"từ"}</button>`:""}
   </div>
   <div class="${grid}" id="opts">
     ${q.opts.map((o,i)=>`<button class="opt" data-i="${i}">${optHTML(o,q.optView)}</button>`).join("")}
   </div>`;
  bindPassage(q); bindSayFallback();
  if($("#spk")) $("#spk").onclick=()=>speak(q.say);
  if($("#spk2")) $("#spk2").onclick=()=>speak(q.say);
  if($("#spkAll")){ $("#spkAll").onclick=()=>speakSeq(q.sayAll); setTimeout(()=>speakSeq(q.sayAll),400); }
  $$("#opts .opt").forEach(b=>b.onclick=()=>{
    if(locked) return;
    judge(q.opts[+b.dataset.i].w, b);
  });
}

/* ---------- render: gõ chữ ---------- */
function rInput(q){
  const hint = q.correct[0] + "_".repeat(q.correct.length-1);
  const visual = q.auto ? `<button class="speaker pulse" id="spk">🔊</button>${sayFallback(q)}`
               : q.big  ? `<span class="bigem">${q.big}</span>` : "";
  $("#qArea").innerHTML=`
   ${passageHTML(q)}
   <div class="qcard">
     <span class="qtag">${q.tag}</span>
     ${visual}
     <p class="qtext" ${(q.mode==="gvi2en"||q.mode==="write")?'style="font-size:19px"':""}>${esc(q.prompt)}</p>
     ${q.noHint ? `<div class="qsub">${esc(q.sub||"")}</div>`
       : `<div class="qsub">Gợi ý: <b style="letter-spacing:3px">${hint}</b> (${q.correct.length} chữ cái) · ${esc(q.word?q.word.vi:"")}</div>`}
     ${q.say && !q.auto ? `<button class="tbtn" id="spk3" style="background:var(--pale);color:var(--navy);margin:8px auto 0">🔊 Nghe</button>`:""}
     <div class="typebox"><input id="ans" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="gõ ở đây"></div>
     <button class="btn amber wide" id="ok" style="margin-top:12px">Kiểm tra ✓</button>
   </div>`;
  bindPassage(q); bindSayFallback();
  if($("#spk")) $("#spk").onclick=()=>speak(q.say);
  if($("#spk3")) $("#spk3").onclick=()=>speak(q.say);
  const go=()=>{ if(!locked) judge($("#ans").value); };
  $("#ok").onclick=go;
  $("#ans").onkeydown=e=>{ if(e.key==="Enter") go(); };
  setTimeout(()=>$("#ans").focus(),200);
}

/* ---------- render: xếp câu ---------- */
function rOrder(q){
  $("#qArea").innerHTML=`
   <div class="qcard">
     <span class="qtag">${q.tag}</span>
     <p class="qtext" style="font-size:19px">${esc(q.prompt)}</p>
     ${q.sub?`<div class="qsub">Nghĩa: ${esc(q.sub)}</div>`:""}
   </div>
   <div class="slot" id="slot"></div>
   <div class="tiles" id="tiles">${q.tokens.map((t,i)=>`<button class="tile" data-i="${i}">${esc(t)}</button>`).join("")}</div>
   <button class="btn amber wide" id="ok" style="margin-top:14px">Kiểm tra ✓</button>
   <button class="btn ghost wide" id="clr" style="margin-top:8px">↺ Xếp lại</button>`;
  const chosen=[];
  const redraw=()=>{
    $("#slot").innerHTML=chosen.map((c,k)=>`<button class="tile" data-k="${k}">${esc(q.tokens[c])}</button>`).join("");
    $$("#tiles .tile").forEach(t=>t.classList.toggle("used", chosen.includes(+t.dataset.i)));
    $$("#slot .tile").forEach(t=>t.onclick=()=>{ if(locked)return; chosen.splice(+t.dataset.k,1); redraw(); SFX.tap(); });
  };
  $$("#tiles .tile").forEach(t=>t.onclick=()=>{ if(locked)return; chosen.push(+t.dataset.i); SFX.tap(); redraw(); });
  $("#clr").onclick=()=>{ if(locked)return; chosen.length=0; redraw(); };
  const J = (q.join===undefined) ? " " : q.join;
  $("#ok").onclick=()=>{ if(locked)return; judge(chosen.map(c=>q.tokens[c]).join(J)); };
  redraw();
}

/* ---------- render: luyện nói ---------- */
let REC=null;
function rSpeak(q){
  const SR = window.SpeechRecognition||window.webkitSpeechRecognition;
  $("#qArea").innerHTML=`
   ${q.chantLines?`<div class="passage chant"><div class="ptitle">🎵 Bài vè <button class="tbtn" id="pspk">🔊 Nghe cả bài</button></div>
     ${q.chantLines.map((l,i)=>`<div class="cline${i===q.chantI?" now":""}">${esc(l)}<span>${esc(q.chantVi[i]||"")}</span></div>`).join("")}</div>`:""}
   <div class="qcard">
     <span class="qtag">${q.tag}</span>
     ${q.big?`<span class="bigem">${q.big}</span>`:""}
     <p class="qtext">${esc(q.prompt)}</p>
     ${q.sub?`<div class="qsub">${esc(q.sub)}</div>`:""}
     <button class="tbtn" id="spk2" style="background:var(--pale);color:var(--navy);margin:10px auto 0">🔊 Nghe cô đọc mẫu</button>
     <button class="micbtn" id="mic">🎙️</button>
     <div class="heard" id="heard">${SR?"Chạm micro rồi đọc to nhé!":"Trình duyệt này chưa hỗ trợ chấm giọng nói."}</div>
     ${SR?"":`<button class="btn amber wide" id="selfok" style="margin-top:10px">Con đã đọc xong ✓</button>`}
   </div>`;
  $("#spk2").onclick=()=>speak(q.say);
  if($("#pspk")) $("#pspk").onclick=()=>speakSeq(q.chantLines);
  speak(q.say);
  if($("#selfok")) $("#selfok").onclick=()=>{ if(!locked) judge(q.correct); };
  if(!SR) return;
  $("#mic").onclick=()=>{
    if(locked) return;
    try{ if(REC) REC.abort(); }catch(e){}
    REC=new SR(); REC.lang="en-US"; REC.interimResults=false; REC.maxAlternatives=3;
    $("#mic").classList.add("rec"); $("#heard").textContent="Đang nghe… con đọc đi!";
    REC.onresult=e=>{
      const alts=Array.from(e.results[0]).map(r=>r.transcript);
      $("#heard").textContent="Máy nghe được: “"+alts[0]+"”";
      const sc=Math.max(...alts.map(a=>sim(norm(a),norm(q.correct))));
      $("#mic").classList.remove("rec");
      judge(sc>=.66 ? q.correct : "≈ "+alts[0], null, Math.round(sc*100));
    };
    REC.onerror=()=>{ $("#mic").classList.remove("rec"); $("#heard").textContent="Không nghe rõ, con thử lại nhé."; };
    REC.onend=()=>$("#mic").classList.remove("rec");
    try{ REC.start(); }catch(e){}
  };
}
function sim(a,b){
  if(a===b) return 1;
  const m=a.length,n=b.length; if(!m||!n) return 0;
  const d=Array.from({length:m+1},(_,i)=>[i].concat(Array(n).fill(0)));
  for(let j=0;j<=n;j++) d[0][j]=j;
  for(let i=1;i<=m;i++) for(let j=1;j<=n;j++)
    d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
  return 1-d[m][n]/Math.max(m,n);
}

/* ---------- render: ghép cặp ---------- */
function rMatch(q){
  const L=shuf(q.pairs), R=shuf(q.pairs);
  $("#qArea").innerHTML=`
   <div class="qcard"><span class="qtag">${q.tag}</span><p class="qtext" style="font-size:19px">${esc(q.prompt)}</p>
   <div class="qsub">Bảng ${qi+1}/${Q.length} · ${q.pairs.length} cặp</div></div>
   <div class="pairs">
     <div style="display:grid;gap:9px">${L.map(w=>`<button class="pair" data-side="l" data-w="${esc(w.w)}">${w.e||"🔹"} ${esc(w.w)}</button>`).join("")}</div>
     <div style="display:grid;gap:9px">${R.map(w=>`<button class="pair" data-side="r" data-w="${esc(w.w)}">${esc(w.vi)}</button>`).join("")}</div>
   </div>`;
  let selL=null, selR=null, done=0, tried={};
  const clear=()=>{ $$(".pair.sel").forEach(p=>p.classList.remove("sel")); selL=selR=null; };
  $$(".pair").forEach(p=>p.onclick=()=>{
    if(p.classList.contains("done")) return;
    SFX.tap();
    if(p.dataset.side==="l"){ if(selL) selL.classList.remove("sel"); selL=p; } else { if(selR) selR.classList.remove("sel"); selR=p; }
    p.classList.add("sel");
    if(selL&&selR){
      const a=selL, b=selR, ok=a.dataset.w===b.dataset.w;
      const key=a.dataset.w;
      if(ok){
        a.classList.add("done"); b.classList.add("done"); clear(); done++;
        totalN++; if(!tried[key]){ correctN++; score+=100; streak++; best=Math.max(best,streak);
          if(!rightWords.includes(key)) rightWords.push(key); }
        SFX.ok(); speak(key);
        hud();
        if(done===q.pairs.length){ setTimeout(()=>{ qi++; nextQ(); },600); }
      }else{
        tried[key]=1; tried[b.dataset.w]=1;
        a.classList.add("shake"); b.classList.add("shake"); SFX.no(); streak=0;
        noteWrong(a.dataset.w);
        setTimeout(()=>{ a.classList.remove("shake","sel"); b.classList.remove("shake","sel"); selL=selR=null; hud(); },380);
      }
    }
  });
}

/* ---------- chấm điểm ---------- */
function noteWrong(w){ if(w && !wrongWords.includes(w)) wrongWords.push(w); }
function judge(ans, btn, pctSpoken){
  if(locked) return; locked=true; stopTimer();
  const q=Q[qi];
  let ok;
  if(q.mode==="spell")      ok = norm(ans)===norm(q.correct);
  else if(q.mode==="order"||q.mode==="cscram") ok = norm(ans)===norm(q.correct);
  else if(q.mode==="speak") ok = ans===q.correct;
  else                      ok = ans===q.correct;
  totalN++;
  const timeBonus = (+S.settings.time && tLeft>0) ? Math.round(tLeft/+S.settings.time*50) : 20;
  if(ok){
    correctN++; streak++; best=Math.max(best,streak);
    const rw = q.word ? q.word.w : q.correct; if(rw && !rightWords.includes(rw)) rightWords.push(rw);
    score += 100 + timeBonus + Math.min(50, streak*10);
    SFX.ok();
  }else{
    streak=0; SFX.no();
    noteWrong(q.word ? q.word.w : q.correct);
    if(HARD){ strikes++; if(strikes>=3) Q.splice(qi+1); }
  }
  hud();

  if(q.opts && $("#opts")){
    $$("#opts .opt").forEach((b,i)=>{
      const v=q.opts[i].w;
      if(v===q.correct) b.classList.add("correct");
      else if(btn===b) b.classList.add("wrong");
      else b.classList.add("dim");
      b.onclick=null;
    });
  }
  const w=q.word;
  const detail = q.mode==="speak"
    ? (ok?`Phát âm rất tốt! (${pctSpoken!=null?pctSpoken:100}% giống mẫu)`:`Máy nghe được ${esc(String(ans))}. Con đọc lại chậm hơn nhé!`)
    : q.explain ? q.explain
    : (w ? `<b>${esc(w.w)}</b> ${esc(w.ipa)} – ${esc(w.vi)} · đọc là “${esc(w.vp)}”`
         : `Câu đúng: <b>${esc(q.correct)}</b>${viOf(q.correct)?` – ${esc(viOf(q.correct))}`:""}`);
  $("#fbArea").innerHTML=`
    <div class="feedback ${ok?"ok":"no"}">
      <span class="fem">${ok?["🎉","👏","🌟","🔥","💪"][rnd(5)]:"💡"}</span>
      <div>${ok?["Chính xác!","Giỏi quá!","Tuyệt vời!","Đúng rồi!"][rnd(4)]:(ans===null?"Hết giờ mất rồi!":"Chưa đúng, không sao cả!")}
        <small>${detail}</small></div>
    </div>`;
  if(HARD && strikes>=3 && !ok)
    $("#fbArea").insertAdjacentHTML("beforeend",
      `<div class="feedback no" style="margin-top:8px"><span class="fem">💔</span><div>Hết 3 lượt sai — dừng thử thách ở đây nhé!<small>Con chơi lại hoặc quay về bài cơ bản để chắc hơn.</small></div></div>`);
  if(ok && streak>=3) confetti(40);
  if(!q.auto && q.mode!=="speak" && w) setTimeout(()=>speak(w.w),260);
  $("#nextBtn").classList.remove("hide");
  $("#nextBtn").textContent = (qi+1>=Q.length) ? "Xem kết quả 🏁" : "Câu tiếp theo →";
}

/* ---------- kết thúc ---------- */
function finish(){
  stopTimer();
  const pct = totalN? Math.round(correctN/totalN*100) : 0;
  const key=pkey(CUR.n);
  const p = S.progress[key] || {best:0,plays:0,wrong:{}};
  p.plays++; p.best=Math.max(p.best,pct); p.last=pct; p.date=new Date().toISOString().slice(0,10);
  wrongWords.forEach(w=>{ p.wrong[w]=(p.wrong[w]||0)+1; });
  S.progress[key]=p;
  /* Ôn từ hay sai: trả lời đúng thì trừ bớt "nợ" của từ đó ở mọi bài */
  let cleared=0;
  if(CUR.weak){
    rightWords.forEach(w=>{
      Object.keys(S.progress).filter(k=>k.startsWith(GRADE+"-")).forEach(k=>{
        const wr=S.progress[k].wrong; if(!wr || !wr[w]) return;
        wr[w]--; if(wr[w]<=0){ delete wr[w]; cleared++; }
      });
    });
  }
  let newSticker=false;
  if(pct>=80 && !S.stickers[key]){ S.stickers[key]=true; newSticker=true; }
  save();

  const medal = pct>=90?"🏆":pct>=75?"🥇":pct>=60?"🥈":pct>=40?"🥉":"🌱";
  const msg   = pct>=90?"Xuất sắc!":pct>=75?"Rất giỏi!":pct>=60?"Khá lắm!":pct>=40?"Cố lên nhé!":"Mình cùng ôn lại nào!";
  $("#resultCard").innerHTML=`
    <div class="medal">${medal}</div>
    <h2>${esc(msg)}</h2>
    <div class="scoreline">${S.name?esc(S.name)+" · ":""}Lớp ${GRADE} · Unit ${CUR.n} – ${esc(CUR.t)}</div>
    ${newSticker?`<div style="margin-top:10px;background:var(--pale);border-radius:14px;padding:10px;font-weight:800;color:#8a6100">🎁 Con vừa nhận được huy hiệu Unit ${CUR.n}!</div>`:""}
    <div class="statgrid">
      <div class="stat"><b>${pct}%</b><span>ĐÚNG</span></div>
      <div class="stat"><b>${score}</b><span>ĐIỂM</span></div>
      <div class="stat"><b>${best}</b><span>CHUỖI ĐÚNG</span></div>
    </div>
    <div class="muted">${correctN}/${totalN} câu đúng · ${ALLMODES().find(m=>m.id===MODE)?.t||MODE}</div>
    ${cleared?`<div style="margin-top:12px;background:var(--okbg);border-radius:14px;padding:10px;font-weight:800;color:#14683a">✅ ${cleared} từ đã được xoá khỏi danh sách hay sai!</div>`:""}`;
  const wrongList = wrongWords.map(w=>ALLW[w]).filter(Boolean);
  $("#reviewCard").innerHTML = wrongWords.length
    ? `<div style="font-weight:800;margin-bottom:8px">📌 Ôn lại những chỗ chưa đúng</div><div class="weaklist">
       ${wrongList.map(w=>`<div class="weak"><span class="em">${w.e||"🔹"}</span><div style="flex:1"><span class="w">${esc(w.w)}</span> <span class="i">${esc(w.ipa)}</span><div class="i">${esc(w.vi)} · “${esc(w.vp)}”</div></div><button class="tbtn" style="background:var(--pale);color:var(--navy)" data-say="${esc(w.w)}">🔊</button></div>`).join("")}
       ${wrongWords.filter(w=>!ALLW[w]).map(w=>`<div class="weak"><span class="em">💬</span><div style="flex:1"><span class="w">${esc(w)}</span><div class="i">${esc(viOf(w))}</div></div><button class="tbtn" style="background:var(--pale);color:var(--navy)" data-say="${esc(w)}">🔊</button></div>`).join("")}
       </div>`
    : `<div style="text-align:center;padding:6px"><div style="font-size:34px">💯</div><div style="font-weight:800">Con làm đúng tất cả! Quá giỏi!</div></div>`;
  $$("#reviewCard [data-say]").forEach(b=>b.onclick=()=>speak(b.dataset.say));
  $("#nextUnitBtn").classList.toggle("hide", !!CUR.review);
  if(pct>=60){ SFX.win(); confetti(120); }
  syncGAS({unit:CUR.n,unitTitle:CUR.t,mode:MODE,pct,score,correct:correctN,total:totalN,wrong:wrongWords.join(", ")});
  show("scResult");
}

/* ===================================================================
   ĐĂNG NHẬP – ghi nhận gia đình đang dùng app
   =================================================================== */
const VN_PHONE = /^0\d{9,10}$/;
const MAIL_RE  = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/* Gửi vào Supabase. Thất bại (mất mạng) thì xếp vào hàng đợi, lần mở app sau tự gửi lại. */
async function sendToSupabase(f){
  try{
    const r = await fetch(HNA_SB.url,{ method:"POST",
      headers:{ apikey:HNA_SB.key, Authorization:"Bearer "+HNA_SB.key,
                "Content-Type":"application/json", Prefer:"return=minimal" },
      body: JSON.stringify({ ho_ten_be:f.name, sdt_me:f.phone, email:f.email,
        lop:+f.grade, khu_vuc:f.area, thiet_bi:(navigator.userAgent||"").slice(0,200),
        nguon:"app", app:APP_CODE })
    });
    return r.ok;
  }catch(e){ return false; }
}
function queuePush(f){
  S.pending = (S.pending||[]).concat([f]).slice(-5); save();
}
async function queueFlush(){
  if(!S.pending || !S.pending.length) return;
  const con=[];
  for(const f of S.pending){ const ok = await sendToSupabase(f); if(!ok) con.push(f); else sendToForm(f); }
  S.pending = con; save();
}

/* Gửi thẳng vào Google Form. Dùng form ẩn + iframe thay vì fetch để chạy được
   cả khi app mở bằng file:// (phụ huynh nhấn đúp vào index.html). */
function sendToForm(f){
  try{
    let sink = $("#hnaFormSink");
    if(!sink){
      sink = document.createElement("iframe");
      sink.id = "hnaFormSink"; sink.name = "hnaFormSink";
      sink.style.cssText = "position:absolute;left:-9999px;width:0;height:0;border:0";
      document.body.appendChild(sink);
    }
    const fm = document.createElement("form");
    fm.action = HNA_FORM.url; fm.method = "POST";
    fm.target = "hnaFormSink"; fm.style.display = "none";
    const add = (k,v) => { const i=document.createElement("input");
      i.type="hidden"; i.name=k; i.value=v==null?"":String(v); fm.appendChild(i); };
    add(HNA_FORM.name,  f.name);
    add(HNA_FORM.grade, "Lớp " + f.grade);
    add(HNA_FORM.area,  f.area);
    add(HNA_FORM.phone, f.phone);
    add(HNA_FORM.email, f.email);
    document.body.appendChild(fm);
    fm.submit();
    setTimeout(()=>{ try{ fm.remove(); }catch(e){} }, 1500);
    return true;
  }catch(e){ return false; }
}
/* Đường dẫn form điền sẵn – dùng khi máy chặn gửi ngầm, bố mẹ bấm là xong */
function formPrefillURL(f){
  const q = new URLSearchParams();
  q.set(HNA_FORM.name,  f.name);
  q.set(HNA_FORM.grade, "Lớp " + f.grade);
  q.set(HNA_FORM.area,  f.area);
  q.set(HNA_FORM.phone, f.phone);
  q.set(HNA_FORM.email, f.email);
  return HNA_FORM.view + "?usp=pp_url&" + q.toString();
}

function loginLabel(){
  const b=$("#btnLogin"); if(!b) return;
  const e=$("#btnLoginEdit"), sp=$("#tsep2");
  const daDangNhap = !!(S.user && S.user.name);
  if(daDangNhap){
    /* tên gọi ở nhà: lấy 2 tiếng cuối cho gọn thanh đầu, tên đầy đủ để ở tooltip */
    const tu = String(S.user.name).trim().split(/\s+/);
    const goi = tu.length>=3 ? tu.slice(-2).join(" ") : S.user.name;   // tên gọi ở nhà
    b.innerHTML = `👤 <span class="nm-s">${esc(tu[tu.length-1])}</span>`
                + `<span class="nm-f">${esc(goi)} · lớp ${esc(String(S.user.grade))}</span>`;
    b.classList.add("on");
    b.title = S.user.name + " · lớp " + S.user.grade + " — bấm để xem thông tin đã đăng nhập";
  }else{
    b.innerHTML = "👤 Đăng nhập"; b.classList.remove("on");
    b.title = "Đăng nhập để HNA đồng hành cùng con";
  }
  /* Luôn còn một dòng chữ để bố mẹ biết bấm vào đâu, kể cả khi đã đăng nhập */
  if(e)  e.classList.toggle("hide", !daDangNhap);
  if(sp) sp.classList.toggle("hide", !daDangNhap);
}
/* Bắt buộc đăng ký: chưa có thông tin thì không vào được app.
   Vẫn cho học ngay sau khi điền, kể cả lúc chưa gửi được lên máy chủ. */
let GATE = false;
function enforceGate(){
  GATE = !S.user;
  document.body.classList.toggle("gated", GATE);
  if(GATE) openLogin();
}
function openLogin(){
  const u=S.user||{};
  $("#liName").value  = u.name  || S.name || "";
  $("#liPhone").value = u.phone || "";
  $("#liMail").value  = u.email || "";
  $("#liGrade").value = u.grade ? String(u.grade) : String(S.grade||"");
  $("#liArea").value  = u.area  || "";
  $("#liErr").classList.add("hide");
  $$("#loginModal .bad").forEach(el=>el.classList.remove("bad"));
  $("#liSave").textContent = S.user ? "Cập nhật thông tin" : "Bắt đầu học";
  $("#liOut").classList.toggle("hide", !S.user);
  $("#loginX").classList.toggle("hide", GATE);
  $("#liGate").classList.toggle("hide", !GATE);
  $("#liWelcome").classList.toggle("hide", !GATE);
  $("#loginModal").classList.remove("hide");
  setTimeout(()=>$("#liName").focus(),150);
}
function closeLogin(){ if(GATE) return; $("#loginModal").classList.add("hide"); }

function saveLogin(){
  const f = {
    name : $("#liName").value.trim().replace(/\s+/g," "),
    phone: $("#liPhone").value.replace(/[^0-9]/g,""),
    email: $("#liMail").value.trim(),
    grade: $("#liGrade").value,
    area : $("#liArea").value.trim().replace(/\s+/g," ")
  };
  const bad=[];
  $$("#loginModal .bad").forEach(el=>el.classList.remove("bad"));
  const mark=(id,msg)=>{ $(id).classList.add("bad"); bad.push(msg); };
  if(f.name.length<2)            mark("#liName","họ tên của bé");
  if(!VN_PHONE.test(f.phone))    mark("#liPhone","số điện thoại (10–11 số, bắt đầu bằng 0)");
  if(!f.email)                   mark("#liMail","email của bố mẹ");
  else if(!MAIL_RE.test(f.email)) mark("#liMail","email chưa đúng định dạng");
  if(!f.grade)                   mark("#liGrade","lớp của bé");
  if(f.area.length<2)            mark("#liArea","khu vực đang sống");
  if(bad.length){
    $("#liErr").textContent = "Bố mẹ điền giúp: " + bad.join(" · ");
    $("#liErr").classList.remove("hide");
    SFX.no();
    return;
  }
  const isNew = !S.user;
  f.grade = +f.grade;
  f.at = new Date().toISOString();
  S.user = f;
  S.name = f.name;
  save();
  saveUser(f);   // dùng chung cho mọi môn trong "Học Cùng Con"
  setGrade(f.grade);
  $("#kidName") && ($("#kidName").value = f.name);
  if(typeof renderHome==="function") renderHome();
  const dau = [f.name,f.phone,f.email,f.grade,f.area].join("|");
  if(dau !== S.userSent){
    S.userSent = dau; save();
    sendToForm(f);
    sendToSupabase(f).then(ok=>{ if(!ok) queuePush(f); });
  }
  syncGAS({kind: isNew ? "dangky" : "capnhat", type:"nguoidung",
    hoTenBe:f.name, sdtMe:f.phone, email:f.email, lop:f.grade, khuVuc:f.area,
    device:(navigator.userAgent||"").slice(0,120)});
  loginLabel();
  GATE=false; document.body.classList.remove("gated");
  $("#loginModal").classList.add("hide");
  SFX.win(); confetti(70);
  toast(isNew ? `Chào mừng ${f.name}! HNA sẽ đồng hành cùng con.` : "Đã cập nhật thông tin của con.");
}
function logout(){
  if(!confirm("Thoát tài khoản này? Tiến độ học của con vẫn được giữ trên máy.")) return;
  S.user=null; S.userSent=""; save(); saveUser(null); loginLabel(); enforceGate();
}
function toast(msg){
  let el=$("#toast");
  if(!el){ el=document.createElement("div"); el.id="toast"; document.body.appendChild(el); }
  el.textContent=msg; el.className="toast show";
  clearTimeout(toast._t); toast._t=setTimeout(()=>el.className="toast",2800);
}

/* ---------- đồng bộ Google Sheet ---------- */
function syncGAS(payload){
  if(!S.gas) return;
  const body = Object.assign({name:S.name||"(chưa đặt tên)",grade:S.grade,at:new Date().toISOString()}, payload);
  try{
    fetch(S.gas,{method:"POST",mode:"no-cors",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(body)});
  }catch(e){}
}

/* ===================================================================
   KHU VỰC PHỤ HUYNH
   =================================================================== */
function renderParent(){
  const rows=UNITS().map(u=>{ const p=progOf(u.n); return {u,p}; });
  const played=rows.filter(r=>r.p.plays>0);
  const avg = played.length? Math.round(played.reduce((s,r)=>s+r.p.best,0)/played.length):0;
  const stars=rows.reduce((s,r)=>s+starsOf(r.p),0);
  $("#pStats").innerHTML=`
    <div class="stat"><b>${played.length}/${rows.length}</b><span>BÀI ĐÃ HỌC</span></div>
    <div class="stat"><b>${avg}%</b><span>ĐIỂM TRUNG BÌNH</span></div>
    <div class="stat"><b>${stars}/${rows.length*3}</b><span>SAO ĐẠT ĐƯỢC</span></div>`;
  $("#pTable").innerHTML=`
    <tr><th>Unit</th><th>Tên bài</th><th>Lượt</th><th>Cao nhất</th><th>Sao</th></tr>
    ${rows.map(r=>`<tr>
      <td><b>${r.u.n}</b></td>
      <td>${esc(r.u.t)}<div class="muted" style="font-size:11.5px">${esc(r.u.vi)}</div></td>
      <td>${r.p.plays||"–"}</td>
      <td><div style="display:flex;align-items:center;gap:7px"><span style="font-weight:800;min-width:36px">${r.p.best}%</span><div class="mini"><i style="width:${r.p.best}%"></i></div></div></td>
      <td>${"★".repeat(starsOf(r.p))||"–"}</td></tr>`).join("")}`;
  const agg={};
  Object.keys(S.progress).filter(k=>k.startsWith(GRADE+"-")).forEach(k=>{
    const wr=S.progress[k].wrong||{}; Object.keys(wr).forEach(w=>agg[w]=(agg[w]||0)+wr[w]); });
  const top=Object.entries(agg).sort((a,b)=>b[1]-a[1]).slice(0,20);
  $("#pWeak").innerHTML = top.length ? top.map(([w,c])=>{
    const d=ALLW[w];
    return `<div class="weak"><span class="em">${d?(d.e||"🔹"):"💬"}</span>
      <div style="flex:1"><span class="w">${esc(w)}</span> ${d?`<span class="i">${esc(d.ipa)}</span><div class="i">${esc(d.vi)} · đọc là “${esc(d.vp)}”</div>`:`<div class="i">${esc(viOf(w))}</div>`}</div>
      <span style="background:#ffe3e0;color:#b3271e;border-radius:99px;padding:3px 10px;font-weight:800;font-size:12px">sai ${c} lần</span>
      <button class="tbtn" style="background:var(--pale);color:var(--navy)" data-say="${esc(w)}">🔊</button></div>`;
  }).join("") : `<div class="muted">Chưa có dữ liệu. Khi con làm bài, những từ sai sẽ được ghi lại ở đây.</div>`;
  $$("#pWeak [data-say]").forEach(b=>b.onclick=()=>speak(b.dataset.say));

  $("#askUnit").innerHTML = UNITS().map(u=>`<option value="${u.n}">Unit ${u.n} – ${esc(u.t)} (${esc(u.vi)})</option>`).join("");
  renderAsk(+$("#askUnit").value || 1);
  $("#setName").value=S.name||""; $("#setLen").value=S.settings.len;
  $("#setTime").value=S.settings.time; $("#gasUrl").value=S.gas||"";
  loadVoices();
}
function renderAsk(n){
  const u=findU(n);
  const cards=[];
  if(u.review){
    return head+`
    <div style="margin-top:12px;border-top:1px solid var(--line);padding-top:12px">
      <div class="note">${u.weak
        ? `🎯 Bộ này gom <b>${u.words.length} từ</b> con còn nhầm nhiều nhất ở lớp ${GRADE}. Mỗi lần con trả lời đúng, từ đó sẽ bớt “nợ” một lần; đúng hết thì từ rời khỏi danh sách.`
        : `🏁 Bài ôn cuối chặng, gộp <b>${u.words.length} từ</b> và <b>${u.pat.length} mẫu câu</b> của cả ${BOOK[GRADE].groups[u.block].units.length} bài trong chặng.`}</div>
      <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px">
        ${u.words.slice(0,14).map(w=>`<span style="background:var(--pale);border-radius:10px;padding:4px 10px;font-weight:800;font-size:13px">${w.e||"🔹"} ${esc(w.w)}${w.miss?` <span style="color:#b3271e">·${w.miss}</span>`:""}</span>`).join("")}
        ${u.words.length>14?`<span class="muted" style="align-self:center">…và ${u.words.length-14} từ nữa</span>`:""}
      </div>
    </div>`;
  }
  if(u.letter){
    const L=u.letter;
    cards.push({q:L.U+" "+L.l, a:u.words.map(w=>w.w).join(", "),
      sayVN:`${L.vp} (tên chữ đọc là “${L.name}”)`,
      qv:`Bố mẹ chỉ vào chữ và đọc “${L.vp}”, cho con đọc theo 3 lần.`,
      av:`Rồi hỏi: “Con tìm cho mẹ những từ có chữ ${L.l} nhé!”`, em:"🔠", letter:true});
    u.words.forEach(w=>{
      const f=frameSent(u,w);
      cards.push({q:"Look! What's this?", a:f?f.en:w.w, qv:"Nhìn này! Đây là gì?",
        av:f?f.vi:w.vi, em:w.e, word:w});
    });
    u.pat.forEach(p=>cards.push({q:p[0],a:p[1],qv:viOf(p[0]),av:viOf(p[1])}));
  }else{
    u.pat.forEach(p=>cards.push({q:p[0],a:p[1],qv:viOf(p[0]),av:viOf(p[1])}));
    u.words.filter(w=>!w.g).slice(0,8).forEach(w=>cards.push({
      q:"What's this?", a:"It's a "+w.w+".", qv:"Đây là cái gì?", av:"Đó là "+w.vi+".", em:w.e, word:w }));
  }
  $("#askList").innerHTML = `<div class="card" style="text-align:center"><div style="font-family:'Baloo 2',sans-serif;font-size:20px">Unit ${u.n} – ${esc(u.t)}</div><div class="muted">${esc(u.vi)} · ${cards.length} câu hỏi luyện nói cùng con</div></div>` +
   cards.map((c,i)=>`
    <div class="qa">
      <div style="display:flex;gap:10px;align-items:flex-start">
        <div style="font-size:26px">${c.em||"🗨️"}</div>
        <div style="flex:1;min-width:0">
          <div class="en ${c.letter?"letterq":""}">${i+1}. ${esc(c.q)}${c.word?` <span style="color:var(--muted);font-size:14px">(${esc(c.word.w)})</span>`:""}</div>
          <div class="say">🔉 Bố mẹ đọc: <b>${esc(c.sayVN || vnSay(c.q))}</b>${c.word?" "+esc(c.word.vp):""}</div>
          <div class="mean">Nghĩa: ${esc(c.qv||"")}</div>
          <div class="ans">Đáp án con cần nói: <b>${esc(c.a)}</b> <span class="muted">(${esc(vnSay(c.a))})</span><br><span class="muted">${esc(c.av||"")}</span></div>
        </div>
        <button class="tbtn no-print" style="background:var(--pale);color:var(--navy)" data-say="${esc(c.q+" "+c.a)}">🔊</button>
      </div>
    </div>`).join("");
  $$("#askList [data-say]").forEach(b=>b.onclick=()=>speak(b.dataset.say));
}

/* ---------- Báo cáo in / PDF cho phụ huynh ---------- */
function buildReport(){
  const rows=UNITS().map(u=>({u,p:progOf(u.n)}));
  const played=rows.filter(r=>r.p.plays>0);
  const avg=played.length?Math.round(played.reduce((s,r)=>s+r.p.best,0)/played.length):0;
  const stars=rows.reduce((s,r)=>s+starsOf(r.p),0);
  const weak=weakWordList().slice(0,20);
  const revs=BOOK[GRADE].groups.map((g,i)=>({i,p:progOf("R"+(i+1))})).filter(x=>x.p.plays>0);
  const d=new Date(), dd=n=>String(n).padStart(2,"0");
  const tips=[];
  if(!played.length) tips.push("Con chưa làm bài nào. Bố mẹ mở app cùng con 10 phút mỗi tối, bắt đầu từ Unit 1.");
  else {
    tips.push(`Con đã học <b>${played.length}/${rows.length}</b> bài của lớp ${GRADE}, điểm trung bình <b>${avg}%</b>.`);
    if(avg<60) tips.push("Điểm trung bình dưới 60%: nên cho con chơi lại chế độ <b>Nghe &amp; chọn</b> và <b>Anh ↔ Việt</b> ở những bài cũ trước khi sang bài mới.");
    else if(avg<80) tips.push("Con đang tiến bộ đều. Thử thêm chế độ <b>Luyện nói</b> để con dám mở miệng đọc to.");
    else tips.push("Con nắm bài rất tốt. Có thể tăng lên 15 câu mỗi lượt hoặc rút thời gian xuống 15 giây cho thử thách hơn.");
    if(weak.length) tips.push(`${weak.length>1?"Những từ":"Từ"} con nhầm nhiều nhất: <b>${weak.slice(0,3).map(w=>w.w).join(", ")}</b>. Bố mẹ dùng mục <b>Ôn từ hay sai</b> trong app, hoặc hỏi con bằng mục <b>Bố mẹ hỏi – con trả lời</b>.`);
    const undone=rows.filter(r=>!r.p.plays).slice(0,3).map(r=>"Unit "+r.u.n);
    if(undone.length) tips.push(`Bài chưa học tới: ${undone.join(", ")}${rows.filter(r=>!r.p.plays).length>3?"…":""}`);
  }
  $("#reportArea").innerHTML=`
   <div class="rp-head">
     <div class="mark"><img src="${LOGO.mark}" alt="Hướng Nghiệp Alpha"></div>
     <div style="flex:1">
       <h1>BÁO CÁO HỌC TẬP TIẾNG ANH</h1>
       <div class="sub">ALPHA ENGLISH KIDS · HƯỚNG NGHIỆP ALPHA · SGK GLOBAL SUCCESS (GDPT 2018)</div>
     </div>
   </div>
   <div class="rp-meta">
     <span>Học sinh: <b>${esc(S.name||"(chưa đặt tên)")}</b></span>
     <span>Lớp: <b>${GRADE}</b></span>
     <span>Sách: <b>${esc(BOOK[GRADE].title)}</b></span>
     <span>Ngày in: <b>${dd(d.getDate())}/${dd(d.getMonth()+1)}/${d.getFullYear()}</b></span>
   </div>
   <div class="rp-tiles">
     <div><b>${played.length}/${rows.length}</b><span>BÀI ĐÃ HỌC</span></div>
     <div><b>${avg}%</b><span>ĐIỂM TRUNG BÌNH</span></div>
     <div><b>${stars}/${rows.length*3}</b><span>SAO ĐẠT ĐƯỢC</span></div>
     <div><b>${weak.length}</b><span>TỪ CÒN NHẦM</span></div>
   </div>
   <h2>Tiến độ theo từng bài</h2>
   <table class="rp">
     <tr><th style="width:34px">#</th><th>Tên bài</th><th style="width:52px">Lượt</th><th style="width:64px">Cao nhất</th><th style="width:52px">Sao</th><th style="width:74px">Gần nhất</th></tr>
     ${rows.map(r=>`<tr>
       <td>${r.u.n}</td>
       <td><b>${esc(r.u.t)}</b> – ${esc(r.u.vi)}</td>
       <td>${r.p.plays||"–"}</td><td>${r.p.best}%</td>
       <td>${"★".repeat(starsOf(r.p))||"–"}</td>
       <td>${r.p.date?esc(r.p.date):"–"}</td></tr>`).join("")}
     ${revs.map(r=>`<tr><td>R${r.i+1}</td><td><b>Review ${r.i+1}</b> – ôn cả chặng</td>
       <td>${r.p.plays}</td><td>${r.p.best}%</td><td>${"★".repeat(starsOf(r.p))||"–"}</td>
       <td>${r.p.date?esc(r.p.date):"–"}</td></tr>`).join("")}
   </table>
   <h2>Từ con còn hay nhầm (${weak.length})</h2>
   ${weak.length?`<div class="rp-words">${weak.map(w=>
     `<div>${w.e||"🔹"} <b>${esc(w.w)}</b> ${esc(w.ipa)} – ${esc(w.vi)} · đọc “${esc(w.vp)}” <b style="color:#b3271e">(sai ${w.miss})</b></div>`).join("")}</div>`
     : `<div class="muted">Chưa ghi nhận từ nào sai. Rất tốt!</div>`}
   <h2>Gợi ý cho bố mẹ</h2>
   <div class="rp-tip">${tips.map(t=>"• "+t).join("<br>")}</div>
   <div class="rp-foot"><b>Hướng Nghiệp Alpha</b> · Hotline: 096 937 4411 · huongnghiepalpha@gmail.com · www.huongnghiepalpha.vn</div>`;
}
function printReport(){
  parts.length=0; if(ctx2) ctx2.clearRect(0,0,cvs.width,cvs.height);
  buildReport();
  document.body.classList.add("printing");
  const done=()=>{ document.body.classList.remove("printing"); window.removeEventListener("afterprint",done); };
  window.addEventListener("afterprint",done);
  setTimeout(()=>{ window.print(); setTimeout(done,1500); },60);
}

/* ===================================================================
   GẮN SỰ KIỆN
   =================================================================== */
$("#saveName").onclick=()=>{ S.name=$("#kidName").value.trim(); save(); SFX.ok();
  alert(S.name?("Xin chào "+S.name+"! Cùng học thôi nào 🎉"):"Đã xoá tên."); };
$("#btnSound").onclick=()=>{ S.sound=!S.sound; save(); $("#btnSound").textContent=S.sound?"🔊":"🔇"; if(!S.sound&&window.speechSynthesis) speechSynthesis.cancel(); };
$("#btnParent").onclick=()=>{ renderParent(); show("scParent"); };
$("#backHome").onclick=()=>show("scHome");
$("#backUnits").onclick=()=>{ renderUnits(); show("scUnits"); };
$("#backFromParent").onclick=()=>{ renderHome(); show("scHome"); };
$("#backFromAdv").onclick=()=>{ renderUnits(); show("scUnits"); };
$("#quitPlay").onclick=()=>{ if(confirm("Con muốn dừng bài này chứ?")){ stopTimer(); if(window.speechSynthesis)speechSynthesis.cancel(); renderUnits(); show("scUnits"); } };
$("#nextBtn").onclick=()=>{ qi++; nextQ(); };
$("#againBtn").onclick=()=>startSession(MODE);
$("#toUnitsBtn").onclick=()=>{ if(CUR && CUR.adv){ renderAdv(); show("scAdv"); } else { renderUnits(); show("scUnits"); } };
$("#nextUnitBtn").onclick=()=>{ const nx=findU(CUR.n+1); if(!nx){ renderUnits(); show("scUnits"); return; } openUnit(nx.n); };
$$(".ptab").forEach(t=>t.onclick=()=>{
  $$(".ptab").forEach(x=>x.classList.remove("on")); t.classList.add("on");
  ["rep","ask","set"].forEach(k=>$("#p"+cap(k)).classList.toggle("hide", k!==t.dataset.ptab));
});
$("#askUnit").onchange=e=>renderAsk(+e.target.value);
$("#printAsk").onclick=()=>window.print();
$("#printReport").onclick=printReport;
$("#playAllAsk").onclick=()=>{
  const items=$$("#askList [data-say]").map(b=>b.dataset.say); let i=0;
  const go=()=>{ if(i>=items.length) return; speak(items[i++]); setTimeout(go,2600); }; go();
};
$("#saveSet").onclick=()=>{ S.name=$("#setName").value.trim(); S.settings.len=+$("#setLen").value;
  S.settings.time=+$("#setTime").value; S.settings.voice=$("#setVoice").value; save(); SFX.ok(); alert("Đã lưu cài đặt ✓"); };
/* Nghe thử giọng đọc — để bố mẹ tự kiểm tra máy có đọc được không.
   Đây là nơi bắt lỗi nhanh nhất khi phụ huynh báo "điện thoại không có tiếng". */
$("#testVoice").onclick=()=>{
  const n=$("#voiceNote");
  n.style.display="block";
  if(!window.speechSynthesis){
    n.innerHTML="Trình duyệt này không có giọng đọc. Bố mẹ mở app bằng <b>Chrome</b> (Android) hoặc <b>Safari</b> (iPhone) giúp con nhé.";
    return;
  }
  if(!S.sound){
    n.innerHTML="Âm thanh trong app đang <b>TẮT</b>. Bố mẹ bấm biểu tượng 🔇 trên thanh đầu để bật lại.";
    return;
  }
  n.innerHTML="Đang đọc thử… bố mẹ nghe câu <b>“Hello, I am your English friend.”</b>";
  S.settings.voice=$("#setVoice").value; save();
  TTS_OK=null;
  speak("Hello, I am your English friend.", .9);
  setTimeout(()=>{
    if(TTS_OK===true){
      n.innerHTML="✅ Máy đọc được bình thường. Nếu vẫn không nghe thấy, bố mẹ kiểm tra: "
        + "<b>nút gạt im lặng / chế độ rung</b> bên hông máy, và <b>vặn to âm lượng media</b> khi app đang đọc.";
    }else{
      n.innerHTML="⚠️ Máy chưa đọc được. Bố mẹ thử theo thứ tự: "
        + "<b>1)</b> tắt chế độ im lặng · <b>2)</b> vặn to âm lượng · "
        + "<b>3)</b> Cài đặt điện thoại → Ngôn ngữ &amp; nhập liệu (hoặc Trợ năng) → "
        + "<b>Chuyển văn bản thành lời nói</b> → tải gói tiếng Anh. "
        + "Trong lúc chờ, con vẫn học được: các bài nghe có nút <b>“Xem chữ”</b> ngay dưới loa.";
    }
  }, 2600);
};
$("#saveGas").onclick=()=>{ S.gas=$("#gasUrl").value.trim(); save(); alert(S.gas?"Đã lưu đường dẫn đồng bộ ✓":"Đã tắt đồng bộ."); };
$("#testGas").onclick=()=>{ if(!$("#gasUrl").value.trim()){alert("Bố mẹ hãy dán URL trước nhé.");return;}
  S.gas=$("#gasUrl").value.trim(); save();
  syncGAS({unit:0,unitTitle:"TEST",mode:"test",pct:100,score:0,correct:0,total:0,wrong:""});
  alert("Đã gửi thử. Bố mẹ mở Google Sheet để kiểm tra dòng mới nhé."); };
$("#exportJson").onclick=()=>{
  const blob=new Blob([JSON.stringify(S,null,2)],{type:"application/json"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
  a.download="alpha-english-kids-"+(S.name||"bé")+".json"; a.click();
};
$("#resetAll").onclick=()=>{ if(confirm("Xoá toàn bộ tiến độ và huy hiệu trên máy này?")){
  S=JSON.parse(JSON.stringify(DEF)); save(); renderParent(); renderHome(); alert("Đã xoá xong."); } };
/* ---------- Cộng đồng & Gieo hạt ---------- */
const SEED_INFO = {
  sq_20 :{ten:"20.000đ"},  sq_50 :{ten:"50.000đ"},
  sq_100:{ten:"100.000đ"}, sq_tu_chon:{ten:"bố mẹ tự nhập số tiền"}
};
function pickSeed(k){
  if(!QRIMG[k]) return;
  $("#seedQR").src = QRIMG[k];
  $("#seedAmt").innerHTML = "Mã đang chọn: <b>"+SEED_INFO[k].ten+"</b>";
  $$("#seedOpts .seedopt").forEach(b=>b.classList.toggle("on", b.dataset.k===k));
}
function seedNote(){
  const ten = (S.user && S.user.name) ? S.user.name : (S.name||"");
  const bo = ten ? ("GIEOHAT "+ten.toUpperCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/gi,"D")) : "GIEOHAT";
  $("#seedNote").textContent = bo;
  const h=$("#seedHintName"); if(h) h.textContent = ten||"";
}
$("#btnSeed").onclick = ()=>{ SFX.tap(); seedNote(); pickSeed("sq_20"); $("#seedModal").classList.remove("hide"); };
$("#seedX").onclick   = ()=> $("#seedModal").classList.add("hide");
$("#seedModal").onclick = e => { if(e.target.id==="seedModal") $("#seedModal").classList.add("hide"); };
$$("#seedOpts .seedopt").forEach(b=>b.onclick=()=>{ SFX.tap(); pickSeed(b.dataset.k); });

/* ---------- Hướng dẫn cho bố mẹ ---------- */
function openGuide(){ SFX.tap(); $("#guideModal").classList.remove("hide");
  $("#guideScroll").scrollTop=0; document.body.style.overflow="hidden"; }
function closeGuide(){ $("#guideModal").classList.add("hide"); document.body.style.overflow=""; }
$("#btnGuide").onclick   = openGuide;
$("#guideClose").onclick = closeGuide;
$("#guidePrint").onclick = ()=>{
  /* body đang bị khoá cuộn khi mở hướng dẫn — phải trả lại trước khi in,
     nếu không trình duyệt chỉ in đúng phần nhìn thấy trên màn hình */
  const ovl = document.body.style.overflow;
  document.body.style.overflow = "";
  /* đưa nội dung vào ô của bảng in để <tfoot> lặp chân trang ở mọi trang giấy */
  const body = $("#guideBody"), cell = $("#printCell"), sheet = $("#printSheet");
  try{ cell.appendChild(body); sheet.classList.remove("hide"); }catch(e){}
  document.body.classList.add("printguide");
  const xong = ()=>{
    document.body.classList.remove("printguide");
    document.body.style.overflow = ovl;
    try{ $("#guideScroll").appendChild(body); sheet.classList.add("hide"); }catch(e){}
  };
  if(window.matchMedia){
    const mq = window.matchMedia("print");
    const h = e => { if(!e.matches){ xong(); mq.removeEventListener("change",h); } };
    mq.addEventListener("change", h);
  }
  setTimeout(()=>{ window.print(); setTimeout(xong, 1200); }, 80);
};

$("#btnGroupQR").onclick = ()=>{ SFX.tap(); $("#groupModal").classList.remove("hide"); };
$("#groupX").onclick     = ()=> $("#groupModal").classList.add("hide");
$("#groupModal").onclick = e => { if(e.target.id==="groupModal") $("#groupModal").classList.add("hide"); };

$("#btnLogin").onclick = openLogin;
$("#btnLoginEdit").onclick = openLogin;
$("#loginX").onclick  = closeLogin;
$("#liSave").onclick  = saveLogin;
$("#liOut").onclick   = logout;
$("#loginModal").onclick = e => { if(e.target.id==="loginModal") closeLogin(); };
$("#liArea").onkeydown = e => { if(e.key==="Enter") saveLogin(); };
document.addEventListener("keydown", e => {
  if(e.key!=="Escape") return;
  if(!$("#loginModal").classList.contains("hide")) closeLogin();
  $("#seedModal").classList.add("hide");
  $("#groupModal").classList.add("hide");
  if(!$("#guideModal").classList.contains("hide")) closeGuide();
});
/* ---------- Logo Hướng Nghiệp Alpha ---------- */
(function setLogos(){
  const put=(id,src)=>{ const el=document.getElementById(id); if(el) el.src=src; };
  put("logoMark",  LOGO.mark);
  put("logoLogin", LOGO.logo);
  const gh=document.querySelector("#guideBody header .in");
  if(gh && !gh.querySelector(".gh-logo")){
    const d=document.createElement("div");
    d.className="gh-logo"; d.innerHTML='<img src="'+LOGO.logo+'" alt="Hướng Nghiệp Alpha">';
    gh.insertBefore(d, gh.firstChild);
  }
})();

/* Đường về trang chọn môn. Trên tên miền thật thì về hoc.huongnghiepalpha.vn;
   chạy thử ở nơi khác thì về thư mục cha. Bản offline một file không hiện. */
(function(){
  const b = $("#backHub");
  if(!b || location.protocol === "file:") return;
  if(onHNA()){ b.href = "https://hoc."+HNA_DOMAIN+"/"; b.classList.remove("hide"); }
  else if(/\/ta1(\/|\/index\.html)?$/.test(location.pathname)){ b.classList.remove("hide"); }
})();

loginLabel();
enforceGate();
queueFlush();
window.addEventListener("online", queueFlush);

$$(".bottomnav button").forEach(b=>b.onclick=()=>{
  const n=b.dataset.nav;
  if(n==="home"){ renderHome(); show("scHome"); }
  if(n==="units"){ renderUnits(); show("scUnits"); }
  if(n==="stick"){ renderHome(); show("scHome"); setTimeout(()=>$("#stickerBook").scrollIntoView({behavior:"smooth",block:"center"}),120); }
  if(n==="parent"){ renderParent(); show("scParent"); }
});

/* khởi động */
$("#btnSound").textContent = S.sound?"🔊":"🔇";
buildPool();
renderHome(); renderUnits(); show("scHome");
window.__APP={G1,G2,G3,G4,G5,BOOK,GEN,TRANS,setGrade,buildQuestions,vnSay,intoOf,
  weakUnit,blockUnit,weakWordList,openUnitObj,buildReport,advUnit,extPool,ADV_MODES,
  S:()=>S, get POOL(){return POOL},
  cur:()=>Q[qi], state:()=>({qi,total:Q.length,score,correctN,totalN})};
