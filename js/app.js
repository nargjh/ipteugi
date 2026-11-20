import { COURSES } from "../data/sentences.js?v=4";
import { KEYS } from "../data/keys.js?v=4";
import { TIPS } from "../data/tips.js?v=4";
import { L_COURSES, L_BY_ID } from "../data/listening.js?v=4";
import { L_SOUNDS } from "../data/listen-sounds.js?v=4";
import * as store from "./store.js?v=4";
import { buildSession, buildExtra, record, dueReviews, courseStats, getSentence, week } from "./srs.js?v=4";
import { grade, chips, normalize } from "./grade.js?v=4";
import { buildListenSession, recordListen, listenCourseStats, listenState } from "./listen.js?v=4";
import { mascot, coach } from "./mascot.js?v=4";
import * as sp from "./speech.js?v=4";

export const VERSION = 4;
const app = document.getElementById("app");

// ── 작은 도구 ───────────────────────────
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = (sel) => app.querySelector(sel);
const $$ = (sel) => [...app.querySelectorAll(sel)];
const on = (sel, fn, ev = "click") => { const el = typeof sel === "string" ? $(sel) : sel; el?.addEventListener(ev, fn); };
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
function toast(msg, ms = 2200) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), ms);
}
const svg = (p, fill = false) => `<svg viewBox="0 0 24 24" ${fill ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'} aria-hidden="true">${p}</svg>`;
const I = {
  mic: svg('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>'),
  stop: svg('<rect x="7" y="7" width="10" height="10" rx="2"/>', true),
  speaker: svg('<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>'),
  slow: svg('<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 12h4"/>'),
  play: svg('<path d="M8 5v14l11-7z"/>', true),
  back: svg('<path d="M15 18l-6-6 6-6"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>'),
  flame: svg('<path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-6 1-9.5z"/>', true),
  trophy: svg('<path d="M7 4h10v4a5 5 0 0 1-10 0V4z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M10 14h4v3h-4zM8 21h8"/>'),
  star: svg('<path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z"/>', true),
  bulb: svg('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>'),
  hand: svg('<path d="M7 11V6a1.5 1.5 0 0 1 3 0v4M10 10V4.5a1.5 1.5 0 0 1 3 0V10M13 10V5.5a1.5 1.5 0 0 1 3 0V12M16 9.5a1.5 1.5 0 0 1 3 0V15a7 7 0 0 1-12.6 4.2L4 15.8a1.6 1.6 0 0 1 2.5-2l.5.6"/>'),
  wave: svg('<path d="M3 12h2M7 8v8M11 5v14M15 8v8M19 11v2"/>'),
  ear: svg('<path d="M6 9a6 6 0 1 1 12 0c0 4-4 5-4 9a3 3 0 0 1-5 2"/><path d="M9 9a3 3 0 0 1 6 0"/>'),
};
const waveIc = () => I.wave.replace("<svg", '<svg class="wave-ic"');
const stars = (n, big = false) => `<span class="stars ${big ? "big" : ""}" aria-label="별 ${n}개">${[1, 2, 3].map(k => I.star.replace("<svg", `<svg class="${k <= n ? "on" : ""}"`)).join("")}</span>`;
const verdictStars = (v, mode) => v === "exact" ? 3 : v === "close" ? 2 : mode === "giveup" ? 0 : 1;
const markPhrase = (text, phrase) => {
  const t = esc(text); if (!phrase) return t;
  const p = esc(phrase), i = t.indexOf(p);
  return i < 0 ? t : t.slice(0, i) + `<mark>${p}</mark>` + t.slice(i + p.length);
};
const keyOf = (s) => KEYS[s.id] || null;
const tipOf = (s) => {
  const t = TIPS[s.id]; if (!t) return null;
  const short = t[0] && normalize(t[0]).join(" ") !== normalize(s.en).join(" ") ? t[0] : "";
  return { short, shortSound: short ? t[1] : "", sound: t[2] };
};
// 짧은 말도 정답으로
const withShort = (s) => { const t = tipOf(s); return t?.short ? { ...s, alt: [...(s.alt || []), t.short] } : s; };
function keyWordIdx(en, keyEn) {
  if (!keyEn) return new Set();
  const clean = (w) => w.toLowerCase().replace(/[^a-z0-9'’-]/g, "");
  const ws = en.split(/\s+/).map(clean), kw = keyEn.split(/\s+/).map(clean);
  for (let i = 0; i + kw.length <= ws.length; i++)
    if (kw.every((k, j) => ws[i + j] === k)) return new Set(kw.map((_, j) => i + j));
  return new Set();
}
function totalXp(pid = store.get().activeProfile) {
  return Object.values(store.get().progress[pid]?.days || {}).reduce((a, d) => a + (d.xp || 0), 0);
}
const level = (xp) => ({ lv: Math.floor(xp / 100) + 1, p: xp % 100 });
const graduatedCount = () => Object.values(store.progress().reviews).filter(r => r.state === "graduated").length;

// ── 화면 상태 ───────────────────────────
let session = null, current = null, lsession = null, stopFn = null, recTimer = null;
let homeTab = "speak";

function stopAll() { if (stopFn) { sp.stopListening(); stopFn = null; } sp.stopSpeaking(); clearInterval(recTimer); }
function go(screen, ...args) { stopAll(); window.scrollTo(0, 0); SCREENS[screen](...args); }

// 마이크 한 벌
function micControl({ btn, label, out, onDone }) {
  let listening = false, t0 = 0, heard = false;
  const idleLabel = label.innerHTML;
  const draw = () => {
    const s = Math.floor((Date.now() - t0) / 1000);
    label.innerHTML = `<span class="rec"><span class="dot"></span>듣는 중 0:${String(s).padStart(2, "0")} <span class="wave ${heard ? "" : "quiet"}"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span></span>`;
  };
  const set = (v) => {
    listening = v; btn.classList.toggle("on", v); btn.setAttribute("aria-pressed", String(v));
    btn.innerHTML = v ? I.stop : I.mic; btn.setAttribute("aria-label", v ? "말하기 멈추기" : "말하기 시작");
    clearInterval(recTimer);
    if (v) { t0 = Date.now(); heard = false; draw(); recTimer = setInterval(draw, 1000); } else label.innerHTML = idleLabel;
  };
  on(btn, () => {
    if (listening) { stopFn?.(); return; }
    sp.stopSpeaking(); set(true);
    out.innerHTML = `${waveIc()}<span class="placeholder">듣고 있어요… 영어로 말해 보세요</span>`;
    stopFn = sp.listen({
      record: true,
      onState: (st) => { if (st === "speech") { heard = true; draw(); } },
      onText: (fin, interim) => { heard = true; out.innerHTML = `${waveIc()}<span>${esc(fin)} <span class="interim">${esc(interim)}</span></span>`; },
      onError: (code) => {
        set(false); stopFn = null;
        if (code === "not-allowed" || code === "service-not-allowed") toast("마이크가 막혀 있어요. 브라우저 설정에서 마이크를 허용해 주세요.", 4000);
        else if (code === "network") toast("인터넷이 필요해요. 지금은 낱말 블록으로 해 보세요.", 3500);
        else toast("마이크를 못 켰어요. 다시 눌러 보세요.");
      },
      onEnd: (text) => {
        set(false); stopFn = null;
        if (!text.trim()) {
          out.innerHTML = `${waveIc()}<span class="placeholder">${sp.lastError === "no-speech" ? "소리가 안 들어왔어요. 폰 아래쪽 마이크에 대고 또박또박 말해 보세요." : "아무 말도 못 들었어요. «듣는 중»이 뜬 뒤에 말해 보세요."}</span>`;
          return;
        }
        onDone(text);
      },
    });
  });
}

// ── 사람 고르기 ─────────────────────────
function pickProfile() {
  const st = store.get();
  app.innerHTML = `
  <section class="screen">
    <div class="grow"></div>
    <div class="center" style="display:grid;justify-items:center;gap:6px">
      ${mascot("cheer", 120)}
      <div class="display">입트기</div>
      <p class="muted" style="margin:0">한국어를 보고, 영어로 소리 내어 말해요.<br>여행·생활에서 바로 쓰는 말만.</p>
    </div>
    <h2 class="center">누가 공부해요?</h2>
    <div class="who">${Object.entries(st.profiles).map(([id, p]) => `<button data-id="${id}">${esc(p.name)}<span class="xs muted">Lv.${level(totalXp(id)).lv}</span></button>`).join("")}</div>
    <div class="grow"></div>
  </section>`;
  $$(".who button").forEach(b => on(b, () => { store.setProfile(b.dataset.id); go("home"); }));
}

// ── 홈 ──────────────────────────────────
function home() {
  const st = store.get(), p = store.profile(), pr = store.progress();
  const d = store.dayLog(), goal = p.dailyGoal, done = Math.min(d.done, goal);
  const due = dueReviews(), goalDone = d.done >= goal;
  const streak = store.streak(), xp = totalXp(), L = level(xp);
  const other = Object.keys(st.profiles).find(id => id !== st.activeProfile);
  const todayIds = Object.entries(pr.reviews).filter(([, v]) => v.lastAt === store.today()).map(([id]) => id);
  const warn = [];
  if (sp.inAppBrowser) warn.push(`<div class="notice err">카카오톡·인스타 안에서 열면 마이크가 막혀요. 오른쪽 위 메뉴에서 <b>다른 브라우저로 열기</b>를 눌러 주세요.</div>`);
  else if (!sp.canListen) warn.push(`<div class="notice">이 브라우저는 말 받아쓰기를 못 해요. 안드로이드는 <b>크롬</b>, 아이폰은 <b>사파리</b>로 열어 주세요.</div>`);

  const course = COURSES.find(c => c.id === pr.currentCourse), cs = courseStats(course.id);
  const ls = listenState();
  const speakTab = `
    <button class="course current" id="course">
      <span class="num">${COURSES.indexOf(course) + 1}</span>
      <span class="grow"><span class="t">${esc(course.group)} · ${esc(course.title)}</span>
        <span class="s">${cs.seen}/${cs.total}문장 봄 · ${cs.graduated} 졸업</span>
        <span class="bar"><i style="width:${(cs.seen / cs.total) * 100}%"></i></span></span>
      <span class="small muted">코스 ›</span>
    </button>
    <div class="tiles">
      <button class="tile" id="todayList"><span class="ic">📒</span><b>오늘 한 문장</b><span>${todayIds.length ? `${todayIds.length}문장 다시 보기·연습` : "오늘 공부하면 여기 모여요"}</span></button>
      <button class="tile" id="drill"><span class="ic">🔁</span><b>따라 말하기 특훈</b><span>들리는 대로 바로 따라 말하기</span></button>
      <button class="tile" id="notes"><span class="ic">✏️</span><b>내 노트</b><span>꼭 하고 싶은 말 · ${pr.notes.length}개</span></button>
      <button class="tile" id="allCourses"><span class="ic">🗺️</span><b>코스 지도</b><span>여행 ${COURSES.filter(c => c.group === "여행").length} · 생활 ${COURSES.filter(c => c.group === "생활").length}코스</span></button>
    </div>`;
  const listenTab = `
    <div class="card tight" style="display:flex;gap:12px;align-items:center">
      ${mascot("listen", 60)}
      <div class="grow"><b>원어민이 나한테 하는 말</b><p class="small muted" style="margin:2px 0 0">공항·식당·가게에서 실제로 듣는 말을 보통 빠르기로. 연음 소리도 한글로 보여 줘요. 오늘 ${d.listened || 0}개 들었어요.</p></div>
    </div>
    <button class="btn primary lg block" id="lstart">${I.ear} 듣기 6문장 시작</button>
    <div class="section-title">상황 고르기</div>
    <div class="list">${L_COURSES.map(c => { const s = listenCourseStats(c.id); return `
      <button class="course ${c.id === ls.current ? "current" : ""} ${s.ok === s.total ? "done" : ""}" data-lc="${c.id}">
        <span class="num">${s.ok === s.total ? "✓" : "🎧"}</span>
        <span class="grow"><span class="t">${esc(c.title)}</span><span class="s">${s.seen}/${s.total} 들음 · ${s.ok} 알아들음</span>
        <span class="bar"><i style="width:${(s.seen / s.total) * 100}%"></i></span></span>
      </button>`; }).join("")}</div>`;

  app.innerHTML = `
  <section class="screen">
    <div class="topbar">
      <button class="pill" id="who" aria-label="사람 바꾸기">${esc(p.name)} ▾</button>
      <div class="row" style="gap:10px">
        <span class="stat flame ${streak ? "" : "off"}" title="연속 공부">${I.flame}${streak}</span>
        <span class="stat trophy" title="졸업한 문장">${I.trophy}<span>${graduatedCount()}</span></span>
        <span class="lv" style="--p:${L.p}" title="경험치 ${xp}"><b>Lv<small>${L.lv}</small></b></span>
        <button class="icon-btn" id="settings" aria-label="설정">${I.gear}</button>
      </div>
    </div>
    ${warn.join("")}
    <div class="hero">
      <h2>${goalDone ? "오늘 목표 달성! 🎉" : `${esc(p.name)}, 오늘도<br>입 트여 볼까요?`}</h2>
      <p class="sub">${goalDone ? `오늘 ${d.done}문장 말했어요` : `복습 ${Math.min(due.length, goal - done)} · 새 문장 ${Math.max(goal - done - Math.min(due.length, goal - done), 0)}`}</p>
      <div class="meter"><i style="width:${(done / goal) * 100}%"></i></div>
      <div class="count">${done} / ${goal}문장</div>
      <button class="btn" id="start">${goalDone ? "5문장 더 말하기" : d.done ? "이어서 말하기" : "오늘의 말하기 시작"}</button>
      ${mascot(goalDone ? "cheer" : "happy", 100)}
    </div>
    <div class="tabs" role="tablist">
      <button role="tab" aria-selected="${homeTab === "speak"}" data-tab="speak">🗣️ 말하기</button>
      <button role="tab" aria-selected="${homeTab === "listen"}" data-tab="listen">🎧 듣기</button>
    </div>
    ${homeTab === "speak" ? speakTab : listenTab}
    <div class="card tight">
      <div class="row between" style="margin-bottom:10px"><b>이번 주</b><span class="xs muted">하루 말한 문장</span></div>
      ${weekHtml()}
      ${other ? `<p class="xs muted" style="margin:10px 0 0">${esc(st.profiles[other].name)} 기록은 같은 폰에서 공부했을 때만 보여요.</p>` : ""}
    </div>
    <p class="xs muted center" style="margin:0">판 ${VERSION}</p>
  </section>`;

  on("#who", () => go("pickProfile"));
  on("#settings", () => go("settings"));
  $$(".tabs button").forEach(b => on(b, () => { homeTab = b.dataset.tab; go("home"); }));
  on("#start", () => {
    session = goalDone ? buildExtra(5) : buildSession();
    if (!session.queue.length) { toast("모든 문장을 다 봤어요! 복습이 생기면 다시 나와요."); return; }
    nextSentence();
  });
  on("#course", () => go("courses")); on("#allCourses", () => go("courses"));
  on("#todayList", () => go("todayList")); on("#drill", () => go("drill")); on("#notes", () => go("notes"));
  on("#lstart", () => startListen());
  $$("[data-lc]").forEach(b => on(b, () => { listenState().current = b.dataset.lc; store.save(); startListen(); }));
}

function weekHtml() {
  const st = store.get(), days = ["일", "월", "화", "수", "목", "금", "토"];
  const rows = Object.entries(st.profiles).map(([id, p]) => {
    const w = week(st.progress[id]); const max = Math.max(5, ...w.map(x => x.done));
    return `<span class="name">${esc(p.name)}</span>` + w.map(x => `<span class="b" title="${x.date} ${x.done}문장"><i class="${x.done ? "" : "zero"}" style="height:${x.done ? Math.max(12, (x.done / max) * 100) : 8}%"></i></span>`).join("");
  }).join("");
  const labels = `<span></span>` + week(st.progress[st.activeProfile]).map(x => { const [y, m, d] = x.date.split("-").map(Number); return `<span class="d">${days[new Date(y, m - 1, d).getDay()]}</span>`; }).join("");
  return `<div class="week">${rows}${labels}</div>`;
}

// ── 말하기 흐름 ─────────────────────────
function nextSentence() {
  sp.clearMyVoice();
  if (session.index < session.queue.length) {
    const s = getSentence(session.queue[session.index]);
    if (!s) { session.index++; return nextSentence(); }
    current = { s, retried: false, isReview: !session.practice && !!store.progress().reviews[s.id] };
    return go("speak");
  }
  if (session.retry.length) { current = { s: getSentence(session.retry.shift()), retried: true }; return go("speak"); }
  go("done");
}

function progressHeader() {
  const total = session.queue.length;
  const wins = Object.values(session.results).filter(v => v === "exact").length;
  return `
  <div class="topbar">
    <button class="icon-btn" id="quit" aria-label="그만하기">${I.close}</button>
    <div class="grow" style="padding:0 6px"><div class="bar"><i style="width:${(Math.min(session.index, total) / Math.max(total, 1)) * 100}%"></i></div></div>
    <span class="stat trophy" title="정확히 말한 문장">${I.trophy}<span>${wins}/${total}</span></span>
  </div>`;
}
const bindQuit = () => on("#quit", () => go(session?.practice ? "todayList" : "home"));

function tilesHtml(s, hint) {
  const words = s.en.split(/\s+/);
  const keys = keyWordIdx(s.en, keyOf(s)?.[1]);
  return `<div class="tiles-row" aria-hidden="true">${words.map((w, i) => {
    const core = w.replace(/[^A-Za-z0-9'’-]/g, "");
    const punct = w.replace(/[A-Za-z0-9'’-]/g, "");
    const show = !core ? "" : hint >= 2 ? core : hint >= 1 ? core[0] + "·".repeat(Math.max(core.length - 1, 0)) : "";
    return `<span class="tile-w ${keys.has(i) ? "key" : ""} ${show ? "shown" : ""}">${esc(show || " ")}</span>${punct ? `<span class="muted" style="align-self:flex-end;font-weight:800">${esc(punct)}</span>` : ""}`;
  }).join("")}</div>`;
}

// ── 말하기 ──────────────────────────────
function speak() {
  const s = current.s, key = keyOf(s);
  current.hint = current.hint || 0;
  const tagLabel = session.practice ? "다시 연습" : current.retried ? "한 번 더" : current.isReview ? "복습" : "새 문장";
  app.innerHTML = `
  <section class="screen">
    ${progressHeader()}
    <div class="card">
      <div class="row between"><span class="tag ${current.isReview || current.retried ? "review" : ""}">${tagLabel}</span><span class="tag plain">${esc(s.group)} · ${esc(s.when)}</span></div>
      <p class="ko">${markPhrase(s.ko, key?.[0])}</p>
      <div id="tiles">${tilesHtml(s, current.hint)}</div>
      <div class="card-foot"><span>영어로 말해 봐요</span><span>${s.en.split(/\s+/).length}낱말</span></div>
    </div>
    <div class="said" id="said" aria-live="polite">${waveIc()}<span class="placeholder">${sp.canListen ? "가운데 마이크를 누르고 말해요" : "말 받아쓰기가 안 되는 브라우저예요. 낱말 블록으로 해 보세요."}</span></div>
    <div class="grow"></div>
    <div class="dock">
      <button class="giveup" id="giveup">모르겠어요</button>
      <div class="dock-row">
        <button class="side-btn" id="hintBtn">${I.bulb}<span id="hintTxt">${current.hint >= 2 ? "힌트 다 봄" : current.hint ? "힌트 더 보기" : "힌트 보기"}</span></button>
        <button class="mic" id="mic" aria-pressed="false" aria-label="말하기 시작" ${sp.canListen && !sp.inAppBrowser ? "" : "disabled"}>${I.mic}</button>
        <button class="side-btn" id="blocks">${I.hand}지금은<br>말할 수 없어요</button>
      </div>
      <div class="mic-label" id="micLabel">말해 보기</div>
      <div class="hint-line">문장 전체를 말하고 정지를 눌러요</div>
    </div>
  </section>`;
  bindQuit();
  micControl({ btn: $("#mic"), label: $("#micLabel"), out: $("#said"), onDone: (text) => finish(text, "voice") });
  on("#hintBtn", () => {
    if (current.hint >= 2) return;
    current.hint++; current.hinted = true;
    $("#tiles").innerHTML = tilesHtml(s, current.hint);
    $("#hintTxt").textContent = current.hint >= 2 ? "힌트 다 봄" : "힌트 더 보기";
  });
  on("#blocks", () => go("blocks"));
  on("#giveup", () => finish("", "giveup"));
}

function finish(said, mode) {
  let res = grade(said, withShort(current.s));
  if (mode === "giveup") res = { ...grade(current.s.en, current.s), verdict: "wrong" }; // 대표 정답을 보여 줌
  if (mode === "blocks") res = { ...res, verdict: res.verdict === "exact" ? "close" : "wrong" };
  if (current.hinted && res.verdict === "exact") res.verdict = "close";
  current.said = said; current.res = res; current.mode = mode;
  commit(res.verdict);
  go("result");
}

function commit(verdict) {
  current.verdict = verdict;
  if (current.retried || session.practice) { session.results[current.s.id] = verdict; return; }
  const pr = store.progress(), d = store.dayLog();
  if (current.snap) {
    if (current.snap.review) pr.reviews[current.s.id] = structuredClone(current.snap.review); else delete pr.reviews[current.s.id];
    Object.assign(d, current.snap.day);
  } else {
    current.snap = { review: pr.reviews[current.s.id] ? structuredClone(pr.reviews[current.s.id]) : null, day: { ...d } };
  }
  record(current.s.id, verdict);
  session.results[current.s.id] = verdict;
  const i = session.retry.indexOf(current.s.id);
  if (verdict === "wrong" && i < 0) session.retry.push(current.s.id);
  if (verdict !== "wrong" && i >= 0) session.retry.splice(i, 1);
}

// 캐릭터 코칭 말
function coachFor() {
  const { s, res, mode, verdict } = current;
  const key = keyOf(s), tip = tipOf(s);
  const clean = (w) => w.replace(/[^A-Za-z0-9'’-]/g, "");
  const missing = res.targetMarks.filter(m => !m.ok).map(m => clean(m.w)).filter(Boolean);
  const extra = res.saidMarks.filter(m => !m.ok).map(m => m.w);
  const keyWords = key ? key[1].toLowerCase().split(/\s+/) : [];
  const keyMissing = key && res.isMain && missing.some(w => keyWords.includes(w.toLowerCase()));
  if (verdict === "exact") {
    if (!res.isMain && tip?.short && normalize(res.target).join(" ") === normalize(tip.short).join(" "))
      return coach("cheer", "짧게 잘 말했어요!", "현지에선 이렇게 짧게들 말해요. 긴 문장도 들어 봐요", "good");
    return coach("cheer", pick(["완벽해요!", "원어민 같아요!", "입이 트였네요!", "와, 그대로예요!"]), session.practice ? "입에 착 붙었어요" : current.isReview ? "기억이 단단해졌어요" : "이 문장은 졸업이에요 🎓", "good");
  }
  if (mode === "giveup") return coach("think", "괜찮아요, 같이 익혀요", "정답을 듣고 세 번 따라 말해 봐요", "bad");
  if (mode === "blocks") return verdict === "close" ? coach("happy", "순서 딱 맞췄어요!", "다음엔 소리 내어 말해 봐요", "mid") : coach("oops", "순서가 조금 달랐어요", "정답을 보고 세 번 따라 말해 봐요", "bad");
  if (current.hinted && verdict === "close" && !missing.length) return coach("happy", "잘했어요! 다음엔 힌트 없이", "힌트를 보면 별은 2개까지예요", "mid");
  if (keyMissing) return coach(verdict === "close" ? "think" : "oops", "핵심 표현이 빠졌어요", `'${esc(key[1])}'을(를) 넣어 다시 말해 봐요`, verdict === "close" ? "mid" : "bad");
  if (missing.length === 1) return coach("think", `'${esc(missing[0])}' 하나만 빠졌어요`, "거의 다 왔어요!", "mid");
  if (!missing.length && extra.length) return coach("think", `'${esc(extra.join(" "))}'은(는) 빼도 돼요`, "정답과 나란히 놓고 봐요", "mid");
  if (verdict === "close") return coach("think", "거의 다 왔어요!", `빠진 말: ${missing.slice(0, 3).map(esc).join(", ")}`, "mid");
  return coach("oops", "조금 달랐어요", "정답을 듣고 세 번 따라 말해 봐요", "bad");
}

// 연음·짧게 상자
function soundBox(s) {
  const t = tipOf(s); if (!t) return "";
  return `<div class="tipbox">
    <div class="tip-row"><span class="tip-k">빨리 말하면</span><span class="tip-v">${esc(t.sound)}</span>
      <button class="chip-btn mini" data-say="${esc(s.en)}" data-rate="1.05" aria-label="빠르게 듣기">${I.speaker}</button></div>
    ${t.short ? `<div class="tip-row"><span class="tip-k">짧게는</span><span class="tip-v"><b>${esc(t.short)}</b><br><span class="muted">${esc(t.shortSound)}</span></span>
      <button class="chip-btn mini" data-say="${esc(t.short)}" data-rate="1" aria-label="짧은 말 듣기">${I.speaker}</button></div>` : ""}
  </div>`;
}
function bindSay() {
  $$("[data-say]").forEach(b => on(b, (e) => { e.stopPropagation(); b.classList.add("playing"); sp.speak(b.dataset.say, +(b.dataset.rate || store.profile().rate)).then(() => b.classList.remove("playing")); }));
}

// ── 채점 ────────────────────────────────
function result() {
  const { s, res, said, mode, verdict } = current;
  const rate = store.profile().rate, key = keyOf(s);
  const keyIdx = keyWordIdx(res.target, res.isMain ? key?.[1] : null);
  const showMine = mode === "voice" || mode === "blocks";
  const enHtml = res.targetMarks.map((m, i) => {
    let w = esc(m.w);
    if (keyIdx.has(i)) w = `<mark>${w}</mark>`;
    return showMine && !m.ok && verdict !== "wrong" ? `<span class="miss">${w}</span>` : w;
  }).join(" ");
  const others = (s.alt || []).filter(a => a !== res.target);
  app.innerHTML = `
  <section class="screen">
    ${progressHeader()}
    ${coachFor()}
    <div class="card">
      ${showMine ? `<div class="box-label"><span>${mode === "blocks" ? "내가 맞춘 문장" : "내 문장"}</span><span class="row">${stars(verdictStars(verdict, mode), true)}${sp.hasMyVoice() ? `<button class="chip-btn mini" id="pMine">${I.mic}내 목소리</button>` : ""}</span></div>
      <div class="mine">${said ? res.saidMarks.map(m => `<span class="${m.ok ? "" : "bad"}">${esc(m.w)}</span>`).join(" ") : `<span class="muted">(없음)</span>`}</div>` : `<div class="box-label"><span>정답을 보고 익혀요</span>${stars(0)}</div>`}
      <div class="answer-box">
        <span class="badge">✓ 정답${res.isMain ? "" : " · 이렇게도 말해요"}</span>
        <div class="play-row" style="justify-content:flex-end;margin-bottom:6px">
          <button class="chip-btn" id="pNormal">${I.speaker}듣기</button><button class="chip-btn" id="pSlow">${I.slow}천천히</button></div>
        <div class="en">${enHtml}</div>
        ${!res.isMain ? `<p class="small muted" style="margin:4px 0 0">대표 정답: ${esc(s.en)}</p>` : ""}
        <p class="small" style="margin:6px 0 0">${markPhrase(s.ko, key?.[0])}</p>
        <div class="chips">
          ${key ? `<span class="chip">핵심 표현 <b>${esc(key[1])}</b> ${esc(key[0])}</span>` : ""}
          <span class="chip">상황 <b>${esc(s.when)}</b></span>
        </div>
        ${soundBox(s)}
        <details class="more" ${verdict === "wrong" ? "open" : ""}>
          <summary>자세히 보기 ▾</summary>
          <dl>
            ${s.tip ? `<dt>문장 구조</dt><dd>${esc(s.tip)}</dd>` : ""}
            ${others.length ? `<dt>이렇게 말해도 맞아요</dt><dd>${others.map(esc).join("<br>")}</dd>` : ""}
          </dl>
        </details>
      </div>
    </div>
    <div class="grow"></div>
    <div class="btn-col sticky-bottom">
      <button class="btn primary lg block" id="next">${verdict === "wrong" && sp.canListen ? "세 번 따라 말하기" : "다음"}</button>
      ${mode === "voice" && verdict !== "exact" ? `<div class="btn-row"><button class="btn ghost" id="again">다시 말해 볼래요</button><button class="btn ghost" id="fix">맞게 말했어요</button></div>` : ""}
    </div>
  </section>`;
  bindQuit(); bindSay();
  const play = (btn, r) => { btn.classList.add("playing"); sp.speak(s.en, r).then(() => btn.classList.remove("playing")); };
  on("#pNormal", (e) => play(e.currentTarget, rate));
  on("#pSlow", (e) => play(e.currentTarget, Math.max(0.55, rate - 0.3)));
  on("#pMine", () => sp.playMyVoice());
  if (verdict !== "exact") sp.speak(s.en, rate);
  on("#next", () => (verdict === "wrong" && sp.canListen) ? go("repeat3") : advance());
  on("#fix", () => { commit("close"); current.res = { ...res, verdict: "close" }; toast("받아쓰기 탓으로 보고 별 2개로 고쳤어요."); go("result"); });
  on("#again", () => go("speak"));
}

function advance() { if (!current.retried) session.index++; nextSentence(); }

// ── 세 번 따라 말하기 ───────────────────
function repeat3() {
  const s = current.s, rate = store.profile().rate;
  let count = 0;
  app.innerHTML = `
  <section class="screen">
    ${progressHeader()}
    ${coach("happy", "정답을 세 번 따라 말해요", "빨리 말하는 소리까지 흉내 내 봐요")}
    <div class="card center">
      <div class="en" id="target">${esc(s.en)}</div>
      <p class="small muted" style="margin:6px 0 0">${esc(s.ko)}</p>
      <div class="play-row" style="justify-content:center;margin-top:12px">
        <button class="chip-btn" id="pNormal">${I.speaker}듣기</button><button class="chip-btn" id="pSlow">${I.slow}천천히</button></div>
      ${soundBox(s)}
    </div>
    <div class="dots" id="dots"><i></i><i></i><i></i></div>
    <div class="said" id="said" aria-live="polite">${waveIc()}<span class="placeholder">듣고 나서 마이크를 눌러 따라 해요</span></div>
    <div class="grow"></div>
    <div class="dock">
      <div class="dock-row"><span></span><button class="mic" id="mic" aria-label="따라 말하기">${I.mic}</button><button class="side-btn" id="skip">건너뛰기</button></div>
      <div class="mic-label" id="micLabel">따라 말하기</div>
    </div>
  </section>`;
  bindQuit(); bindSay();
  on("#pNormal", () => sp.speak(s.en, rate));
  on("#pSlow", () => sp.speak(s.en, Math.max(0.55, rate - 0.3)));
  sp.speak(s.en, rate);
  micControl({ btn: $("#mic"), label: $("#micLabel"), out: $("#said"), onDone: (text) => {
    const g = grade(text, withShort({ ...s, alt: [] }));
    $("#target").innerHTML = g.targetMarks.map(m => `<span class="${m.ok ? "hit" : ""}">${esc(m.w)}</span>`).join(" ");
    if (g.verdict !== "wrong") {
      count++;
      $$("#dots i").forEach((d, k) => d.classList.toggle("on", k < count));
      $("#said").innerHTML = `<b style="color:var(--success)">${count >= 3 ? "잘했어요! 🎉" : `좋아요! ${3 - count}번 더`}</b>`;
      if (count >= 3) setTimeout(advance, 900);
    } else $("#said").innerHTML = `<span class="placeholder">조금 달라요: ${esc(text)} — 한 번 더!</span>`;
  } });
  on("#skip", advance);
}

// ── 낱말 블록 ───────────────────────────
function blocks() {
  const s = current.s, pool = chips(s.en), picked = [];
  app.innerHTML = `
  <section class="screen">
    ${progressHeader()}
    <div class="card tight"><span class="tag plain">${esc(s.when)}</span><p class="ko">${markPhrase(s.ko, keyOf(s)?.[0])}</p></div>
    <div class="answer-area" id="ans" aria-label="고른 낱말"></div>
    <div class="pool" id="pool">${pool.map((c, k) => `<button class="wchip" data-k="${k}">${esc(c.w)}</button>`).join("")}</div>
    <div class="grow"></div>
    <div class="btn-row"><button class="btn secondary" id="undo">하나 지우기</button><button class="btn primary" id="check" disabled>확인</button></div>
    <button class="btn ghost" id="toVoice">${sp.canListen ? "말로 할게요" : "정답 볼래요"}</button>
  </section>`;
  bindQuit();
  const ans = $("#ans");
  const render = () => {
    ans.innerHTML = picked.map(k => `<button class="wchip" data-k="${k}">${esc(pool[k].w)}</button>`).join("");
    $$("#pool .wchip").forEach(b => b.classList.toggle("used", picked.includes(+b.dataset.k)));
    $("#check").disabled = picked.length !== pool.length;
    ans.querySelectorAll(".wchip").forEach(b => on(b, () => { picked.splice(picked.indexOf(+b.dataset.k), 1); render(); }));
  };
  $$("#pool .wchip").forEach(b => on(b, () => { if (!picked.includes(+b.dataset.k)) { picked.push(+b.dataset.k); render(); } }));
  on("#undo", () => { picked.pop(); render(); });
  on("#check", () => {
    const text = picked.map(k => pool[k].w).join(" ");
    const ok = normalize(text).join(" ") === normalize(s.en).join(" ");
    if (!ok && !current.blockTry) { current.blockTry = true; ans.classList.add("shake"); setTimeout(() => ans.classList.remove("shake"), 400); toast("순서가 달라요. 한 번 더 맞춰 보세요."); return; }
    finish(text, "blocks");
  });
  on("#toVoice", () => sp.canListen ? go("speak") : finish("", "giveup"));
}

// ── 끝 ──────────────────────────────────
function done() {
  const r = Object.values(session.results), n = (v) => r.filter(x => x === v).length;
  const d = store.dayLog(), streak = store.streak(), L = level(totalXp());
  const practice = session.practice;
  app.innerHTML = `
  <section class="screen">
    <div class="grow"></div>
    <div class="center" style="display:grid;justify-items:center;gap:8px">
      ${mascot("cheer", 128)}
      <h1>${practice ? "다시 연습 끝!" : "오늘도 입이 트였어요"}</h1>
      <p class="muted" style="margin:0">${practice ? "기록은 그대로예요. 입에 붙을 때까지 또 해 봐요" : `🔥 ${streak}일째 · 오늘 ${d.done}문장 · Lv.${L.lv} (${L.p}/100)`}</p>
    </div>
    <div class="card">
      <div class="row between"><span class="row">${stars(3)} 정확</span><b style="color:var(--success)">${n("exact")}</b></div>
      <div class="row between" style="margin-top:8px"><span class="row">${stars(2)} 아슬아슬</span><b style="color:var(--warning)">${n("close")}</b></div>
      <div class="row between" style="margin-top:8px"><span class="row">${stars(1)} 다시 할 문장</span><b style="color:var(--danger)">${n("wrong")}</b></div>
      ${practice ? "" : `<p class="xs muted" style="margin:12px 0 0">틀린 문장은 내일 다시 나와요. 아슬한 문장은 날을 두고 다시 나와요.</p>`}
    </div>
    ${practice ? "" : `<div class="card tight">${weekHtml()}</div>`}
    <div class="grow"></div>
    <div class="btn-col">
      <button class="btn primary lg block" id="more">${practice ? "한 번 더 연습" : "5문장 더 하기"}</button>
      <button class="btn secondary block" id="todayL">📒 오늘 한 문장 다시 보기</button>
      <button class="btn ghost block" id="home">처음으로</button>
    </div>
  </section>`;
  on("#home", () => go("home"));
  on("#todayL", () => go("todayList"));
  on("#more", () => {
    if (practice) { session = { queue: session.queue.slice(), retry: [], index: 0, results: {}, practice: true }; return nextSentence(); }
    session = buildExtra(5); if (!session.queue.length) { toast("더 할 문장이 없어요!"); return; } nextSentence();
  });
}

// ── 오늘 한 문장 ────────────────────────
function todayList() {
  const pr = store.progress(), t = store.today();
  const rank = (v) => v.last === "wrong" ? 0 : v.last === "close" ? 1 : 2;
  const ids = Object.entries(pr.reviews).filter(([, v]) => v.lastAt === t).sort((a, b) => rank(a[1]) - rank(b[1])).map(([id]) => id).filter(getSentence);
  let cover = false;
  const render = () => {
    app.innerHTML = `
    <section class="screen">
      <div class="topbar"><button class="icon-btn" id="back" aria-label="뒤로">${I.back}</button><h2 class="grow">오늘 한 문장</h2><span class="small muted">${ids.length}문장</span></div>
      ${ids.length ? `
      <div class="row between">
        <span class="small muted">영어를 가리고 떠올려 봐요</span>
        <div class="seg"><button aria-pressed="${!cover}" data-c="0">다 보기</button><button aria-pressed="${cover}" data-c="1">영어 가리기</button></div>
      </div>
      <div class="list">${ids.map(id => { const s = getSentence(id), v = pr.reviews[id], key = keyOf(s), tip = tipOf(s); return `
        <div class="card tight">
          <div class="row between"><span class="xs muted">${esc(s.when)}</span>${stars(v.last === "exact" ? 3 : v.last === "close" ? 2 : 1)}</div>
          <div style="margin-top:6px;font-weight:800">${markPhrase(s.ko, key?.[0])}</div>
          <div class="en-reveal ${cover ? "covered" : ""}" data-reveal title="눌러서 보기">
            <div class="en" style="font-size:18px;line-height:27px;margin-top:6px">${markPhrase(s.en, key?.[1])}</div>
            ${tip ? `<div class="small muted" style="margin-top:2px">🗣️ ${esc(tip.sound)}</div>` : ""}
            ${tip?.short ? `<div class="small" style="margin-top:2px">짧게 <b>${esc(tip.short)}</b> <span class="muted">${esc(tip.shortSound)}</span></div>` : ""}
          </div>
          <div class="play-row" style="margin-top:8px"><button class="chip-btn" data-say="${esc(s.en)}">${I.speaker}듣기</button><button class="chip-btn" data-say="${esc(s.en)}" data-rate="0.65">${I.slow}천천히</button></div>
        </div>`; }).join("")}</div>
      <div class="sticky-bottom"><button class="btn primary lg block" id="practice">🗣️ 이 문장들 다시 말해 보기</button></div>`
      : `<div class="card center" style="display:grid;justify-items:center;gap:8px">${mascot("think", 96)}<b>아직 오늘 공부한 문장이 없어요</b><span class="small muted">오늘의 말하기를 하면 여기 모여요</span></div>`}
    </section>`;
    on("#back", () => go("home")); bindSay();
    $$("[data-c]").forEach(b => on(b, () => { cover = b.dataset.c === "1"; render(); }));
    $$("[data-reveal]").forEach(el => on(el, () => el.classList.remove("covered")));
    on("#practice", () => { session = { queue: ids.slice(), retry: [], index: 0, results: {}, practice: true }; nextSentence(); });
  };
  render();
}

// ── 코스 지도 ───────────────────────────
function courses() {
  const pr = store.progress();
  const sec = (g) => COURSES.filter(c => c.group === g).map(c => {
    const st = courseStats(c.id), isDone = st.seen === st.total;
    return `<button class="course ${c.id === pr.currentCourse ? "current" : ""} ${isDone ? "done" : ""}" data-id="${c.id}">
      <span class="num">${isDone ? "✓" : COURSES.indexOf(c) + 1}</span>
      <span class="grow"><span class="t">${esc(c.title)}</span><span class="s">${st.seen}/${st.total}문장 · ${st.graduated} 졸업</span>
      <span class="bar"><i style="width:${(st.seen / st.total) * 100}%"></i></span></span></button>`;
  }).join("");
  app.innerHTML = `
  <section class="screen">
    <div class="topbar"><button class="icon-btn" id="back" aria-label="뒤로">${I.back}</button><h2 class="grow">코스 지도</h2></div>
    <p class="small muted" style="margin:0">고른 코스의 새 문장부터 나와요. 복습은 코스와 상관없이 먼저 나와요.</p>
    <div class="section-title">여행영어</div><div class="list">${sec("여행")}</div>
    <div class="section-title">생활영어</div><div class="list">${sec("생활")}</div>
  </section>`;
  on("#back", () => go("home"));
  $$(".course").forEach(b => on(b, () => { pr.currentCourse = b.dataset.id; store.save(); toast(`${COURSES.find(c => c.id === b.dataset.id).title} 코스로 바꿨어요`); go("home"); }));
}

// ── 듣기 연습 ───────────────────────────
function startListen() {
  lsession = buildListenSession(6);
  if (!lsession.queue.length) { toast("들을 문장이 없어요! 다른 상황을 골라 보세요."); return; }
  go("listen");
}
function listenChoices(item) {
  const same = L_COURSES.find(c => c.id === item.course).ids.map(id => L_BY_ID[id]).filter(x => x.id !== item.id);
  const pool = (same.length >= 3 ? same : Object.values(L_BY_ID).filter(x => x.id !== item.id)).slice().sort(() => Math.random() - .5);
  return [...pool.slice(0, 3).map(x => x.ko), item.ko].sort(() => Math.random() - .5);
}
function listenSound(item) {
  const c = L_COURSES.find(c => c.id === item.course);
  return L_SOUNDS[item.course]?.[c.ids.indexOf(item.id)] || "";
}
function listen() {
  const item = L_BY_ID[lsession.queue[lsession.index]];
  const total = lsession.queue.length, choices = listenChoices(item), voice = sp.randomAccent();
  let rate = 1.0, plays = 0, answered = false;
  app.innerHTML = `
  <section class="screen">
    <div class="topbar">
      <button class="icon-btn" id="quit" aria-label="그만하기">${I.close}</button>
      <div class="grow" style="padding:0 6px"><div class="bar"><i style="width:${(lsession.index / total) * 100}%"></i></div></div>
      <span class="small muted">${lsession.index + 1} / ${total}</span>
    </div>
    <div class="row between"><span class="tag">🎧 ${esc(L_COURSES.find(c => c.id === item.course).title)}</span><span class="accent-tag" id="accent"></span></div>
    <div class="listen-stage">
      ${mascot("listen", 76)}
      <button class="big-play" id="play" aria-label="듣기">${I.play}</button>
      <div class="seg"><button aria-pressed="true" data-r="1">보통</button><button aria-pressed="false" data-r="1.15">빠르게</button><button aria-pressed="false" data-r="0.7">천천히</button></div>
      <p class="small muted" style="margin:0">눌러서 듣고, 무슨 뜻인지 골라요</p>
    </div>
    <div class="choices" id="choices">${choices.map((c, k) => `<button class="choice" data-k="${k}">${esc(c)}</button>`).join("")}
      <button class="choice" data-k="x" style="text-align:center;color:var(--text-muted)">잘 모르겠어요</button></div>
    <div id="reveal"></div>
  </section>`;
  on("#quit", () => { homeTab = "listen"; go("home"); });
  const playBtn = $("#play");
  const play = () => { plays++; playBtn.classList.add("playing"); sp.speak(item.en, rate, voice?.voice).then(() => playBtn.classList.remove("playing")); };
  on(playBtn, play);
  $$("[data-r]").forEach(b => on(b, () => { rate = +b.dataset.r; $$("[data-r]").forEach(x => x.setAttribute("aria-pressed", String(x === b))); play(); }));
  play();
  $$(".choice").forEach(b => on(b, () => {
    if (answered) return; answered = true;
    const ok = b.dataset.k !== "x" && choices[+b.dataset.k] === item.ko;
    $$(".choice").forEach(x => { x.disabled = true; if (x.dataset.k !== "x" && choices[+x.dataset.k] === item.ko) x.classList.add("right"); });
    if (!ok && b.dataset.k !== "x") b.classList.add("wrong");
    recordListen(item.id, ok);
    lsession.results[item.id] = ok;
    if (voice) $("#accent").textContent = `🌎 ${voice.label}`;
    const sound = listenSound(item);
    $("#reveal").innerHTML = `
      ${ok ? coach("cheer", plays <= 1 ? "한 번에 알아들었어요!" : "잘 들었어요!", "글자를 보며 한 번 더 들어 봐요", "good") : coach("oops", "이렇게 들렸던 거예요", "연음 소리를 보면서 다시 들어 봐요", "bad")}
      <div class="card" style="margin-top:12px">
        <div class="row between"><div class="en">${esc(item.en)}</div><button class="chip-btn mini" id="again1" aria-label="다시 듣기">${I.speaker}</button></div>
        <p class="small" style="margin:4px 0 0">${esc(item.ko)}</p>
        ${sound ? `<div class="tipbox"><div class="tip-row"><span class="tip-k">빨리 말하면</span><span class="tip-v">${esc(sound)}</span></div></div>` : ""}
        ${item.replies.length ? `<div class="answer-box"><span class="badge">이렇게 대답해요</span>
          ${item.replies.map(r => `<div class="row between" style="margin-top:6px"><b>${esc(r)}</b><button class="chip-btn mini" data-say="${esc(r)}">${I.speaker}</button></div>`).join("")}
          <p class="small muted" style="margin:6px 0 0">${esc(item.replyKo)}</p>
          ${sp.canListen && !sp.inAppBrowser ? `<div class="said" id="rsaid" style="margin-top:10px">${waveIc()}<span class="placeholder">마이크를 눌러 대답해 봐요</span></div>
          <div class="row" style="justify-content:center;gap:12px;margin-top:10px"><button class="mic" id="rmic" style="width:64px;height:64px" aria-label="대답하기">${I.mic}</button><span class="mic-label" id="rlabel">대답해 보기</span></div>` : ""}
        </div>` : ""}
      </div>
      <div class="sticky-bottom"><button class="btn primary lg block" id="lnext">${lsession.index + 1 < total ? "다음" : "끝"}</button></div>`;
    bindSay();
    on("#again1", play);
    if ($("#rmic")) micControl({ btn: $("#rmic"), label: $("#rlabel"), out: $("#rsaid"), onDone: (text) => {
      const g = grade(text, { en: item.replies[0], alt: item.replies.slice(1) });
      $("#rsaid").innerHTML = g.verdict === "wrong"
        ? `<span class="placeholder">«${esc(text)}» — 위 대답을 듣고 한 번 더!</span>`
        : `<span>${stars(g.verdict === "exact" ? 3 : 2)} <b style="color:var(--success)">좋아요! «${esc(text)}»</b></span>`;
    } });
    $("#reveal").scrollIntoView({ behavior: "smooth", block: "start" });
    on("#lnext", () => { lsession.index++; lsession.index < total ? go("listen") : go("listenDone"); });
  }));
}
function listenDone() {
  const r = Object.values(lsession.results), ok = r.filter(Boolean).length;
  app.innerHTML = `
  <section class="screen">
    <div class="grow"></div>
    <div class="center" style="display:grid;justify-items:center;gap:8px">
      ${mascot(ok >= r.length / 2 ? "cheer" : "think", 128)}
      <h1>${ok}/${r.length} 알아들었어요</h1>
      <p class="muted" style="margin:0">못 알아들은 말은 내일 다시 들려줘요</p>
    </div>
    <div class="card tight list">${lsession.queue.map(id => { const it = L_BY_ID[id]; return `
      <div class="row between"><span class="grow"><b>${esc(it.en)}</b><br><span class="small muted">${esc(it.ko)} · ${esc(listenSound(it))}</span></span>
      <span>${lsession.results[id] ? "✅" : "🔁"}</span><button class="chip-btn mini" data-say="${esc(it.en)}" data-rate="1">${I.speaker}</button></div>`; }).join("")}</div>
    <div class="grow"></div>
    <div class="btn-col"><button class="btn primary lg block" id="more">6문장 더 듣기</button><button class="btn ghost block" id="home">처음으로</button></div>
  </section>`;
  bindSay();
  on("#home", () => { homeTab = "listen"; go("home"); });
  on("#more", startListen);
}

// ── 따라 말하기 특훈 ────────────────────
function drill() {
  const pr = store.progress(), t = store.today();
  let ids = Object.entries(pr.reviews).filter(([, v]) => v.lastAt === t).map(([id]) => id);
  if (ids.length < 3) ids = Object.entries(pr.reviews).sort((a, b) => (b[1].lastAt || "").localeCompare(a[1].lastAt || "")).slice(0, 10).map(([id]) => id);
  if (!ids.length) ids = COURSES.find(c => c.id === pr.currentCourse).ids.slice(0, 5);
  ids = ids.filter(getSentence);
  let i = 0;
  const rate = store.profile().rate;
  const render = () => {
    const s = getSentence(ids[i]);
    app.innerHTML = `
    <section class="screen">
      <div class="topbar"><button class="icon-btn" id="back" aria-label="그만하기">${I.close}</button><h2 class="grow">따라 말하기 특훈</h2><span class="small muted">${i + 1} / ${ids.length}</span></div>
      ${coach("happy", "들리는 대로 바로 따라 해요", "기록에 남지 않으니 마음껏!")}
      <div class="card center">
        <div class="en" id="target">${esc(s.en)}</div>
        <p class="small muted" style="margin:6px 0 0">${esc(s.ko)}</p>
        <div class="play-row" style="justify-content:center;margin-top:12px"><button class="chip-btn" id="p">${I.speaker}다시 듣기</button></div>
        ${soundBox(s)}
      </div>
      <div class="said" id="said" aria-live="polite">${waveIc()}<span class="placeholder">듣고 나서 마이크를 눌러요</span></div>
      <div class="grow"></div>
      <div class="dock">
        <div class="dock-row"><button class="side-btn" id="prev" ${i ? "" : "disabled"}>이전</button><button class="mic" id="mic" aria-label="따라 말하기" ${sp.canListen ? "" : "disabled"}>${I.mic}</button><button class="side-btn" id="nx">${i < ids.length - 1 ? "다음" : "끝"}</button></div>
        <div class="mic-label" id="micLabel">따라 말하기</div>
      </div>
    </section>`;
    on("#back", () => go("home")); bindSay();
    on("#p", () => sp.speak(s.en, rate));
    sp.speak(s.en, rate);
    on("#prev", () => { i--; stopAll(); render(); });
    on("#nx", () => { stopAll(); if (i < ids.length - 1) { i++; render(); } else go("home"); });
    micControl({ btn: $("#mic"), label: $("#micLabel"), out: $("#said"), onDone: (text) => {
      const g = grade(text, withShort(s));
      $("#target").innerHTML = g.targetMarks.map(m => `<span class="${m.ok ? "hit" : ""}">${esc(m.w)}</span>`).join(" ");
      $("#said").innerHTML = `${stars(verdictStars(g.verdict, "voice"))} <span>${esc(text)}</span>`;
      if (g.verdict !== "wrong" && i < ids.length - 1) setTimeout(() => { i++; render(); }, 1200);
    } });
  };
  render();
}

// ── 내 노트 ─────────────────────────────
function notes() {
  const pr = store.progress();
  app.innerHTML = `
  <section class="screen">
    <div class="topbar"><button class="icon-btn" id="back" aria-label="뒤로">${I.back}</button><h2 class="grow">내 노트</h2></div>
    ${coach("happy", "꼭 하고 싶은 말을 더해요", "오늘의 말하기에 먼저 나와요")}
    <form class="card tight" id="f" style="display:grid;gap:12px">
      <div class="field"><label for="ko">한국어</label><input class="input" id="ko" required maxlength="80" placeholder="예) 해변까지 셔틀버스 있어요?"></div>
      <div class="field"><label for="en">영어</label><input class="input" id="en" required maxlength="120" autocapitalize="sentences" placeholder="예) Is there a shuttle bus to the beach?"></div>
      <button class="btn primary" type="submit">더하기</button>
    </form>
    <div class="list">${pr.notes.length ? pr.notes.slice().reverse().map(n => `
      <div class="card tight note-item">
        <div class="grow"><div class="small muted">${esc(n.ko)}</div><div><b>${esc(n.en)}</b></div></div>
        <button class="icon-btn" data-say="${esc(n.en)}" aria-label="듣기">${I.speaker}</button>
        <button class="icon-btn" data-del="${n.id}" aria-label="지우기">${I.close}</button>
      </div>`).join("") : `<p class="center muted">아직 없어요.</p>`}</div>
  </section>`;
  on("#back", () => go("home")); bindSay();
  on("#f", (e) => {
    e.preventDefault();
    const ko = $("#ko").value.trim(), en = $("#en").value.trim();
    if (!ko || !en) return;
    pr.notes.push({ id: Date.now().toString(36), ko, en }); store.save(); toast("더했어요"); go("notes");
  }, "submit");
  $$("[data-del]").forEach(b => on(b, () => {
    if (!confirm("이 문장을 지울까요?")) return;
    pr.notes = pr.notes.filter(n => n.id !== b.dataset.del); delete pr.reviews["note-" + b.dataset.del]; store.save(); go("notes");
  }));
}

// ── 설정 ────────────────────────────────
function settings() {
  const p = store.profile();
  const accents = sp.accentVoices().map(a => a.label).join(" · ") || "없음";
  app.innerHTML = `
  <section class="screen">
    <div class="topbar"><button class="icon-btn" id="back" aria-label="뒤로">${I.back}</button><h2 class="grow">설정 · ${esc(p.name)}</h2></div>
    <div class="card tight" style="display:grid;gap:18px">
      <div class="field"><label>하루 목표</label>
        <div class="seg" style="justify-content:flex-start" id="goal">${[3, 5, 10, 15, 20].map(n => `<button aria-pressed="${p.dailyGoal === n}" data-n="${n}">${n}문장</button>`).join("")}</div></div>
      <div class="field"><label for="rate">정답 읽는 빠르기 <span class="muted" id="rv">${p.rate.toFixed(2)}</span></label>
        <input type="range" id="rate" min="0.6" max="1.2" step="0.05" value="${p.rate}">
        <button class="btn secondary" id="testRate">${I.speaker}들어 보기</button></div>
      <div class="field"><label for="nm">이름</label><input class="input" id="nm" value="${esc(p.name)}" maxlength="10"></div>
    </div>
    <div class="card tight" style="display:grid;gap:10px">
      <b>기록 옮기기</b>
      <p class="small muted" style="margin:0">브라우저 기록을 지우면 공부 기록도 사라져요. 가끔 파일로 내보내 두세요.</p>
      <div class="btn-row"><button class="btn secondary" id="exp">내보내기</button><button class="btn secondary" id="imp">불러오기</button></div>
      <input type="file" id="file" accept="application/json,.json" hidden>
    </div>
    <div class="card tight small muted">말 받아쓰기 ${sp.canListen ? "됨" : "안 됨"} · 소리 읽기 ${sp.canSpeak ? "됨" : "안 됨"}<br>이 폰의 영어 목소리: ${esc(accents)}</div>
    <button class="btn danger" id="reset">${esc(p.name)} 기록 처음부터</button>
    <p class="xs muted center" style="margin:0">판 ${VERSION} · 캐릭터 그림: 지안</p>
  </section>`;
  on("#back", () => go("home"));
  $$("#goal button").forEach(b => on(b, () => { p.dailyGoal = +b.dataset.n; store.save(); go("settings"); }));
  on("#rate", (e) => { p.rate = +e.target.value; $("#rv").textContent = p.rate.toFixed(2); store.save(); }, "input");
  on("#testRate", () => sp.speak("Could I get a window seat, please?", p.rate));
  on("#nm", (e) => { const v = e.target.value.trim(); if (v) { p.name = v; store.save(); } }, "change");
  on("#exp", async () => {
    const blob = new Blob([store.exportJson()], { type: "application/json" });
    const name = `입트기-기록-${store.today()}.json`, file = new File([blob], name, { type: "application/json" });
    if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: name }); return; } catch {} }
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  });
  on("#imp", () => $("#file").click());
  on("#file", async (e) => {
    const f = e.target.files[0]; if (!f) return;
    if (!confirm("지금 이 폰의 기록을 파일 내용으로 바꿀까요?")) return;
    try { store.importJson(await f.text()); toast("불러왔어요"); go("home"); } catch { toast("이 파일은 못 읽어요."); }
  }, "change");
  on("#reset", () => {
    if (!confirm(`${p.name}의 공부 기록을 모두 지울까요? 되돌릴 수 없어요.`)) return;
    const pr = store.progress(); pr.reviews = {}; pr.days = {}; delete pr.listen; store.save(); toast("지웠어요"); go("home");
  });
}

const SCREENS = { pickProfile, home, speak, blocks, result, repeat3, done, todayList, courses, listen, listenDone, drill, notes, settings };

// ── 시작 ────────────────────────────────
store.load();
go(store.get().activeProfile ? "home" : "pickProfile");
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("./sw.js").catch(() => {});
