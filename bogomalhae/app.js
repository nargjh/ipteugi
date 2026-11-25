/* 보고말해 v2 — 랭플릭스 쓰는 방식 본뜸
   이중자막 대본 시청 · 핵심 표현 주황 · 표현 카드(추가 안함/추가하기) · 쉐도잉
   숏폼 세로 넘기기 · 오늘의 복습 퀴즈(칩 빈칸·듣기·타이핑·말하기) · 간격 복습
   기록은 이 브라우저 localStorage 에만. */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const DAY = 86400000;
const LADDER = [1, 3, 7, 14, 30, 60, 120, 365]; // 맞힐 때마다 다음 복습까지 (일)
const fmt = (s) => { s = Math.max(0, Math.floor(s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const normW = (w) => w.toLowerCase().replace(/[’‘]/g, "'").replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, "");

/* ================= 저장 ================= */
const store = (() => {
  const d = JSON.parse(localStorage.getItem("bgm2") || "{}");
  d.videos ??= []; d.items ??= []; d.days ??= [];
  return d;
})();
const save = () => localStorage.setItem("bgm2", JSON.stringify(store));
const todayKey = () => new Date().toLocaleDateString("sv");
function markStudy() { if (!store.days.includes(todayKey())) { store.days.push(todayKey()); save(); } }
function streak() {
  let n = 0, t = new Date();
  if (!store.days.includes(t.toLocaleDateString("sv"))) t = new Date(t - DAY);
  while (store.days.includes(t.toLocaleDateString("sv"))) { n++; t = new Date(t - DAY); }
  return n;
}
const dueItems = () => store.items.filter((x) => x.due <= Date.now());
function toast(m) { const t = $("#toast"); t.textContent = m; t.classList.add("on"); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove("on"), 1500); }
function speak(text, rate = 1, t) { if (typeof playTTS === "function") return playTTS(text, t?.tts || "en-US-AvaNeural", rate < 0.8 ? "-25%" : rate < 0.95 ? "-10%" : "+0%", null, false); speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = "en-US"; u.rate = rate; speechSynthesis.speak(u); }

/* ================= 표현 사전 · 찾기 ================= */
const IRR = {
  get: "got gotten getting gets", go: "went gone going goes", come: "came coming comes", take: "took taken taking takes",
  make: "made making makes", give: "gave given giving gives", find: "found finding finds", put: "putting puts",
  run: "ran running runs", keep: "kept keeping keeps", hold: "held holding holds", bring: "brought bringing brings",
  let: "letting lets", set: "setting sets", cut: "cutting cuts", sit: "sat sitting sits", stand: "stood standing stands",
  break: "broke broken breaking breaks", fall: "fell fallen falling falls", feel: "felt feeling feels", leave: "left leaving leaves",
  hang: "hung hanging hangs", think: "thought thinking thinks", buy: "bought buying buys", pay: "paid paying pays",
  say: "said saying says", tell: "told telling tells", see: "saw seen seeing sees", show: "showed shown showing shows",
  wake: "woke woken waking wakes", do: "did done doing does", have: "had having has 've 'd", be: "am is are was were been being 'm 're 's",
  hit: "hitting hits", win: "won winning wins", catch: "caught catching catches", grab: "grabbed grabbing grabs",
  stop: "stopped stopping stops", drop: "dropped dropping drops", plan: "planned planning plans", shut: "shutting shuts",
  sell: "sold selling sells", speak: "spoke spoken speaking speaks", eat: "ate eaten eating eats", try: "tried trying tries",
  carry: "carried carrying carries", worry: "worried worrying worries", log: "logged logging logs", sign: "signed signing signs",
  step: "stepped stepping steps", chill: "chilled chilling chills", miss: "missed missing misses", deal: "dealt dealing deals",
  i: "", you: "", can: "could", will: "would 'll",
};
function forms(w) {
  const out = new Set([w]);
  if (w in IRR) { IRR[w].split(" ").filter(Boolean).forEach((f) => out.add(f)); return out; }
  if (!/^[a-z]+$/.test(w) || w.length < 3) return out;
  out.add(w.endsWith("s") || w.endsWith("sh") || w.endsWith("ch") ? w + "es" : w + "s");
  if (w.endsWith("e")) { out.add(w + "d"); out.add(w.slice(0, -1) + "ing"); }
  else if (w.endsWith("y") && !/[aeiou]y$/.test(w)) { out.add(w.slice(0, -1) + "ied"); out.add(w + "ing"); }
  else { out.add(w + "ed"); out.add(w + "ing"); }
  return out;
}
const POSS = new Set(["my", "your", "his", "her", "their", "our", "its"]);
const SELF = new Set(["myself", "yourself", "himself", "herself", "themselves", "ourselves", "itself"]);
const EXPR = (window.EXPR_RAW || "").trim().split("\n").map((l) => {
  const [text, mean, lv, cat] = l.split("|");
  return { text, mean, lv: +lv || 1, cat: cat || "일상", toks: text.toLowerCase().split(/\s+/) };
}).filter((e) => e.text);
const FIRST = new Map(); // 첫 낱말 꼴 → 표현들
for (const e of EXPR) for (const f of forms(e.toks[0])) { if (!FIRST.has(f)) FIRST.set(f, []); FIRST.get(f).push(e); }
const EXPR_BY_TEXT = new Map(EXPR.map((e) => [e.text.toLowerCase(), e]));

function tokMatch(pt, w) {
  if (pt === "one's") return POSS.has(w);
  if (pt === "oneself") return SELF.has(w);
  if (pt === "be") return forms("be").has(w) || /'(m|re|s)$/.test(w);
  return pt === w || (pt.length > 2 && forms(pt).has(w));
}
/* 문장 → [{a,b,expr}] (낱말 번호 a~b, 겹치지 않게 긴 것 먼저) */
function findExpr(words) {
  const W = words.map(normW), hits = [];
  for (let i = 0; i < W.length; i++) {
    const cands = new Set([...(FIRST.get(W[i]) || [])]);
    if (/'(m|re|s)$/.test(W[i])) (FIRST.get("be") || []).forEach((e) => cands.add(e));
    for (const e of cands) {
      let j = i + 1, k = 1, ok = true;
      while (k < e.toks.length && ok) {
        const pt = e.toks[k];
        if (pt === "a" && e.toks.length > 2 && k > 0 && k < e.toks.length - 1 && /^[A-Z]$/.test(e.text.split(/\s+/)[k])) {
          // A = 낱말 1~3개 자리
          const next = e.toks[k + 1]; let found = false;
          for (let s = 1; s <= 3 && j + s < W.length; s++) if (tokMatch(next, W[j + s])) { j += s; k++; found = true; break; }
          if (!found) ok = false;
          continue;
        }
        if (j < W.length && tokMatch(pt, W[j])) { j++; k++; } else ok = false;
      }
      if (ok) hits.push({ a: i, b: j - 1, e });
    }
  }
  hits.sort((x, y) => (y.b - y.a) - (x.b - x.a) || x.a - y.a);
  const used = new Set(), out = [];
  for (const h of hits) {
    let free = true; for (let q = h.a; q <= h.b; q++) if (used.has(q)) free = false;
    if (!free) continue;
    for (let q = h.a; q <= h.b; q++) used.add(q);
    out.push(h);
  }
  return out.sort((x, y) => x.a - y.a);
}
/* 문장 → 화면용 HTML (낱말마다 data-w, 표현은 .ex) */
function lineHtml(en, li) {
  const words = en.split(/\s+/).filter(Boolean);
  const hits = findExpr(words);
  const savedTexts = new Set(store.items.map((x) => x.text.toLowerCase()));
  let html = "", i = 0;
  for (const h of hits) {
    while (i < h.a) html += `<span class="w" data-l="${li}" data-w="${i}">${esc(words[i++])}</span> `;
    const surface = words.slice(h.a, h.b + 1).join(" ");
    const sv = savedTexts.has(cleanSurface(surface).toLowerCase()) ? " saved" : "";
    html += `<span class="ex${sv}" data-l="${li}" data-a="${h.a}" data-b="${h.b}">${esc(surface)}</span> `;
    i = h.b + 1;
  }
  while (i < words.length) html += `<span class="w" data-l="${li}" data-w="${i}">${esc(words[i++])}</span> `;
  return html.trim();
}
const cleanSurface = (s) => s.replace(/^[^\w']+|[^\w'?!]+$/g, "").replace(/[,.]$/, "");

/* ================= 화면 이동 ================= */
let cur = "home", prev = "home";
function go(name, arg) {
  if (cur === "watch" && name !== "watch") leaveWatch();
  if (cur === "shorts" && name !== "shorts") leaveShorts();
  if (cur === "chat" && name !== "chat") leaveChat();
  if (name !== cur) prev = cur;
  cur = name;
  closeSheet();
  $$(".screen").forEach((s) => s.classList.toggle("hidden", s.id !== name));
  $$(".tabbar button").forEach((b) => b.classList.toggle("on", b.dataset.go === name));
  $("#app").classList.toggle("full", name === "watch" || name === "review" || name === "chat");
  ({ home: renderHome, mine: renderMine, words: renderWords, shorts: () => openShorts(arg), talk: renderTalk, chat: () => openChat(arg),
     review: () => startReview(arg), watch: () => openVideo(arg) })[name]?.();
  badges();
}
document.addEventListener("click", (e) => {
  const g = e.target.closest("[data-go]"); if (g) { go(g.dataset.go); return; }
  if (e.target.closest("[data-back]")) go(prev === cur || prev === "watch" || prev === "review" ? "home" : prev);
  const v = e.target.closest("[data-vid]");
  if (v && !e.target.closest("[data-del]")) {
    const L = LESSON_BY_ID.get(v.dataset.vid);
    if (L?.kind === "shorts" && v.dataset.as !== "watch") go("shorts", v.dataset.vid); else go("watch", v.dataset.vid);
  }
});
function badges() {
  const n = dueItems().length;
  $("#nDue").textContent = n; $("#nDue").classList.toggle("hidden", !n);
}

/* ================= 추천 (초보 일상·여행) ================= */
const LESSONS = window.LESSONS || [];
const LESSON_BY_ID = new Map(LESSONS.map((l) => [l.id, l]));
const CATS = ["전체", ...new Set(LESSONS.map((l) => l.cat))];
let catSel = "전체";
const thumb = (id, hq) => `https://i.ytimg.com/vi/${id}/${hq ? "hqdefault" : "mqdefault"}.jpg`;
function vrow(v, mine) {
  const pct = v.duration ? Math.min(100, Math.round((v.lastTime || 0) / v.duration * 100)) : 0;
  const L = LESSON_BY_ID.get(v.id);
  const tags = L ? `<span class="tag">${esc(L.cat)}</span>${L.level ? `<span class="tag g">${["", "초급", "중급", "고급"][L.level]}</span>` : ""}` : "";
  return `<button class="vrow" data-vid="${v.id}" data-as="watch"><img src="${thumb(v.id)}" alt="" loading="lazy"><div>
    <b>${esc(v.title)}</b><small>${tags}${esc(v.channel || "")}${v.dur || v.duration ? ` · ${fmt(v.dur || v.duration)}` : ""}</small>
    ${mine ? `<div class="pbar"><i style="width:${pct}%"></i></div><small>${pct}% 시청 · 담은 표현 ${store.items.filter((x) => x.vid === v.id).length}</small>` : (L?.note ? `<small>${esc(L.note)}</small>` : "")}
  </div>${mine ? `<span class="x" data-del="${v.id}">✕</span>` : ""}</button>`;
}
function renderHome() {
  $("#stStreak").textContent = streak();
  $("#stWords").textContent = store.items.length;
  const due = dueItems().length;
  $("#todayBox").innerHTML = !store.items.length
    ? `<span>영상을 보다가 <b>주황색 표현</b>을 눌러 담아 보세요. 다음 날부터 <b>오늘의 복습</b>이 열려요.</span>`
    : due ? `<span>오늘의 복습 <b>${due}개</b>가 기다리고 있어요</span><button class="btn gr" data-go="review">복습하기</button>`
      : `<span>오늘 복습 끝! 🎉<br><small style="color:var(--sub)">다음 복습 ${nextDueText()}</small></span><button class="btn ghost" id="hRand">랜덤 복습</button>`;
  $("#hRand")?.addEventListener("click", () => go("review", "random"));
  $("#catChips").innerHTML = CATS.map((c) => `<button class="${c === catSel ? "on" : ""}" data-cat="${c}">${c}</button>`).join("");
  const pick = (k) => LESSONS.filter((l) => l.kind === k && (catSel === "전체" || l.cat === catSel));
  const sh = pick("shorts");
  $("#recShorts").innerHTML = sh.length ? sh.map((l) => `<button class="scard" data-vid="${l.id}"><div class="th" style="background-image:url(${thumb(l.id, 1)})"><span>${esc(l.title)}</span></div><small>${esc(l.cat)}</small></button>`).join("") : `<p class="msg">이 갈래 쇼츠는 아직 없어요</p>`;
  const vv = pick("video");
  $("#recVideos").innerHTML = vv.length ? vv.map((l) => vrow(l)).join("") : `<p class="msg">이 갈래 영상은 아직 없어요</p>`;
  const dr = pick("drama");
  $("#recDrama").innerHTML = dr.length ? dr.map((l) => vrow(l)).join("") : `<p class="msg">이 갈래 장면은 아직 없어요</p>`;
}
$("#catChips").addEventListener("click", (e) => { const b = e.target.closest("[data-cat]"); if (b) { catSel = b.dataset.cat; renderHome(); } });
function nextDueText() {
  if (!store.items.length) return "";
  const d = Math.ceil((Math.min(...store.items.map((x) => x.due)) - Date.now()) / DAY);
  return d <= 1 ? "내일" : `${d}일 뒤`;
}

/* ================= 내 영상 (링크 추가) ================= */
function renderMine() {
  const v = [...store.videos].sort((a, b) => (b.seenAt || 0) - (a.seenAt || 0));
  $("#myVideos").innerHTML = v.length ? v.map((x) => vrow(x, true)).join("") : `<p class="empty">＋ 유튜브 영상을 추가하세요!</p>`;
}
$("#myVideos").addEventListener("click", (e) => {
  const d = e.target.closest("[data-del]"); if (!d) return;
  e.stopPropagation();
  store.videos = store.videos.filter((v) => v.id !== d.dataset.del); save(); renderMine();
});
$("#urlForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const u = $("#urlIn").value.trim(); if (!u) return;
  $("#urlMsg").className = "msg"; $("#urlMsg").textContent = "자막을 분석하는 중…";
  try { const d = await loadSubs(u); $("#urlIn").value = ""; rememberVideo(d); go("watch", d.id); }
  catch (err) { $("#urlMsg").className = "msg err"; $("#urlMsg").textContent = err.message; }
});

/* ================= 자막 불러오기 ================= */
const subsCache = {};
async function loadSubs(urlOrId) {
  if (subsCache[urlOrId]) return subsCache[urlOrId];
  const r = await fetch(`/api/subs?url=${encodeURIComponent(urlOrId)}`);
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "자막을 못 가져왔어요");
  j.lines.forEach((l) => (l.html = lineHtml(l.en, l.i)));
  subsCache[urlOrId] = subsCache[j.id] = j;
  return j;
}
function rememberVideo(d) {
  let v = store.videos.find((x) => x.id === d.id);
  if (!v) { v = { id: d.id }; store.videos.push(v); }
  Object.assign(v, { title: d.title, channel: d.channel, duration: d.duration, seenAt: Date.now() });
  save();
  return v;
}
const lineAt = (lines, t) => { for (let i = lines.length - 1; i >= 0; i--) if (lines[i].s <= t + 0.05) return i; return -1; };

/* ================= S04 이중자막 시청 ================= */
let player = null, playerReady = false, data = null, idx = -1, loopOn = false, rateI = 0, tick = null, clipStop = null;
const RATES = [1, 1.25, 1.5, 0.75, 0.5];  // 원어민 속도 연습용 빠르게도
async function openVideo(id) {
  $("#vTitle").textContent = "자막 분석 중…"; $("#script").innerHTML = "";
  try { data = await loadSubs(id); } catch (err) { toast(err.message); go("home"); return; }
  const v = rememberVideo(data); markStudy();
  $("#vTitle").textContent = data.title + (data.ko_src === "machine" ? " · 한글은 자동 번역" : "");
  $("#tDur").textContent = fmt(data.duration);
  $("#script").innerHTML = data.lines.map((l) => `<div class="ln" data-i="${l.i}"><div class="en">${l.html}</div><div class="ko">${esc(l.ko)}</div></div>`).join("");
  idx = -1; loopOn = false; $("#bLoop").classList.remove("on");
  const L = LESSON_BY_ID.get(data.id);
  const start = v.lastTime > 3 ? v.lastTime - 2 : (L?.start || 0);
  const make = () => {
    if (player) { player.loadVideoById({ videoId: data.id, startSeconds: start }); return; }
    player = new YT.Player("player", {
      videoId: data.id,
      playerVars: { start: Math.floor(start), cc_load_policy: 0, iv_load_policy: 3, rel: 0, playsinline: 1, controls: 0, disablekb: 1 },
      events: {
        onReady: () => { playerReady = true; player.playVideo(); player.setPlaybackRate(RATES[rateI]); },
        onStateChange: (e) => { $("#bPlay").textContent = e.data === 1 ? "⏸" : "▶"; if (e.data === 1) { try { player.unloadModule("captions"); } catch {} } },
      },
    });
  };
  window.YT?.Player ? make() : (window.onYouTubeIframeAPIReady = make);
  clearInterval(tick); tick = setInterval(onTick, 100);
}
function leaveWatch() {
  clearInterval(tick); stopRec();
  if (player?.getCurrentTime && data) {
    const v = store.videos.find((x) => x.id === data.id);
    if (v) { v.lastTime = player.getCurrentTime(); save(); }
    player.pauseVideo();
  }
}
function onTick() {
  if (!playerReady || !data || !player.getCurrentTime) return;
  const t = player.getCurrentTime();
  if (!seeking) { $("#seek").value = data.duration ? Math.round(t / data.duration * 1000) : 0; $("#tCur").textContent = fmt(t); }
  if (clipStop != null && t >= clipStop) { player.pauseVideo(); clipStop = null; }
  if (loopOn && idx >= 0) { const l = data.lines[idx]; if (t >= l.e + 0.1 || t < l.s - 0.6) player.seekTo(l.s, true); return; }
  const i = lineAt(data.lines, t);
  if (i !== idx) showLine(i);
}
function showLine(i) {
  idx = i;
  $$("#script .ln.cur").forEach((x) => x.classList.remove("cur", "peek"));
  const el = $(`#script .ln[data-i="${i}"]`);
  if (!el) return;
  el.classList.add("cur");
  const box = $("#script");
  box.scrollTop = el.offsetTop - box.offsetTop - box.clientHeight * 0.22;
}
function jump(d) {
  if (!data || !playerReady) return;
  const base = idx < 0 ? lineAt(data.lines, player.getCurrentTime()) : idx;
  const i = Math.max(0, Math.min(data.lines.length - 1, base + d));
  player.seekTo(data.lines[i].s, true); player.playVideo(); showLine(i);
}
let seeking = false;
$("#seek").addEventListener("input", () => { seeking = true; $("#tCur").textContent = fmt($("#seek").value / 1000 * data.duration); });
$("#seek").addEventListener("change", () => { seeking = false; player.seekTo($("#seek").value / 1000 * data.duration, true); });
$("#bPrev").onclick = () => jump(-1);
$("#bNext").onclick = () => jump(1);
$("#bPlay").onclick = () => (player.getPlayerState() === 1 ? player.pauseVideo() : player.playVideo());
$("#bLoop").onclick = () => { loopOn = !loopOn; $("#bLoop").classList.toggle("on", loopOn); if (loopOn && idx < 0) jump(0); toast(loopOn ? "한 문장 반복" : "반복 끔"); };
$("#bRate").onclick = () => { rateI = (rateI + 1) % RATES.length; player.setPlaybackRate(RATES[rateI]); $("#bRate").textContent = RATES[rateI] + "x"; };
$("#bListen").onclick = () => { const on = $("#script").classList.toggle("listen"); $("#bListen").classList.toggle("on", on); toast(on ? "자막을 가렸어요 · 줄을 길게 누르면 보여요" : "리스닝 연습 끔"); };
$("#bKo").onclick = () => { const off = $("#script").classList.toggle("noko"); $("#bKo").classList.toggle("on", !off); };
$("#script").addEventListener("click", (e) => {
  const ex = e.target.closest(".ex"), w = e.target.closest(".w"), ln = e.target.closest(".ln");
  if (!ln) return;
  const li = +ln.dataset.i, L = data.lines[li];
  if ($("#script").classList.contains("listen") && !ln.classList.contains("peek")) { ln.classList.add("peek"); return; }
  if (ln.classList.contains("cur") && (ex || w)) {
    player.pauseVideo();
    const words = L.en.split(/\s+/).filter(Boolean);
    if (ex) { const a = +ex.dataset.a, b = +ex.dataset.b; openExprCard({ line: L, vid: data.id, title: data.title, a, b, words }); }
    else { const a = +w.dataset.w; openExprCard({ line: L, vid: data.id, title: data.title, a, b: a, words }); }
    return;
  }
  player.seekTo(L.s, true); player.playVideo(); showLine(li);
});
$("#bShadow").onclick = () => { if (idx < 0) return toast("자막이 나올 때 눌러 주세요"); player.pauseVideo(); openShadow(data.lines[idx], data.id); };
document.addEventListener("keydown", (e) => {
  if (cur !== "watch" || e.target.tagName === "INPUT" || !$("#sheet").classList.contains("hidden")) return;
  if (e.code === "Space") { e.preventDefault(); $("#bPlay").click(); }
  if (e.code === "ArrowLeft") { e.preventDefault(); jump(-1); }
  if (e.code === "ArrowRight") { e.preventDefault(); jump(1); }
  if (e.code === "KeyR") $("#bLoop").click();
});

/* ================= 소리 내기 (영상 구간 · 미니 플레이어) ================= */
let mini = null, miniReady = false, miniQ = null, miniStop = null, miniLoop = null;
function ensureMini() {
  if (mini) return;
  mini = new YT.Player("miniPlayer", { width: 240, height: 135, playerVars: { playsinline: 1, controls: 0 },
    events: { onReady: () => { miniReady = true; if (miniQ) { miniQ(); miniQ = null; } } } });
  setInterval(() => {
    if (!miniReady || miniStop == null) return;
    if (mini.getCurrentTime() >= miniStop) {
      if (miniLoop) mini.seekTo(miniLoop, true); else { mini.pauseVideo(); miniStop = null; }
    }
  }, 80);
}
/* 구간 재생: 시청 중이면 본 플레이어, 아니면 숨은 미니 플레이어 */
function sayItem(x, rate) { x.vid ? playClip(x.vid, x.s, x.e, { rate: rate || 1 }) : speak(x.sentence || x.text, rate ? 0.7 : 0.92); }
function playClip(vid, s, e, { rate = 1, loop = false } = {}) {
  if (!vid) return;
  if (cur === "watch" && data?.id === vid && playerReady) {
    loopOn = false; $("#bLoop").classList.remove("on");
    player.setPlaybackRate(rate); player.seekTo(s, true); player.playVideo();
    clipStop = loop ? null : e + 0.15;
    if (loop) { loopOn = true; idx = lineAt(data.lines, s + 0.05); }
    return;
  }
  if (cur === "shorts" && reelPlayer && reelData?.id === vid) {
    reelPlayer.setPlaybackRate(rate); reelPlayer.seekTo(s, true); reelPlayer.playVideo(); reelClipStop = loop ? null : e + 0.15; reelLoop = loop ? [s, e] : null;
    return;
  }
  ensureMini();
  const run = () => {
    const vd = mini.getVideoData?.().video_id;
    miniStop = e + 0.2; miniLoop = loop ? Math.max(0, s - 0.1) : null;
    if (vd === vid) { mini.seekTo(Math.max(0, s - 0.1), true); mini.playVideo(); }
    else mini.loadVideoById({ videoId: vid, startSeconds: Math.max(0, s - 0.1) });
    setTimeout(() => mini.setPlaybackRate(rate), 300);
  };
  miniReady ? run() : (miniQ = run);
}
function stopClips() {
  if (miniReady) { mini.pauseVideo(); miniStop = null; miniLoop = null; }
  if (cur === "watch" && loopOn) { loopOn = false; $("#bLoop").classList.remove("on"); }
  reelLoop = null;
}

/* ================= 아래 판 ================= */
function openSheet(html) { $("#sheet").innerHTML = `<div class="grab"></div>` + html; $("#sheet").classList.remove("hidden"); $("#sheetBg").classList.remove("hidden"); }
function closeSheet() { $("#sheet").classList.add("hidden"); $("#sheetBg").classList.add("hidden"); stopRec(); }
$("#sheetBg").onclick = () => { closeSheet(); stopClips(); };

/* 3버튼: 🐢 느리게 · ⟲ 다시 · ∞ 반복 */
function ctl3(vid, s, e, say = "") {
  return `<div class="ctl3" data-vid3="${vid || ""}" data-s="${s}" data-e="${e}" data-say="${esc(say)}">
    <button data-c="slow" title="느리게">🐢</button><button data-c="again" title="다시 듣기">⟲</button><button data-c="loop" title="반복">∞</button></div>`;
}
$("#sheet").addEventListener("click", (e) => {
  const b = e.target.closest(".ctl3 button"); if (!b) return;
  const p = b.parentElement, vid = p.dataset.vid3, s = +p.dataset.s, en = +p.dataset.e;
  if (!vid || vid === "undefined" || vid === "null") return speak(p.dataset.say || "", b.dataset.c === "slow" ? 0.7 : 0.92);
  if (b.dataset.c === "loop") {
    const on = !b.classList.contains("on");
    $$("button", p).forEach((x) => x.classList.remove("on"));
    if (on) { b.classList.add("on"); playClip(vid, s, en, { loop: true }); } else stopClips();
  } else { $$("button", p).forEach((x) => x.classList.remove("on")); playClip(vid, s, en, { rate: b.dataset.c === "slow" ? 0.7 : 1 }); }
});

/* S05 표현 카드: 🔊 표현 · 뜻 · 영상 속 문장 · 🐢⟲∞ · 추가 안함 / 추가하기 */
async function openExprCard({ line, vid, title, a, b, words }) {
  const surface = cleanSurface(words.slice(a, b + 1).join(" "));
  const hit = findExpr(words).find((h) => h.a === a && h.b === b);
  const e = hit?.e;
  const sentHtml = words.map((w, i) => (i === a ? "<em>" : "") + esc(w) + (i === b ? "</em>" : "")).join(" ");
  const already = store.items.find((x) => x.text.toLowerCase() === surface.toLowerCase());
  openSheet(`<div class="ehead"><button data-say="${esc(surface)}">🔊</button>${esc(e ? e.text.replace(/\bi\b/g, "I").replace(/\bi'/g, "I'") : surface)}</div>
    <div class="mean" id="cMean">${e ? esc(e.mean) : "뜻 찾는 중…"}</div>
    <div class="lv">${e ? `${["", "초급", "중급", "고급"][e.lv]} · ${e.cat}` : "낱말"}</div>
    <div class="sent"><div class="en">${sentHtml}</div><div class="ko">${esc(line.ko)}</div>${ctl3(vid, line.s, line.e)}</div>
    <div class="two"><button class="no" id="cNo">추가 안함</button><button class="yes" id="cYes">${already ? "추가됨 ✓" : "추가하기"}</button></div>`);
  $("[data-say]", $("#sheet")).onclick = () => speak(surface, 0.85);
  let mean = e?.mean || "";
  if (!e) { mean = await lookup(surface); const m = $("#cMean"); if (m) m.textContent = mean || "(뜻을 못 찾았어요 · 문장 번역을 참고하세요)"; }
  $("#cNo").onclick = () => { closeSheet(); stopClips(); };
  $("#cYes").onclick = () => {
    if (!already) addItem({ text: surface, mean, lv: e?.lv || 1, sentence: line.en, ko: line.ko, vid, title, s: line.s, e: line.e });
    closeSheet(); stopClips();
    if (cur === "watch") { refreshLineHtml(); }
  };
}
function refreshLineHtml() {
  if (!data) return;
  data.lines.forEach((l) => (l.html = lineHtml(l.en, l.i)));
  $$("#script .ln").forEach((el) => { $(".en", el).innerHTML = data.lines[+el.dataset.i].html; });
}
const meanCache = JSON.parse(localStorage.getItem("bgm2_mean") || "{}");
async function lookup(q) {
  const k = q.toLowerCase();
  if (meanCache[k]) return meanCache[k];
  try {
    const r = await fetch(`/api/meaning?q=${encodeURIComponent(q)}`);
    const j = await r.json();
    if (j.meaning) { meanCache[k] = j.meaning; localStorage.setItem("bgm2_mean", JSON.stringify(meanCache)); }
    return j.meaning || "";
  } catch { return ""; }
}
function addItem(o) {
  store.items.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), ...o,
    created: Date.now(), stage: 0, due: Date.now() + 10 * 60_000, last: Date.now(), wrong: 0 });
  save(); markStudy(); badges();
  toast("내 표현에 추가했어요");
}

/* ================= S07 쉐도잉 ================= */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null;
function stopRec() { if (rec) { try { rec.abort(); } catch {} rec = null; } $(".mic")?.classList.remove("rec"); }
const toks = (s) => s.toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9' ]/g, " ").split(/\s+/).filter(Boolean);
function scoreSpeech(target, heard) {
  const T = toks(target), H = toks(heard);
  const dp = Array.from({ length: T.length + 1 }, () => Array(H.length + 1).fill(0));
  for (let i = T.length - 1; i >= 0; i--) for (let j = H.length - 1; j >= 0; j--)
    dp[i][j] = T[i] === H[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const ok = new Set(); let i = 0, j = 0;
  while (i < T.length && j < H.length) { if (T[i] === H[j]) { ok.add(i); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++; }
  return { pct: T.length ? Math.round(ok.size / T.length * 100) : 0, ok, T };
}
function listen(onDone, onPart) {
  if (!SR) { toast("이 브라우저는 말 알아듣기를 못 해요 (크롬·엣지·안드로이드 크롬)"); return false; }
  stopRec();
  rec = new SR(); rec.lang = "en-US"; rec.interimResults = true; rec.continuous = false;
  let heard = "";
  rec.onresult = (ev) => { heard = [...ev.results].map((r) => r[0].transcript).join(" "); onPart?.(heard); };
  rec.onerror = (ev) => { if (ev.error !== "aborted") toast(ev.error === "not-allowed" ? "마이크를 허용해 주세요" : "다시 말해 주세요"); };
  rec.onend = () => { const was = rec; rec = null; $(".mic")?.classList.remove("rec"); if (was) onDone(heard); };
  rec.start();
  return true;
}
function openShadow(line, vid) {
  openSheet(`<div class="lv">쉐도잉 · 원어민 소리를 듣고 그대로 따라 말해요</div>
    <div class="sent"><div class="en" id="shEn">${esc(line.en)}</div><div class="ko">${esc(line.ko)}</div>${ctl3(vid, line.s, line.e)}</div>
    <div id="shOut" class="score"></div>
    <button class="mic" id="shMic"><span>🎙</span>쉐도잉</button>
    <div class="heard" id="shHeard">버튼을 누르고 말하세요 · 다시 누르면 멈춤</div>`);
  playClip(vid, line.s, line.e);
  $("#shMic").onclick = () => {
    if (rec) { rec.stop(); return; }
    stopClips();
    if (!listen((heard) => {
      if (!heard) { $("#shHeard").textContent = "소리를 못 들었어요. 다시 눌러 주세요."; return; }
      const r = scoreSpeech(line.en, heard); markStudy();
      const msg = r.pct >= 90 ? "완벽해요! 🎉" : r.pct >= 70 ? "좋아요! 빨간 낱말만 한 번 더" : "원어민 소리를 다시 들어 볼까요?";
      $("#shOut").innerHTML = `<span class="pct">${r.pct}점</span>${msg}<br>${r.T.map((w, k) => `<span class="${r.ok.has(k) ? "ok" : "miss"}">${esc(w)}</span>`).join(" ")}`;
      $("#shHeard").textContent = "내가 한 말: " + heard;
    }, (part) => { $("#shHeard").textContent = "🎙 " + part; })) return;
    $("#shMic").classList.add("rec"); $("#shHeard").textContent = "🎙 듣고 있어요…";
  };
}

/* ================= S03 숏폼 (세로 넘기기) ================= */
let reelPlayer = null, reelData = null, reelTick = null, reelIdx = -1, reelLine = -1, reelKo = true, reelClipStop = null, reelLoop = null, reelObs = null;
function reelList() {
  const mine = store.videos.filter((v) => v.short && !LESSON_BY_ID.has(v.id));
  return [...LESSONS.filter((l) => l.kind === "shorts"), ...mine];
}
function openShorts(startId) {
  const list = reelList();
  if (!list.length) { $("#reel").innerHTML = `<p class="empty" style="color:#fff">쇼츠가 아직 없어요</p>`; return; }
  $("#reel").innerHTML = list.map((l, i) => `<div class="slide" data-i="${i}" data-id="${l.id}">
    <div class="cover" style="background-image:url(${thumb(l.id, 1)})"></div><div class="pv"></div>
    <div class="stitle">${esc(l.title)}</div>
    <div class="tapguard"></div>
    <div class="cap"><div class="en"></div><div class="ko"></div></div>
    <div class="rail">
      <button data-r="shadow"><span>🗣</span>쉐도잉</button>
      <button data-r="add"><span>＋</span>담기</button>
      <button data-r="loop"><span>🔁</span>반복</button>
      <button data-r="ko" class="${reelKo ? "on" : ""}"><span>文</span>한글</button>
      <button data-r="full"><span>📜</span>대본</button>
    </div></div>`).join("");
  reelObs?.disconnect();
  reelObs = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting && en.intersectionRatio > 0.6) activateSlide(+en.target.dataset.i); }), { root: $("#reel"), threshold: [0.6] });
  $$("#reel .slide").forEach((s) => reelObs.observe(s));
  const si = Math.max(0, list.findIndex((l) => l.id === startId));
  requestAnimationFrame(() => { $("#reel").scrollTop = si * $("#reel").clientHeight; activateSlide(si); });
}
async function activateSlide(i) {
  if (i === reelIdx) return;
  reelIdx = i; reelLine = -1; reelLoop = null;
  const slide = $(`#reel .slide[data-i="${i}"]`); if (!slide) return;
  if (reelPlayer) { try { reelPlayer.destroy(); } catch {} reelPlayer = null; }
  $$("#reel .pv").forEach((p) => (p.innerHTML = ""));
  const id = slide.dataset.id;
  const holder = document.createElement("div"); $(".pv", slide).appendChild(holder);
  reelData = null;
  loadSubs(id).then((d) => { if (reelIdx === i) { reelData = d; markStudy(); } }).catch(() => { $(".cap .en", slide).textContent = "(영어 자막이 없는 영상)"; });
  const L = LESSON_BY_ID.get(id);
  const make = () => {
    reelPlayer = new YT.Player(holder, { videoId: id, playerVars: { playsinline: 1, controls: 0, rel: 0, loop: 1, playlist: id, start: Math.floor(L?.start || 0), cc_load_policy: 0, iv_load_policy: 3 },
      events: { onReady: (e) => { e.target.playVideo(); $(".cover", slide).style.display = "none"; },
        onStateChange: (e) => { if (e.data === 1) { try { e.target.unloadModule("captions"); } catch {} } } } });
  };
  window.YT?.Player ? make() : (window.onYouTubeIframeAPIReady = make);
  clearInterval(reelTick);
  reelTick = setInterval(() => {
    if (!reelPlayer?.getCurrentTime || !reelData) return;
    const t = reelPlayer.getCurrentTime();
    if (reelClipStop != null && t >= reelClipStop) { reelPlayer.pauseVideo(); reelClipStop = null; }
    if (reelLoop && t >= reelLoop[1] + 0.1) reelPlayer.seekTo(reelLoop[0], true);
    if (L?.end && t >= L.end) reelPlayer.seekTo(L.start || 0, true);
    const li = lineAt(reelData.lines, t);
    if (li !== reelLine) {
      reelLine = li;
      const l = reelData.lines[li];
      $(".cap .en", slide).innerHTML = l && t < l.e + 1.5 ? l.html : "";
      $(".cap .ko", slide).textContent = l && reelKo && t < l.e + 1.5 ? l.ko : "";
    }
  }, 100);
}
function leaveShorts() { clearInterval(reelTick); if (reelPlayer) { try { reelPlayer.destroy(); } catch {} reelPlayer = null; } reelIdx = -1; }
$("#reel").addEventListener("click", (e) => {
  const slide = e.target.closest(".slide"); if (!slide || +slide.dataset.i !== reelIdx) return;
  const r = e.target.closest("[data-r]"), ex = e.target.closest(".ex, .w");
  const l = reelData?.lines[reelLine];
  if (ex && l) {
    reelPlayer.pauseVideo();
    const words = l.en.split(/\s+/).filter(Boolean);
    const a = ex.classList.contains("ex") ? +ex.dataset.a : +ex.dataset.w, b = ex.classList.contains("ex") ? +ex.dataset.b : a;
    openExprCard({ line: l, vid: reelData.id, title: reelData.title, a, b, words });
    return;
  }
  if (r) {
    const k = r.dataset.r;
    if (k === "ko") { reelKo = !reelKo; $$('#reel [data-r="ko"]').forEach((x) => x.classList.toggle("on", reelKo)); reelLine = -1; return; }
    if (!l) return toast("자막이 나올 때 눌러 주세요");
    if (k === "shadow") { reelPlayer.pauseVideo(); openShadow(l, reelData.id); }
    if (k === "add") {
      if (store.items.some((x) => x.text === l.en)) return toast("이미 담았어요");
      addItem({ text: cleanSurface(l.en), mean: l.ko, lv: 1, sentence: l.en, ko: l.ko, vid: reelData.id, title: reelData.title, s: l.s, e: l.e });
    }
    if (k === "loop") { const on = !r.classList.contains("on"); r.classList.toggle("on", on); reelLoop = on ? [l.s, l.e] : null; toast(on ? "이 문장 반복" : "반복 끔"); }
    if (k === "full") { rememberVideo(reelData).short = true; save(); go("watch", reelData.id); }
    return;
  }
  if (e.target.closest(".tapguard") && reelPlayer) reelPlayer.getPlayerState() === 1 ? reelPlayer.pauseVideo() : reelPlayer.playVideo();
});

/* ================= S10 내 표현 ================= */
function renderWords() {
  const q = $("#wSearch").value.trim().toLowerCase();
  $("#wCount").textContent = `${store.items.length}개`;
  const list = store.items.filter((x) => !q || (x.text + x.mean + x.sentence).toLowerCase().includes(q)).sort((a, b) => b.created - a.created);
  $("#wordList").innerHTML = list.length ? list.map((x) => {
    const d = Math.ceil((x.due - Date.now()) / DAY);
    return `<button class="witem" data-item="${x.id}"><b>${esc(x.text)}</b><span class="m">${esc(x.mean)}</span>
      <small>${x.due <= Date.now() ? "🔁 오늘 복습" : `${d}일 뒤 복습`} · ${esc(x.sentence)}</small></button>`;
  }).join("") : `<p class="empty">${q ? "찾는 표현이 없어요" : "아직 담은 표현이 없어요.<br>영상 자막의 주황색 표현을 눌러 «추가하기» 해 보세요."}</p>`;
}
$("#wSearch").addEventListener("input", renderWords);
$("#wordList").addEventListener("click", (e) => { const b = e.target.closest("[data-item]"); if (b) openDetail(store.items.find((x) => x.id === b.dataset.item)); });
/* S06 표현 상세 */
function openDetail(x) {
  if (!x) return;
  const words = x.sentence.split(/\s+/);
  const lw = x.text.toLowerCase().split(/\s+/);
  let a = -1;
  for (let i = 0; i <= words.length - lw.length; i++) if (lw.every((w, k) => normW(words[i + k]) === normW(w))) { a = i; break; }
  const sent = a < 0 ? esc(x.sentence) : words.map((w, i) => (i === a ? "<em>" : "") + esc(w) + (i === a + lw.length - 1 ? "</em>" : "")).join(" ");
  const days = Math.max(0, Math.round((Date.now() - x.created) / DAY));
  openSheet(`<div class="ehead"><button id="dSay">🔊</button>${esc(x.text)}</div>
    <div class="mean">${esc(x.mean)}</div>
    <div class="lv">${days ? `${days}일 전 추가` : "오늘 추가"} · 다음 복습 ${x.due <= Date.now() ? "오늘" : Math.ceil((x.due - Date.now()) / DAY) + "일 뒤"}</div>
    <div class="sent"><div class="lv">영상 속 문장 · ${esc(x.title || "")}</div><div class="en">${sent}</div><div class="ko">${esc(x.ko)}</div>${ctl3(x.vid, x.s, x.e, x.sentence)}</div>
    <button class="one" id="dShadow" style="background:var(--or)">🗣 쉐도잉 연습</button>
    <div class="two"><button class="no" id="dDel" style="background:#eef0f3;color:var(--tx)">지우기</button><button class="yes" id="dWatch">▶ 장면 보기</button></div>`);
  $("#dSay").onclick = () => speak(x.text, 0.85);
  $("#dShadow").onclick = () => openShadow({ en: x.sentence, ko: x.ko, s: x.s, e: x.e }, x.vid);
  $("#dDel").onclick = () => { if (confirm(`"${x.text}" 를 지울까요?`)) { store.items = store.items.filter((y) => y !== x); save(); closeSheet(); renderWords(); badges(); } };
  if (!x.vid) { $("#dWatch").textContent = "🔊 듣기"; $("#dWatch").onclick = () => sayItem(x); return; }
  $("#dWatch").onclick = () => { const v = store.videos.find((y) => y.id === x.vid) || rememberVideoStub(x); v.lastTime = x.s + 2; save(); go("watch", x.vid); };
}
function rememberVideoStub(x) { const v = { id: x.vid, title: x.title }; store.videos.push(v); return v; }
$("#bRandom").onclick = () => store.items.length ? go("review", "random") : toast("담은 표현이 없어요");
$("#bFlash").onclick = () => store.items.length ? go("review", "flash") : toast("담은 표현이 없어요");

/* ================= S09 오늘의 복습 (퀴즈) ================= */
let deck = [], qi = 0, qTotal = 0, mode = "due", firstTry = new Map();
function startReview(m) {
  mode = m || "due";
  stopClips();
  const pool = mode === "due" ? dueItems().sort((a, b) => a.due - b.due) : shuffle(store.items);
  deck = pool.slice(0, mode === "due" ? 20 : 10);
  qi = 0; qTotal = deck.length; firstTry = new Map();
  nextQ();
}
function progress() { $("#rvBar").style.width = qTotal ? `${Math.min(100, qi / qTotal * 100)}%` : "0"; $("#rvNum").textContent = qTotal ? `${Math.min(qi + 1, qTotal)}/${qTotal}` : ""; }
function agoTag(x) {
  const d = Math.max(0, Math.round((Date.now() - (x.last || x.created)) / DAY));
  return `<div class="ago">🕘 ${d ? d + "일 전" : "오늘"} ${x.stage ? "복습" : "학습"}</div>`;
}
function qType(x) {
  if (mode === "flash") return "flash";
  const nWords = x.text.split(/\s+/).length;
  const order = ["chips", "listen", "type", "speak"];
  let t = order[Math.min(x.stage || 0, 3)];
  if (t === "speak" && !SR) t = "type";
  if (t === "listen" && store.items.filter((y) => y.mean).length < 4) t = "chips";
  if (t === "type" && nWords > 4) t = "chips";
  return t;
}
function blankInfo(x) {
  const words = x.sentence.split(/\s+/).filter(Boolean);
  const lw = x.text.toLowerCase().split(/\s+/);
  let a = -1;
  for (let i = 0; i <= words.length - lw.length; i++) if (lw.every((w, k) => normW(words[i + k]) === normW(w))) { a = i; break; }
  if (a < 0 || lw.length === words.length) { // 문장 통째로 담은 것 → 뒤쪽 낱말 최대 4개를 빈칸
    const n = Math.min(4, words.length); a = words.length - n;
    return { words, a, b: words.length - 1 };
  }
  return { words, a, b: a + lw.length - 1 };
}
function nextQ() {
  progress();
  $("#rvFoot").innerHTML = "";
  if (qi >= deck.length) return endReview();
  const x = deck[qi], t = qType(x);
  ({ chips: qChips, listen: qListen, type: qType_, speak: qSpeak, flash: qFlash })[t](x);
}
function sentHtml(bi, fillMode) {
  return bi.words.map((w, i) => {
    if (i < bi.a || i > bi.b) return esc(w);
    const core = normW(w), tail = w.slice(w.replace(/[^\w']+$/, "").length);
    return `<span class="slot" data-k="${i - bi.a}" data-ans="${esc(core)}">${fillMode === "hint" ? esc(core[0]) : ""}</span>${esc(tail)}`;
  }).join(" ");
}
function koHtml(x) {
  // 한국어 문장에서 표현 뜻에 해당하는 부분을 초록으로(뜻 낱말이 들어 있으면)
  let ko = esc(x.ko || x.mean || "");
  const key = (x.mean || "").split(/[,()·]/)[0].replace(/~/g, "").trim().slice(0, 4);
  if (key && key.length >= 2 && ko.includes(key)) ko = ko.replace(key, `<em>${key}</em>`);
  return ko;
}
/* ① 칩 빈칸 */
function qChips(x) {
  const bi = blankInfo(x);
  const ans = bi.words.slice(bi.a, bi.b + 1).map(normW);
  const others = shuffle(store.items.filter((y) => y !== x).flatMap((y) => y.text.split(/\s+/).map(normW))).filter((w) => w && !ans.includes(w));
  const extra = [...new Set(others)].slice(0, Math.max(2, 5 - ans.length));
  const bank = shuffle([...ans, ...extra]);
  $("#rvBody").innerHTML = `${agoTag(x)}<div class="qcard"><div class="qko">${koHtml(x)}</div><div class="qen">${sentHtml(bi)}</div></div>
    <div class="qhint">빈칸에 들어갈 낱말을 순서대로 골라요</div>
    <div class="bank">${bank.map((w, i) => `<button data-b="${i}" data-w="${esc(w)}">${esc(w.replace(/^i($|')/, "I$1"))}</button>`).join("")}</div>`;
  const filled = [];
  $(".bank").onclick = (e) => {
    const b = e.target.closest("button"); if (!b || b.classList.contains("used")) return;
    const slot = $(`.slot[data-k="${filled.length}"]`); if (!slot) return;
    slot.textContent = b.textContent; slot.classList.add("fill"); b.classList.add("used"); filled.push(b.dataset.w);
    if (filled.length === ans.length) judge(x, filled.join(" ") === ans.join(" "));
  };
  $(".qen").onclick = (e) => { // 채운 칸을 누르면 하나씩 빼기
    if (!filled.length || $("#rvFoot").innerHTML) return;
    const k = filled.length - 1, slot = $(`.slot[data-k="${k}"]`);
    if (!e.target.closest(".slot")) return;
    const w = filled.pop(); slot.textContent = ""; slot.classList.remove("fill");
    const btn = $$(".bank button.used").find((bb) => bb.dataset.w === w); btn?.classList.remove("used");
  };
}
/* ② 듣기 객관식: 장면 소리 → 뜻 고르기 */
function qListen(x) {
  const wrong = shuffle(store.items.filter((y) => y !== x && y.mean && y.mean !== x.mean)).slice(0, 3).map((y) => y.mean);
  const opts = shuffle([x.mean, ...wrong]);
  $("#rvBody").innerHTML = `${agoTag(x)}<div class="qcard"><div class="qen" style="text-align:center">
    <div class="qhint">장면 소리를 듣고 <b>${esc(x.text)}</b> 의 뜻을 골라요</div>${ctl3h(x)}</div></div>
    <div class="choices">${opts.map((o) => `<button data-o="${esc(o)}">${esc(o)}</button>`).join("")}</div>`;
  sayItem(x);
  $(".choices").onclick = (e) => {
    const b = e.target.closest("button"); if (!b || $("#rvFoot").innerHTML) return;
    const ok = b.dataset.o === x.mean;
    b.classList.add(ok ? "right" : "wrong");
    if (!ok) $$(".choices button").find((c) => c.dataset.o === x.mean)?.classList.add("right");
    judge(x, ok);
  };
}
function ctl3h(x) { return `<div class="ctl3 rvctl" data-vid3="${x.vid || ""}" data-s="${x.s}" data-e="${x.e}" data-say="${esc(x.sentence)}"><button data-c="slow">🐢</button><button data-c="again">⟲</button><button data-c="loop">∞</button></div>`; }
$("#rvBody").addEventListener("click", (e) => {
  const b = e.target.closest(".rvctl button"); if (!b) return;
  const p = b.parentElement;
  if (!p.dataset.vid3) return speak(p.dataset.say || "", b.dataset.c === "slow" ? 0.7 : 0.92);
  if (b.dataset.c === "loop") { const on = !b.classList.contains("on"); $$("button", p).forEach((z) => z.classList.remove("on")); if (on) { b.classList.add("on"); playClip(p.dataset.vid3, +p.dataset.s, +p.dataset.e, { loop: true }); } else stopClips(); }
  else playClip(p.dataset.vid3, +p.dataset.s, +p.dataset.e, { rate: b.dataset.c === "slow" ? 0.7 : 1 });
});
/* ③ 타이핑 (첫 글자 힌트) */
function qType_(x) {
  const bi = blankInfo(x);
  const ans = bi.words.slice(bi.a, bi.b + 1).map(normW).join(" ");
  $("#rvBody").innerHTML = `${agoTag(x)}<div class="qcard"><div class="qko">${koHtml(x)}</div><div class="qen">${sentHtml(bi, "hint")}</div></div>
    <input class="typein" id="tIn" placeholder="빈칸을 영어로 써요" autocomplete="off" autocapitalize="off" spellcheck="false">
    <button class="btn gr" id="tOk" style="padding:14px">확인</button>`;
  const inp = $("#tIn"); setTimeout(() => inp.focus(), 50);
  inp.oninput = () => { // 쓰는 대로 칸에 채워 보이기
    const typed = inp.value.trim().split(/\s+/);
    $$(".slot").forEach((s, k) => { s.textContent = typed[k] || (k === 0 && !inp.value ? s.dataset.ans[0] : ""); s.classList.toggle("fill", !!typed[k]); });
  };
  const check = () => { if ($("#rvFoot").innerHTML) return; judge(x, toks(inp.value).join(" ") === toks(ans).join(" ")); };
  $("#tOk").onclick = check; inp.onkeydown = (e) => { if (e.key === "Enter") check(); };
}
/* ④ 말하기: 한국어 보고 영어로 말하기 */
function qSpeak(x) {
  const bi = blankInfo(x);
  const ans = bi.words.slice(bi.a, bi.b + 1).map(normW);
  $("#rvBody").innerHTML = `${agoTag(x)}<div class="qcard"><div class="qko">${koHtml(x)}</div><div class="qen">${sentHtml(bi)}</div></div>
    <div class="qhint">빈칸을 넣어 문장을 소리 내 말해요</div>
    <button class="mic" id="sMic"><span>🎙</span>말하기</button><div class="heard" id="sHeard"></div>
    <button class="btn ghost" id="sSkip" style="align-self:center">말할 수 없어요</button>`;
  $("#sSkip").onclick = () => judge(x, false);
  $("#sMic").onclick = () => {
    if (rec) { rec.stop(); return; }
    if (!listen((heard) => {
      if (!heard) { $("#sHeard").textContent = "소리를 못 들었어요. 다시 눌러 주세요."; return; }
      const H = toks(heard).join(" ");
      $$(".slot").forEach((s, k) => { s.textContent = ans[k]; s.classList.add("fill"); });
      judge(x, H.includes(ans.join(" ")), `내가 한 말: ${heard}`);
    }, (p) => ($("#sHeard").textContent = "🎙 " + p))) return;
    $("#sMic").classList.add("rec");
  };
}
/* 연습 플래시카드 (채점 없음) */
function qFlash(x) {
  $("#rvBody").innerHTML = `<div class="flip" id="fl"><div class="big">${esc(x.text)}</div><small>눌러서 뜻 보기</small></div>`;
  $("#fl").onclick = () => {
    $("#fl").innerHTML = `<div class="big">${esc(x.text)}</div><div class="m">${esc(x.mean)}</div><small>${esc(x.sentence)}</small>${ctl3h(x)}`;
    sayItem(x);
    $("#rvFoot").innerHTML = `<button class="btn" style="width:100%;padding:14px" id="fNext">다음 카드</button>`;
    $("#fNext").onclick = () => { qi++; stopClips(); nextQ(); };
  };
}
/* 채점 → 정답 패널 · 간격 */
function judge(x, ok, extra = "") {
  if (!firstTry.has(x.id)) firstTry.set(x.id, ok);
  if (mode === "due") {
    if (ok && firstTry.get(x.id)) { x.stage = Math.min((x.stage || 0) + 1, LADDER.length); x.due = Date.now() + LADDER[x.stage - 1] * DAY; }
    else if (ok) { x.due = Date.now() + DAY; } // 틀렸다가 다시 맞힘 → 내일
    else { x.stage = 0; x.wrong = (x.wrong || 0) + 1; x.due = Date.now() + 10 * 60_000; deck.push(x); qTotal++; } // 틀림 → 이번 회차 끝에 다시
    x.last = Date.now(); save(); markStudy();
  }
  $("#rvFoot").innerHTML = `<div class="result ${ok ? "ok" : "bad"}"><h4>${ok ? "정답이에요!" : "아쉬워요"}<button id="rSay" title="장면 소리">🔊</button></h4>
    <p><b>${esc(x.text)}</b>: ${esc(x.mean)}</p><p style="color:var(--sub)">${esc(x.sentence)}</p>${extra ? `<p style="color:var(--sub)">${esc(extra)}</p>` : ""}
    <button class="btn" id="rNext">다음 문제</button></div>`;
  $("#rSay").onclick = () => sayItem(x);
  sayItem(x);
  $("#rNext").onclick = () => { qi++; stopClips(); nextQ(); };
  badges();
}
function endReview() {
  progress(); $("#rvBar").style.width = "100%"; $("#rvNum").textContent = "";
  const right = [...firstTry.values()].filter(Boolean).length;
  $("#rvBody").innerHTML = !qTotal
    ? `<div class="big-end"><div class="e">✅</div><h3>오늘 복습할 표현이 없어요</h3><p class="msg">${store.items.length ? "다음 복습: " + nextDueText() : "영상을 보며 표현을 담아 보세요"}</p></div>`
    : `<div class="big-end"><div class="e">🎉</div><h3>${mode === "flash" ? "다 봤어요!" : "오늘의 복습 끝!"}</h3>
      ${mode === "flash" ? "" : `<p class="msg">처음에 맞힌 문제 ${right} / ${firstTry.size}<br>틀린 표현은 잊을 때쯤 다시 나와요</p>`}</div>`;
  $("#rvFoot").innerHTML = `<button class="btn" style="width:100%;padding:14px" data-go="home">홈으로</button>`;
  badges();
}

/* ================= S11 AI 튜터 (Praktika 꼴: 영상통화·채팅·고쳐 주기) ================= */
const SCN = window.SCENARIOS || [];
const TUT = window.TUTORS || [];
let tutorId = localStorage.getItem("bgm2_tutor") || "mina";
let artStyle = localStorage.getItem("bgm2_art2") || "animal";  // 11-25 사용자 «사람은 눈·입이 어색 → 귀여운 동물» · 기본 동물 // manga · real · svg
function tutorArt(t, big) {
  if (artStyle === "animal" && window.animalSVG) return animalSVG(t);
  if (artStyle === "svg") return tutorSVG(t);
  if (artStyle === "3d") {
    if (big) return `<div class="t3d" data-vrm="models/${t.id}.vrm"></div>`;
    return `<div class="tart"><img src="img/tutors/${t.id}_manga.jpg" alt="${t.name}"><span class="b3d">3D</span></div>`;
  }
  const src = `img/tutors/${t.id}_${artStyle}.jpg`;
  if (big) return `<div class="tart"><canvas class="tcan" data-key="${t.id}_${artStyle}"></canvas></div>`;
  return `<div class="tart"><img src="${src}" alt="${t.name}" onerror="this.parentNode.outerHTML=tutorSVG(TUT.find(x=>x.id==='${t.id}'))"><div class="wave"><i></i><i></i><i></i><i></i><i></i></div></div>`;
}
const tutor = () => TUT.find((t) => t.id === tutorId) || TUT[0];
let chat = null; // {sc, hist, mode:'ai'|'script', step, hint, saved, fixes, said, busy, hands}
let aiState = null; // 서버가 알려 준 AI 상태 (마지막 오류)

function renderTalk() {
  $("#stStreak2").textContent = streak();
  $("#artPick").innerHTML = [["animal", "🦊 동물"], ["manga", "🌸 순정만화"], ["real", "📷 실사"], ["3d", "🧊 3D"], ["svg", "✏️ 기본"]].map(([k, l]) => `<button data-art="${k}" class="${k === artStyle ? "on" : ""}">${l}</button>`).join("");
  $("#tutorPick").innerHTML = TUT.map((t) => `<button class="tcard ${t.id === tutorId ? "on" : ""}" data-tutor="${t.id}">${tutorArt(t)}
    <div><b>${t.name}</b> ${t.flag}<small>${t.accent} · ${esc(t.desc)}</small></div></button>`).join("");
  $("#scChips").innerHTML = SCN.filter((s) => s.short).map((s) => `<button data-sc="${s.id}">${s.icon} ${esc(s.title)}</button>`).join("");
  $("#scList").innerHTML = SCN.filter((s) => !s.short).map((s) => `<button class="scrow" data-sc="${s.id}"><span class="ic">${s.icon}</span>
    <div><b>${esc(s.title)}</b> <span class="tag">${esc(s.cat)}</span><small>🎯 ${esc(s.mission)}</small></div></button>`).join("");
  $("#aiNote").classList.toggle("hidden", !aiState);
  if (aiState) $("#aiNote").innerHTML = `⚠️ ${esc(aiState)}<br>그동안은 상황별 <b>연습 대본</b>으로 대화해요.`;
}
$("#talk").addEventListener("click", (e) => {
  const a = e.target.closest("[data-art]");
  if (a) { artStyle = a.dataset.art; localStorage.setItem("bgm2_art2", artStyle); renderTalk(); return; }
  const t = e.target.closest("[data-tutor]");
  if (t) { tutorId = t.dataset.tutor; localStorage.setItem("bgm2_tutor", tutorId); renderTalk(); speak(`Hi, I'm ${tutor().name}!`, 0.95, tutor()); return; }
  const m = e.target.closest("[data-mode]");
  if (m) { const id = { free: "free", interview: "interview", smalltalk: "smalltalk", role: "cafe" }[m.dataset.mode]; go("chat", id); return; }
  const b = e.target.closest("[data-sc]");
  if (b) go("chat", b.dataset.sc);
});

/* 튜터 목소리: 튜터마다 고른 영어 목소리 · 말하는 동안 입이 움직임 */
let voices = [];
const loadVoices = () => (voices = speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang)));
loadVoices(); speechSynthesis.onvoiceschanged = loadVoices;
function pickVoice(t) {
  for (const key of t?.voice || []) { const v = voices.find((x) => x.name.includes(key)); if (v) return v; }
  return voices.find((v) => v.lang === "en-US") || voices[0];
}
let mouthTimer = null;
function talkAnim(on) {
  const av = $("#avatar"); if (!av) return;
  av.classList.toggle("talk", on);
  if (!on && window.VRM3D?.active()) window.VRM3D.mouth(0);
  if (!on && window.TalkPic?.active()) window.TalkPic.mouth(0);
  if (on && !analyser && window.TalkPic?.active()) { clearInterval(mouthTimer); const t0 = performance.now(); mouthTimer = setInterval(() => { const t = (performance.now() - t0) / 1000; window.TalkPic.mouth(Math.max(0, 9 + 8 * Math.sin(t * 13) + 4 * Math.sin(t * 5.3))); }, 60); return; } // 소리 크기를 못 재면 말하는 박자로
  if (on && !analyser && window.VRM3D?.active()) { clearInterval(mouthTimer); mouthTimer = setInterval(() => window.VRM3D.mouth(4 + Math.random() * 12), 110); return; }
  if (!on) { const im = $(".tart img", av); if (im) im.style.transform = ""; $$(".wave i", av).forEach((b) => { b.style.height = "6px"; }); }
  clearInterval(mouthTimer);
  const m = $(".mouth", av); if (!m) return;
  if (on) { const t0 = performance.now(); mouthTimer = setInterval(() => { const t = (performance.now() - t0) / 1000; m.setAttribute("ry", String(Math.max(2.5, 6 + 5 * Math.sin(t * 13) + 3 * Math.sin(t * 5.3)))); }, 60); } // 말하는 박자로
  else m.setAttribute("ry", "3");
}
setInterval(() => { // 깜빡임
  $$("#avatar .lids rect, .tcard .lids rect").forEach((r) => { r.setAttribute("height", "24"); setTimeout(() => r.setAttribute("height", "0"), 140); });
}, 3800);
/* 원어민 목소리(서버 edge-tts) 재생 · 소리 크기에 맞춰 입이 움직임 · 안 되면 브라우저 목소리 */
let ttsAudio = null, actx = null, analyser = null, lipRAF = null;
function stopTTS() { if (ttsAudio) { ttsAudio.onended = null; ttsAudio.pause(); ttsAudio = null; } cancelAnimationFrame(lipRAF); talkAnim(false); speechSynthesis.cancel(); }
function lipSync() {
  const m = $("#avatar .mouth"), img = $("#avatar .tart img"), bars = $$("#avatar .wave i"), v3 = window.VRM3D?.active(), tp = window.TalkPic?.active();
  if ((!m && !img && !v3 && !tp) || !analyser) return;
  const buf = new Uint8Array(analyser.fftSize);
  const loop = () => {
    analyser.getByteTimeDomainData(buf);
    let sum = 0; for (const v of buf) sum += (v - 128) * (v - 128);
    const vol = Math.sqrt(sum / buf.length);
    if (m) m.setAttribute("ry", String(Math.min(13, 2.5 + vol * 0.7)));
    if (v3) window.VRM3D.mouth(vol);
    if (tp) window.TalkPic.mouth(vol);
    if (img) img.style.transform = `scale(${1 + Math.min(0.025, vol * 0.0015)}) translateY(${-Math.min(4, vol * 0.25)}px)`;
    bars.forEach((b, k) => { b.style.height = `${6 + Math.min(34, vol * (0.8 + ((k * 37) % 10) / 10) * 1.6)}px`; });
    lipRAF = requestAnimationFrame(loop);
  };
  loop();
}
function playTTS(text, voice, rate, onEnd, withLips, spd = 1) {
  stopTTS();
  // 서버 없는 판(휴대폰): 미리 만들어 둔 원어민 소리가 있으면 그것, 없으면 휴대폰 목소리
  const src = window.BGM_TTSURL ? window.BGM_TTSURL(voice, rate, text) : `/api/tts?voice=${encodeURIComponent(voice)}&rate=${encodeURIComponent(rate)}&text=${encodeURIComponent(text)}`;
  if (!src) return fallbackSay(text, onEnd, withLips, spd);
  const a = new Audio(src);
  a.playbackRate = spd; a.preservesPitch = true;
  ttsAudio = a;
  if (withLips) {
    try {
      actx ||= new (window.AudioContext || window.webkitAudioContext)();
      const src = actx.createMediaElementSource(a); analyser = actx.createAnalyser(); analyser.fftSize = 512;
      src.connect(analyser); analyser.connect(actx.destination); actx.resume();
    } catch { analyser = null; }
  }
  a.onplay = () => { $("#avatar")?.classList.toggle("talk", !!withLips); if (withLips) analyser ? lipSync() : talkAnim(true); };
  a.onended = () => { cancelAnimationFrame(lipRAF); talkAnim(false); ttsAudio = null; onEnd?.(); };
  a.onerror = () => { ttsAudio = null; fallbackSay(text, onEnd, withLips, spd); };
  a.play().catch(() => fallbackSay(text, onEnd, withLips, spd));
}
function fallbackSay(text, onEnd, withLips, spd = 1) {
  speechSynthesis.cancel();
  const t = tutor(), u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US"; u.voice = pickVoice(t) || null; u.rate = 1.05 * spd; u.pitch = t.pitch;
  u.onstart = () => withLips && talkAnim(true);
  u.onend = u.onerror = () => { talkAnim(false); onEnd?.(); };
  speechSynthesis.speak(u);
}
/* 튜터 말 빠르기: 1x → 1.25x → 1.5x (실제 원어민은 더 빠름) · 소리 높이는 그대로 */
let talkSpd = +localStorage.getItem("bgm2_spd") || 1;
const SPDS = [1, 1.25, 1.5];
function drawSpd() { const b = $("#chSpd"); if (b) { b.textContent = talkSpd + "x"; b.classList.toggle("on", talkSpd > 1); } }
$("#chSpd").onclick = () => { talkSpd = SPDS[(SPDS.indexOf(talkSpd) + 1) % SPDS.length]; localStorage.setItem("bgm2_spd", talkSpd); drawSpd(); toast(talkSpd === 1 ? "보통 빠르기" : `${talkSpd}배 빠르게`); };
drawSpd();
function tutorSay(text, onEnd) { playTTS(text, tutor().tts, "+5%", onEnd, true, talkSpd); }

/* 낱말 비교: 내 말에서 틀린 곳(빨강) · 고친 말에서 바뀐 곳(초록) */
function diffWords(a, b) {
  const A = a.split(/\s+/).filter(Boolean), B = b.split(/\s+/).filter(Boolean);
  const n = (w) => w.toLowerCase().replace(/[^a-z0-9']/g, "");
  const dp = Array.from({ length: A.length + 1 }, () => Array(B.length + 1).fill(0));
  for (let i = A.length - 1; i >= 0; i--) for (let j = B.length - 1; j >= 0; j--)
    dp[i][j] = n(A[i]) === n(B[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const keepA = new Set(), keepB = new Set(); let i = 0, j = 0;
  while (i < A.length && j < B.length) { if (n(A[i]) === n(B[j])) { keepA.add(i); keepB.add(j); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++; }
  const mark = (W, keep, cls) => { let out = [], run = []; W.forEach((w, k) => { if (keep.has(k)) { if (run.length) { out.push(`<span class="${cls}">${esc(run.join(" "))}</span>`); run = []; } out.push(esc(w)); } else run.push(w); }); if (run.length) out.push(`<span class="${cls}">${esc(run.join(" "))}</span>`); return out.join(" "); };
  return { a: mark(A, keepA, "bad"), b: mark(B, keepB, "good") };
}

/* 화면 그리기 */
function addMsg(who, text, ko) {
  const el = document.createElement("div");
  el.className = `msgb ${who}`;
  el.innerHTML = who === "t" ? `<button class="say">🔊</button>${esc(text)}${ko ? `<div class="ko">${esc(ko)}</div>` : ""}` : esc(text);
  if (who === "t") $(".say", el).onclick = () => tutorSay(text);
  $("#chLog").appendChild(el); el.scrollIntoView({ block: "end", behavior: "smooth" });
  return el;
}
function addBox(cls, html) { const el = document.createElement("div"); el.className = cls; el.innerHTML = html; $("#chLog").appendChild(el); el.scrollIntoView({ block: "end", behavior: "smooth" }); return el; }
function callCap(parts) { $("#callCap").innerHTML = parts.join(""); }
function status(s) { $("#chStatus").textContent = s || ""; }
function keepLine(en, ko) { if (en && !chat.saved.some((x) => x.en === en)) chat.saved.push({ en, ko }); }
function saveChatLine(en, ko, btn) {
  if (store.items.some((x) => x.text.toLowerCase() === en.toLowerCase())) { toast("이미 담았어요"); return; }
  addItem({ text: cleanSurface(en), mean: ko || "", lv: 1, sentence: en, ko: ko || "", vid: null, title: `AI 회화 · ${chat.sc.title}`, s: 0, e: 0 });
  if (btn) { btn.textContent = "담음 ✓"; btn.disabled = true; }
}
function showFix(userText, better, why) {
  const norm = (x) => String(x || "").toLowerCase().replace(/[^a-z0-9' ]/g, "").replace(/\s+/g, " ").trim();
  if (norm(userText) === norm(better)) return ""; // 고칠 게 없으면 «Do you mean» 안 띄움
  const d = diffWords(userText, better);
  chat.fixes++;
  const box = addBox("fixcard", `<div>${d.a}</div><div class="h">✅ 더 나은 표현</div><div>${d.b}</div>${why ? `<div class="why">💡 ${esc(why)}</div>` : ""}<button>＋ 내 표현에 담기</button>`);
  $("button", box).onclick = (e) => saveChatLine(better, why, e.target);
  keepLine(better, why);
  return `<div class="cc fixc">Do you mean “${d.b}”?</div>`;
}

async function openChat(id) {
  const sc = SCN.find((s) => s.id === id) || SCN[0];
  stopRec(); stopTTS();
  chat = { sc, hist: [], mode: aiState ? "script" : "ai", step: 0, hint: null, saved: [], fixes: 0, said: 0, busy: false, hands: !!SR, started: Date.now() };
  const t = tutor();
  $("#chTitle").textContent = `${t.name} ${t.flag} · ${sc.title}`;
  $("#chMission").className = "mission"; $("#chMission").textContent = `🎯 미션: ${sc.mission}`;
  $("#avatar").innerHTML = tutorArt(t, true);
  const can = $("#avatar .tcan"); if (can && window.TalkPic) window.TalkPic.mount(can, can.dataset.key);
  if (artStyle === "3d") { const el = $("#avatar .t3d"); (window.VRM3D ? window.VRM3D.mount(el, el.dataset.vrm) : Promise.reject()).catch(() => { $("#avatar").innerHTML = `<div class="tart"><img src="img/tutors/${t.id}_manga.jpg"></div>`; }); }
  $("#chLog").innerHTML = ""; $("#chIn").value = ""; callCap([]);
  $("#chat").classList.add("call"); $("#chView").textContent = "💬 채팅";
  if (aiState) addBox("hintb", `⚠️ ${esc(aiState)} · 지금은 연습 대본으로 대화해요`);
  // 튜터 대사 목소리를 미리 만들어 둠 (첫 문장 3초 기다림 없애기)
  sc.script.forEach(([line]) => fetch(`/api/tts?voice=${encodeURIComponent(t.tts)}&rate=${encodeURIComponent("+5%")}&text=${encodeURIComponent(line)}`).catch(() => {}));
  markStudy();
  await teacherTurn();
}
async function teacherTurn(lastUser) {
  let r;
  if (chat.mode === "ai") {
    chat.busy = true; status("🤔 생각 중…");
    try {
      r = await (await fetch("/api/teacher", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tutor: tutor().name, role: chat.sc.role, mission: chat.sc.mission, history: chat.hist.map(({ who, text }) => ({ who, text })) }) })).json();
    } catch { r = { error: "서버에 연결이 안 돼요" }; }
    chat.busy = false; status("");
    if (r.error) {
      aiState = r.error; chat.mode = "script";
      addBox("hintb", `⚠️ ${esc(r.error)} · 지금은 <b>연습 대본</b>으로 이어 가요`);
      if (lastUser) chat.step = Math.min(chat.step, chat.sc.script.length - 1);
      return lastUser ? scriptJudge(lastUser) : teacherTurn();
    }
  } else {
    const S = chat.sc.script;
    if (chat.step >= S.length) return endChat();
    const [t, tko, ans, ansKo] = S[chat.step];
    r = { reply: t, reply_ko: tko, hint: ans, hint_ko: ansKo };
  }
  let fixHtml = "";
  if (r.better && lastUser) fixHtml = showFix(lastUser, r.better, r.better_ko);
  chat.hist.push({ who: "t", text: r.reply, ko: r.reply_ko });
  addMsg("t", r.reply, r.reply_ko);
  callCap([lastUser ? `<div class="cc u">${esc(lastUser)}</div>` : "", fixHtml, `<div class="cc t">${esc(r.reply)}<div class="ko">${esc(r.reply_ko || "")}</div></div>`]);
  chat.hint = r.hint ? { en: r.hint, ko: r.hint_ko } : null;
  const done = r.done || (chat.mode === "script" && chat.step >= chat.sc.script.length);
  tutorSay(r.reply, () => { if (done) endChat(); else if (chat.hands && cur === "chat") startListen(); });
}
/* 연습 대본: 내 대답 채점 → 다음 줄 */
function scriptJudge(text) {
  const [, , ans, ansKo, keys] = chat.sc.script[chat.step];
  const low = toks(text).join(" ");
  const ok = keys.every((k) => low.includes(k.toLowerCase()));
  chat.step++;
  if (!ok) { chat.fixHtmlPending = showFix(text, ans, ansKo); }
  else { addBox("hintb", "👍 좋아요!"); keepLine(ans, ansKo); }
  setTimeout(() => teacherTurn(text), 500);
}
async function userSays(text) {
  text = (text || "").trim();
  if (!text || chat.busy) return;
  stopRec(); stopTTS();
  $("#chIn").value = "";
  chat.hist.push({ who: "u", text }); chat.said++;
  addMsg("u", text);
  callCap([`<div class="cc u">${esc(text)}</div>`]);
  if (chat.mode === "script") {
    // 대본 모드: 고쳐 주기 카드는 scriptJudge 가, 말풍선은 다음 턴이 그림
    const [, , ans, ansKo, keys] = chat.sc.script[chat.step];
    const ok = keys.every((k) => toks(text).join(" ").includes(k.toLowerCase()));
    chat.step++;
    let fix = "";
    if (!ok) fix = showFix(text, ans, ansKo); else { addBox("hintb", "👍 좋아요!"); keepLine(ans, ansKo); }
    setTimeout(async () => {
      const S = chat.sc.script;
      if (chat.step >= S.length) { callCap([`<div class="cc u">${esc(text)}</div>`, fix]); return endChat(); }
      const [t, tko, a2, a2ko] = S[chat.step];
      chat.hist.push({ who: "t", text: t, ko: tko }); addMsg("t", t, tko);
      callCap([`<div class="cc u">${esc(text)}</div>`, fix, `<div class="cc t">${esc(t)}<div class="ko">${esc(tko)}</div></div>`]);
      chat.hint = { en: a2, ko: a2ko };
      tutorSay(t, () => { if (chat.hands && cur === "chat") startListen(); });
    }, ok ? 400 : 1200);
    return;
  }
  await teacherTurn(text);
}
/* 손 안 대는 듣기: 튜터 말이 끝나면 자동으로 듣고, 말이 멈추면 보냄 */
function startListen() {
  if (!SR || rec || !chat) return;
  const ok = listen((heard) => { $("#chMic").classList.remove("rec"); status(""); if (heard) userSays(heard); else status("🎙 버튼을 누르고 말해요"); },
    (p) => { $("#chIn").value = p; callCap([`<div class="cc u">${esc(p)}…</div>`]); });
  if (ok) { $("#chMic").classList.add("rec"); status("🎙 듣고 있어요 — 말하세요"); }
}
function endChat() {
  stopRec(); status("");
  const mins = Math.max(1, Math.round((Date.now() - chat.started) / 60000));
  const box = addBox("endc", `<h4>🎉 수고했어요! 오늘 대화 정리</h4>
    <div class="report"><div><b>${chat.said}</b><small>내가 한 말</small></div><div><b>${chat.fixes}</b><small>고친 표현</small></div><div><b>${mins}분</b><small>대화 시간</small></div></div>
    <div class="msg" style="margin:0 0 6px">담아 두면 복습에 나와요</div>
    ${chat.saved.map((x, i) => `<div class="ln2"><div>${esc(x.en)}<small>${esc(x.ko || "")}</small></div><button data-k="${i}">＋ 담기</button></div>`).join("")}
    <div style="display:flex;gap:8px;justify-content:center;margin-top:10px"><button class="btn ghost" id="chAgain">다시 하기</button><button class="btn" data-go="talk">다른 연습</button></div>`);
  $$("[data-k]", box).forEach((b) => (b.onclick = () => { const x = chat.saved[+b.dataset.k]; saveChatLine(x.en, x.ko, b); }));
  $("#chAgain", box).onclick = () => openChat(chat.sc.id);
  $("#chat").classList.remove("call"); $("#chView").textContent = "📞 통화";
  box.scrollIntoView({ block: "start" });
}
$("#chSend").onclick = () => userSays($("#chIn").value);
$("#chIn").addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.isComposing) userSays($("#chIn").value); });
$("#chHint").onclick = () => {
  if (!chat?.hint) return toast("튜터 말을 먼저 들어 봐요");
  addBox("hintb", `💡 ${esc(chat.hint.en)}<div class="ko">${esc(chat.hint.ko || "")}</div>`).onclick = () => speak(chat.hint.en, 0.85);
  callCap([...$$("#callCap .cc").map((x) => x.outerHTML), `<div class="cc fixc">💡 ${esc(chat.hint.en)}<div class="ko" style="font-size:12.5px;color:var(--sub)">${esc(chat.hint.ko || "")}</div></div>`]);
};
$("#chKo").onclick = () => { const off = $("#chat").classList.toggle("noko"); $("#chKo").classList.toggle("on", !off); };
$("#chView").onclick = () => { const call = $("#chat").classList.toggle("call"); $("#chView").textContent = call ? "💬 채팅" : "📞 통화"; };
$("#chMic").onclick = () => {
  if (rec) { rec.stop(); return; }
  stopTTS();
  if (!SR) return toast("이 브라우저는 말 알아듣기를 못 해요 · 글로 써 주세요");
  chat.hands = true; startListen();
};
let camStream = null;
$("#chCam").onclick = async () => {
  const v = $("#selfCam");
  if (camStream) { camStream.getTracks().forEach((t) => t.stop()); camStream = null; v.classList.add("hidden"); return; }
  try { camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } }); v.srcObject = camStream; v.classList.remove("hidden"); }
  catch { toast("카메라를 쓸 수 없어요"); }
};
function leaveChat() { stopRec(); stopTTS(); window.VRM3D?.stop(); window.TalkPic?.stop(); if (camStream) { camStream.getTracks().forEach((t) => t.stop()); camStream = null; $("#selfCam").classList.add("hidden"); } if (chat) chat.hands = false; }

/* ================= 시작 ================= */
go("home");
