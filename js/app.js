import { COURSES } from "../data/sentences.js";
import * as store from "./store.js";
import { buildSession, buildExtra, record, dueReviews, courseStats, getSentence, week } from "./srs.js";
import { grade, chips, normalize } from "./grade.js";
import * as sp from "./speech.js";

const app = document.getElementById("app");
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

// ── 작은 도구 ───────────────────────────
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = (sel) => app.querySelector(sel);
const on = (sel, fn, ev = "click") => { const el = typeof sel === "string" ? $(sel) : sel; el?.addEventListener(ev, fn); };
function toast(msg, ms = 2200) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), ms);
}
const I = {
  mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  stop: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2"/></svg>',
  speaker: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>',
  turtle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 12h4"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  flame: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-6 1-9.5z"/></svg>',
};
const verdictText = { exact: "정확해요", close: "아슬아슬", wrong: "다시 해 봐요" };
const groupTag = (s) => `<span class="tag ${s.group === "생활" ? "life" : ""}">${esc(s.group)} · ${esc(s.when)}</span>`;

// ── 화면 상태 ───────────────────────────
let session = null;   // { queue, retry, index, results, retryMode }
let current = null;   // 지금 문장 { s, verdict, said, res, retried }
let stopFn = null;

function stopAll() { if (stopFn) { sp.stopListening(); stopFn = null; } sp.stopSpeaking(); }

function go(screen, ...args) {
  stopAll();
  window.scrollTo(0, 0);
  SCREENS[screen](...args);
}

// ── S01 사람 고르기 ─────────────────────
function pick() {
  const st = store.get();
  app.innerHTML = `
  <section class="screen">
    <div class="grow"></div>
    <div class="center">
      <div class="display">입트기</div>
      <p class="muted">한국어를 보고, 영어로 소리 내어 말해요.<br>여행·생활에서 바로 쓰는 문장만.</p>
    </div>
    <h2 class="center">누가 공부해요?</h2>
    <div class="who">
      ${Object.entries(st.profiles).map(([id, p]) => `<button data-id="${id}">${esc(p.name)}</button>`).join("")}
    </div>
    <div class="grow"></div>
  </section>`;
  app.querySelectorAll(".who button").forEach(b => on(b, () => { store.setProfile(b.dataset.id); go("home"); }));
}

// ── S02 오늘 ────────────────────────────
function home() {
  const st = store.get();
  const p = store.profile(), pr = store.progress();
  const d = store.dayLog();
  const goal = p.dailyGoal;
  const done = Math.min(d.done, goal);
  const due = dueReviews();
  const pct = goal ? done / goal : 0;
  const C = 2 * Math.PI * 48;
  const course = COURSES.find(c => c.id === pr.currentCourse);
  const cs = courseStats(course.id);
  const streak = store.streak();
  const goalDone = d.done >= goal;
  const other = Object.keys(st.profiles).find(id => id !== st.activeProfile);

  const warn = [];
  if (sp.inAppBrowser) warn.push(`<div class="notice err">카카오톡·인스타 안에서 열면 마이크가 막혀요. 오른쪽 위 메뉴에서 <b>다른 브라우저로 열기</b>를 눌러 주세요.</div>`);
  else if (!sp.canListen) warn.push(`<div class="notice">이 브라우저는 말 받아쓰기를 못 해요. 안드로이드는 <b>크롬</b>, 아이폰은 <b>사파리</b>로 열어 주세요. 지금은 낱말 블록으로 할 수 있어요.</div>`);
  if (store.isMemoryOnly()) warn.push(`<div class="notice">이 브라우저는 기록을 저장하지 못해요(사생활 보호 모드?). 창을 닫으면 사라져요.</div>`);

  app.innerHTML = `
  <section class="screen">
    <div class="topbar">
      <button class="pill" id="who" aria-label="사람 바꾸기">${esc(p.name)} ▾</button>
      <div class="row">
        <span class="flame ${streak ? "" : "off"}" title="연속 공부 일수">${I.flame}${streak}일</span>
        <button class="icon-btn" id="settings" aria-label="설정">${I.gear}</button>
      </div>
    </div>
    ${warn.join("")}
    <div class="card">
      <div class="row" style="gap:20px">
        <div class="ring" aria-label="오늘 ${done}/${goal}문장">
          <svg viewBox="0 0 112 112"><circle class="track" cx="56" cy="56" r="48" fill="none" stroke-width="10"/>
          <circle class="fill" cx="56" cy="56" r="48" fill="none" stroke-width="10" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}"/></svg>
          <div class="label"><div><b>${done}</b><span class="xs muted">/ ${goal}문장</span></div></div>
        </div>
        <div class="grow">
          <h2>${goalDone ? "오늘 목표 달성!" : "오늘의 말하기"}</h2>
          <p class="small muted" style="margin:4px 0 0">${goalDone
            ? `오늘 ${d.done}문장 말했어요. 더 해도 좋아요.`
            : `복습 ${Math.min(due.length, goal - done)}개 · 새 문장 ${Math.max(goal - done - due.length, 0)}개`}</p>
          ${due.length > (goalDone ? 0 : goal - done) ? `<p class="xs" style="margin:6px 0 0;color:var(--warning)">밀린 복습 ${due.length}개</p>` : ""}
        </div>
      </div>
      <div style="margin-top:20px">
        <button class="btn primary lg block" id="start">${goalDone ? "5문장 더 하기" : d.done ? "이어서 하기" : "시작하기"}</button>
      </div>
    </div>

    <button class="course current" id="course">
      <span class="num">${COURSES.indexOf(course) + 1}</span>
      <span class="grow"><b>${esc(course.group)} · ${esc(course.title)}</b>
        <span class="xs muted" style="display:block">${cs.seen}/${cs.total}문장 봄 · ${cs.graduated} 졸업</span>
        <span class="bar"><i style="width:${(cs.seen / cs.total) * 100}%"></i></span></span>
      <span class="small muted">코스 ›</span>
    </button>

    <div class="tiles">
      <button class="tile" id="drill"><b>따라 말하기 특훈</b><span>들리는 대로 바로 따라 말하기</span></button>
      <button class="tile" id="notes"><b>내 노트</b><span>꼭 말하고 싶은 문장 더하기 · ${pr.notes.length}개</span></button>
    </div>

    <div class="card tight">
      <div class="row between" style="margin-bottom:10px"><b>이번 주</b><span class="xs muted">하루 말한 문장</span></div>
      ${weekHtml()}
      ${other ? `<p class="xs muted" style="margin:10px 0 0">${esc(st.profiles[other].name)} 기록은 같은 폰에서 공부했을 때만 보여요.</p>` : ""}
    </div>
  </section>`;

  on("#who", () => go("pick"));
  on("#settings", () => go("settings"));
  on("#course", () => go("courses"));
  on("#drill", () => go("drill"));
  on("#notes", () => go("notes"));
  on("#start", () => {
    session = goalDone ? buildExtra(5) : buildSession();
    if (!session.queue.length) { toast("모든 문장을 다 봤어요! 복습이 생기면 다시 나와요."); return; }
    nextSentence();
  });
}

function weekHtml() {
  const st = store.get();
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const rows = Object.entries(st.profiles).map(([id, p]) => {
    const w = week(st.progress[id]);
    const max = Math.max(5, ...w.map(x => x.done));
    return `<span class="name">${esc(p.name)}</span>` + w.map(x =>
      `<span class="b" title="${x.date} ${x.done}문장"><i class="${x.done ? "" : "zero"}" style="height:${x.done ? Math.max(12, (x.done / max) * 100) : 8}%"></i></span>`).join("");
  }).join("");
  const w0 = week(st.progress[st.activeProfile]);
  const labels = `<span></span>` + w0.map(x => { const [y, m, d] = x.date.split("-").map(Number); return `<span class="d">${days[new Date(y, m - 1, d).getDay()]}</span>`; }).join("");
  return `<div class="week">${rows}${labels}</div>`;
}

// ── 공부 흐름 ───────────────────────────
function nextSentence() {
  sp.clearMyVoice();
  if (session.index < session.queue.length) {
    const s = getSentence(session.queue[session.index]);
    if (!s) { session.index++; return nextSentence(); }
    current = { s, retried: false };
    return go("speak");
  }
  // 오늘 틀린 문장 한 번 더
  if (session.retry.length) {
    const id = session.retry.shift();
    current = { s: getSentence(id), retried: true };
    return go("speak");
  }
  go("done");
}

function progressHeader() {
  const total = session.queue.length;
  const n = Math.min(session.index + (current?.retried ? 0 : 1), total);
  const label = current?.retried ? "틀린 문장 한 번 더" : `${n} / ${total}`;
  return `
  <div class="topbar">
    <button class="icon-btn" id="quit" aria-label="그만하기">${I.close}</button>
    <div class="grow" style="padding:0 8px"><div class="bar"><i style="width:${(Math.min(session.index, total) / Math.max(total, 1)) * 100}%"></i></div></div>
    <span class="small muted" style="min-width:56px;text-align:right">${label}</span>
  </div>`;
}
function bindQuit() { on("#quit", () => go("home")); }

// ── S03 말하기 ──────────────────────────
function speak() {
  const s = current.s;
  const first = s.en.split(" ")[0];
  const blanks = s.en.split(" ").map((w, i) => i === 0 ? w : w.replace(/[A-Za-z0-9]/g, "_")).join(" ");
  app.innerHTML = `
  <section class="screen">
    ${progressHeader()}
    <div class="card">
      ${groupTag(s)}
      <p class="ko" style="margin:14px 0 0">${esc(s.ko)}</p>
      <p class="hint" id="hint" hidden>${esc(blanks)}</p>
    </div>
    <div class="transcript" aria-live="polite" id="tr"><span class="placeholder">${sp.canListen ? "마이크를 누르고 영어로 말해 보세요." : "말 받아쓰기가 안 되는 브라우저예요. 낱말 블록으로 해 보세요."}</span></div>
    <div class="grow"></div>
    <div class="mic-wrap">
      <button class="mic" id="mic" aria-pressed="false" aria-label="말하기 시작" ${sp.canListen && !sp.inAppBrowser ? "" : "disabled"}>${I.mic}</button>
      <p class="small muted" id="micHelp" style="margin:10px 0 0">${sp.canListen ? "누르고 말한 뒤, 다시 눌러 끝내요" : ""}</p>
    </div>
    <div class="btn-row">
      <button class="btn secondary" id="hintBtn">첫 낱말 힌트</button>
      <button class="btn secondary" id="blocks">말할 수 없어요</button>
    </div>
    <button class="btn ghost" id="giveup">모르겠어요, 정답 볼래요</button>
  </section>`;
  bindQuit();

  let listening = false;
  const mic = $("#mic"), tr = $("#tr");
  const setMic = (onn) => {
    listening = onn; mic.classList.toggle("on", onn); mic.setAttribute("aria-pressed", String(onn));
    mic.innerHTML = onn ? I.stop : I.mic; mic.setAttribute("aria-label", onn ? "말하기 멈추기" : "말하기 시작");
    $("#micHelp").textContent = onn ? "듣고 있어요… 다 말하면 눌러요" : "누르고 말한 뒤, 다시 눌러 끝내요";
  };
  on(mic, () => {
    if (listening) { stopFn?.(); return; }
    sp.stopSpeaking();
    setMic(true);
    tr.innerHTML = `<span class="placeholder">듣고 있어요…</span>`;
    stopFn = sp.listen({
      record: !isIOS,
      onText: (fin, interim) => { tr.innerHTML = `${esc(fin)} <span class="interim">${esc(interim)}</span>`; },
      onError: (code) => {
        setMic(false); stopFn = null;
        if (code === "not-allowed" || code === "service-not-allowed") toast("마이크가 막혀 있어요. 브라우저 설정에서 마이크를 허용해 주세요.", 4000);
        else if (code === "network") toast("인터넷이 필요해요. 지금은 낱말 블록으로 해 보세요.", 3500);
        else toast("마이크를 못 켰어요. 다시 눌러 보세요.");
      },
      onEnd: (text) => {
        setMic(false); stopFn = null;
        if (!text.trim()) { tr.innerHTML = `<span class="placeholder">아무 말도 못 들었어요. 다시 눌러 말해 보세요.</span>`; return; }
        finish(text, "voice");
      },
    });
  });
  on("#hintBtn", () => { $("#hint").hidden = false; $("#hintBtn").disabled = true; current.hinted = true; });
  on("#blocks", () => go("blocks"));
  on("#giveup", () => finish("", "giveup"));
}

function finish(said, mode) {
  const s = current.s;
  let res = grade(said, s);
  if (mode === "giveup") res = { ...res, verdict: "wrong" };
  if (mode === "blocks") res = { ...res, verdict: res.verdict === "exact" ? "close" : "wrong" }; // 말하지 않았으니 최고 «아슬»
  if (current.hinted && res.verdict === "exact") res.verdict = "close";
  current.said = said; current.res = res; current.mode = mode;
  commit(res.verdict);
  go("result");
}

// 기록: 첫 시도만 복습 기록에 남김 · 틀린 문장은 오늘 끝에 한 번 더
function commit(verdict) {
  current.verdict = verdict;
  if (current.retried) return;
  const pr = store.progress(), d = store.dayLog();
  if (current.snap) {
    // 같은 문장을 다시 채점(다시 말하기·«맞게 말했어요»): 첫 기록 전으로 되돌린 뒤 새로 기록
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

// ── S04 낱말 블록 ───────────────────────
function blocks() {
  const s = current.s;
  const pool = chips(s.en);
  const picked = [];
  app.innerHTML = `
  <section class="screen">
    ${progressHeader()}
    <div class="card tight">${groupTag(s)}<p class="ko" style="margin:10px 0 0">${esc(s.ko)}</p></div>
    <div class="answer-area" id="ans" aria-label="고른 낱말"></div>
    <div class="pool" id="pool">${pool.map((c, k) => `<button class="wchip" data-k="${k}">${esc(c.w)}</button>`).join("")}</div>
    <div class="grow"></div>
    <div class="btn-row">
      <button class="btn secondary" id="undo">하나 지우기</button>
      <button class="btn primary" id="check" disabled>확인</button>
    </div>
    <button class="btn ghost" id="toVoice">${sp.canListen ? "말로 할게요" : "정답 볼래요"}</button>
  </section>`;
  bindQuit();
  const ans = $("#ans");
  const render = () => {
    ans.innerHTML = picked.map(k => `<button class="wchip" data-k="${k}">${esc(pool[k].w)}</button>`).join("");
    app.querySelectorAll("#pool .wchip").forEach(b => b.classList.toggle("used", picked.includes(+b.dataset.k)));
    $("#check").disabled = picked.length !== pool.length;
    ans.querySelectorAll(".wchip").forEach(b => on(b, () => { picked.splice(picked.indexOf(+b.dataset.k), 1); render(); }));
  };
  app.querySelectorAll("#pool .wchip").forEach(b => on(b, () => { if (!picked.includes(+b.dataset.k)) { picked.push(+b.dataset.k); render(); } }));
  on("#undo", () => { picked.pop(); render(); });
  on("#check", () => {
    const text = picked.map(k => pool[k].w).join(" ");
    const ok = normalize(text).join(" ") === normalize(s.en).join(" ");
    if (!ok && !current.blockTry) { current.blockTry = true; ans.classList.add("shake"); setTimeout(() => ans.classList.remove("shake"), 400); toast("순서가 달라요. 한 번 더 맞춰 보세요."); return; }
    finish(text, "blocks");
  });
  on("#toVoice", () => sp.canListen ? go("speak") : finish("", "giveup"));
}

// ── S05 채점 ────────────────────────────
function result() {
  const { s, res, said, mode, verdict } = current;
  const rate = store.profile().rate;
  const marks = (arr, cls) => arr.map(m => `<span class="w ${m.ok ? "" : cls}">${esc(m.w)}</span>`).join(" ");
  const showMine = mode === "voice" || mode === "blocks";
  const others = (s.alt || []).filter(a => a !== res.target);
  app.innerHTML = `
  <section class="screen">
    ${progressHeader()}
    <div class="center"><span class="verdict ${verdict}" role="status">${verdictText[verdict]}</span></div>
    <div class="card">
      <p class="small muted" style="margin:0 0 12px">${esc(s.ko)}</p>
      ${showMine ? `<div class="cmp-label">${mode === "blocks" ? "내가 맞춘 것" : "내가 말한 것"}</div>
      <div class="words" style="margin-bottom:14px">${said ? marks(res.saidMarks, "bad") : `<span class="muted">(없음)</span>`}</div>` : ""}
      <div class="cmp-label">${res.isMain ? "정답" : "이렇게도 말해요 (정답)"}</div>
      <div class="words en-big">${showMine && verdict !== "wrong" ? marks(res.targetMarks, "miss") : esc(res.target)}</div>
      ${!res.isMain ? `<p class="small muted" style="margin:6px 0 0">대표 정답: ${esc(s.en)}</p>` : ""}
      <div class="play-row" style="margin-top:14px">
        <button class="chip-btn" id="pNormal">${I.speaker}정답 듣기</button>
        <button class="chip-btn" id="pSlow">${I.turtle}천천히</button>
        ${sp.hasMyVoice() ? `<button class="chip-btn" id="pMine">${I.play}내 목소리</button>` : ""}
      </div>
      <details class="detail" ${verdict === "wrong" ? "open" : ""}>
        <summary class="small" style="cursor:pointer;font-weight:600">자세히 보기</summary>
        <dl style="margin:8px 0 0">
          <dt>이럴 때</dt><dd>${esc(s.when)}</dd>
          ${s.tip ? `<dt>핵심 표현</dt><dd>${esc(s.tip)}</dd>` : ""}
          ${others.length ? `<dt>이렇게 말해도 맞아요</dt><dd>${others.map(esc).join("<br>")}</dd>` : ""}
        </dl>
      </details>
    </div>
    <div class="grow"></div>
    <div class="btn-col sticky-bottom">
      ${verdict === "wrong"
        ? `<button class="btn primary lg block" id="next">세 번 따라 말하기</button>`
        : `<button class="btn primary lg block" id="next">다음</button>`}
      ${mode === "voice" && verdict !== "exact" ? `<button class="btn ghost" id="fix">받아쓰기가 틀렸어요, 맞게 말했어요</button>` : ""}
      ${mode === "voice" && verdict !== "exact" ? `<button class="btn ghost" id="again">다시 말해 볼래요</button>` : ""}
    </div>
  </section>`;
  bindQuit();
  const play = (btn, r) => { btn.classList.add("playing"); sp.speak(s.en, r).then(() => btn.classList.remove("playing")); };
  on("#pNormal", (e) => play(e.currentTarget, rate));
  on("#pSlow", (e) => play(e.currentTarget, Math.max(0.55, rate - 0.3)));
  on("#pMine", () => sp.playMyVoice());
  if (verdict !== "exact") setTimeout(() => sp.speak(s.en, rate), 250);
  on("#next", () => {
    if (verdict === "wrong" && !sp.canListen) { advance(); return; }
    verdict === "wrong" ? go("repeat3") : advance();
  });
  on("#fix", () => { commit("close"); current.res = { ...res, verdict: "close" }; toast("아슬아슬로 고쳤어요. 날을 두고 한 번 더 나와요."); go("result"); });
  on("#again", () => { current.retryVoice = true; go("speak"); });
}

function advance() {
  if (!current.retried) session.index++;
  nextSentence();
}

// ── S06 세 번 따라 말하기 ───────────────
function repeat3() {
  const s = current.s;
  const rate = store.profile().rate;
  let count = 0;
  app.innerHTML = `
  <section class="screen">
    ${progressHeader()}
    <div class="center"><h2>정답을 세 번 따라 말해요</h2><p class="small muted" style="margin:4px 0 0">입에 붙을 때까지</p></div>
    <div class="card center">
      <p class="small muted" style="margin:0 0 8px">${esc(s.ko)}</p>
      <div class="words en-big" id="target">${esc(s.en)}</div>
      <div class="play-row" style="justify-content:center;margin-top:12px">
        <button class="chip-btn" id="pNormal">${I.speaker}듣기</button>
        <button class="chip-btn" id="pSlow">${I.turtle}천천히</button>
      </div>
    </div>
    <div class="dots" id="dots"><i></i><i></i><i></i></div>
    <div class="transcript center" id="tr" aria-live="polite"><span class="placeholder">듣고 나서 마이크를 눌러 말해요</span></div>
    <div class="grow"></div>
    <div class="mic-wrap"><button class="mic" id="mic" aria-label="따라 말하기">${I.mic}</button></div>
    <button class="btn ghost" id="skip">건너뛰기</button>
  </section>`;
  bindQuit();
  on("#pNormal", () => sp.speak(s.en, rate));
  on("#pSlow", () => sp.speak(s.en, Math.max(0.55, rate - 0.3)));
  setTimeout(() => sp.speak(s.en, rate), 250);
  const mic = $("#mic"), tr = $("#tr");
  let listening = false;
  const setMic = (v) => { listening = v; mic.classList.toggle("on", v); mic.innerHTML = v ? I.stop : I.mic; };
  on(mic, () => {
    if (listening) { stopFn?.(); return; }
    sp.stopSpeaking(); setMic(true);
    tr.innerHTML = `<span class="placeholder">듣고 있어요…</span>`;
    stopFn = sp.listen({
      record: false,
      onText: (fin, interim) => { tr.innerHTML = `${esc(fin)} <span class="interim">${esc(interim)}</span>`; },
      onError: () => { setMic(false); stopFn = null; toast("마이크를 못 켰어요."); },
      onEnd: (text) => {
        setMic(false); stopFn = null;
        if (!text) { tr.innerHTML = `<span class="placeholder">못 들었어요. 다시 말해 보세요.</span>`; return; }
        const g = grade(text, { en: s.en, alt: [] });
        $("#target").innerHTML = g.targetMarks.map(m => `<span class="w ${m.ok ? "hit" : ""}">${esc(m.w)}</span>`).join(" ");
        if (g.verdict !== "wrong") {
          count++;
          app.querySelectorAll("#dots i").forEach((d, k) => d.classList.toggle("on", k < count));
          tr.innerHTML = count >= 3 ? "잘했어요!" : `좋아요! ${3 - count}번 더`;
          if (count >= 3) setTimeout(advance, 900);
        } else tr.innerHTML = `<span class="placeholder">조금 달라요: ${esc(text)}<br>한 번 더!</span>`;
      },
    });
  });
  on("#skip", advance);
}

// ── S08 끝 ──────────────────────────────
function done() {
  const r = Object.values(session.results);
  const n = (v) => r.filter(x => x === v).length;
  const d = store.dayLog();
  const streak = store.streak();
  app.innerHTML = `
  <section class="screen">
    <div class="grow"></div>
    <div class="center">
      <div class="flame" style="font-size:22px;justify-content:center">${I.flame}${streak}일째</div>
      <h1 style="margin-top:8px">${r.length ? "오늘도 입이 트였어요" : "끝!"}</h1>
      <p class="muted">오늘 ${d.done}문장 · ${d.xp} XP</p>
    </div>
    <div class="card">
      <div class="row between"><span>정확</span><b style="color:var(--success)">${n("exact")}</b></div>
      <div class="row between" style="margin-top:8px"><span>아슬아슬</span><b style="color:var(--warning)">${n("close")}</b></div>
      <div class="row between" style="margin-top:8px"><span>다시 할 문장</span><b style="color:var(--danger)">${n("wrong")}</b></div>
      <p class="xs muted" style="margin:12px 0 0">틀린 문장은 내일 다시 나와요. 아슬한 문장은 날을 두고 다시 나와요.</p>
    </div>
    <div class="card tight">${weekHtml()}</div>
    <div class="grow"></div>
    <div class="btn-col">
      <button class="btn primary lg block" id="more">5문장 더 하기</button>
      <button class="btn secondary block" id="home">처음으로</button>
    </div>
  </section>`;
  on("#home", () => go("home"));
  on("#more", () => { session = buildExtra(5); if (!session.queue.length) { toast("더 할 문장이 없어요!"); return; } nextSentence(); });
}

// ── S09 코스 지도 ───────────────────────
function courses() {
  const pr = store.progress();
  const sec = (g) => COURSES.filter(c => c.group === g).map(c => {
    const st = courseStats(c.id);
    const isDone = st.seen === st.total;
    return `<button class="course ${c.id === pr.currentCourse ? "current" : ""} ${isDone ? "done" : ""}" data-id="${c.id}">
      <span class="num">${isDone ? "✓" : COURSES.indexOf(c) + 1}</span>
      <span class="grow"><b>${esc(c.title)}</b><span class="xs muted" style="display:block">${st.seen}/${st.total}문장 · ${st.graduated} 졸업</span>
      <span class="bar"><i style="width:${(st.seen / st.total) * 100}%"></i></span></span>
    </button>`;
  }).join("");
  app.innerHTML = `
  <section class="screen">
    <div class="topbar"><button class="icon-btn" id="back" aria-label="뒤로">${I.back}</button><h2 class="grow">코스</h2></div>
    <p class="small muted" style="margin:0">고른 코스의 새 문장부터 나와요. 복습은 코스와 상관없이 먼저 나와요.</p>
    <div class="section-title">여행영어</div><div class="list">${sec("여행")}</div>
    <div class="section-title">생활영어</div><div class="list">${sec("생활")}</div>
  </section>`;
  on("#back", () => go("home"));
  app.querySelectorAll(".course").forEach(b => on(b, () => { pr.currentCourse = b.dataset.id; store.save(); toast(`${COURSES.find(c => c.id === b.dataset.id).title} 코스로 바꿨어요`); go("home"); }));
}

// ── S10 따라 말하기 특훈 ────────────────
function drill() {
  const pr = store.progress();
  const t = store.today();
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
      <p class="small muted" style="margin:0">듣고 바로 따라 말해요. 채점은 기록에 남지 않아요.</p>
      <div class="card center">
        <p class="small muted" style="margin:0 0 8px">${esc(s.ko)}</p>
        <div class="words en-big" id="target">${esc(s.en)}</div>
        <div class="play-row" style="justify-content:center;margin-top:12px"><button class="chip-btn" id="p">${I.speaker}다시 듣기</button></div>
      </div>
      <div class="transcript center" id="tr" aria-live="polite"><span class="placeholder">듣고 나서 마이크를 눌러요</span></div>
      <div class="grow"></div>
      <div class="mic-wrap"><button class="mic" id="mic" aria-label="따라 말하기" ${sp.canListen ? "" : "disabled"}>${I.mic}</button></div>
      <div class="btn-row"><button class="btn secondary" id="prev" ${i ? "" : "disabled"}>이전</button><button class="btn secondary" id="nx">${i < ids.length - 1 ? "다음" : "끝"}</button></div>
    </section>`;
    on("#back", () => go("home"));
    on("#p", () => sp.speak(s.en, rate));
    setTimeout(() => sp.speak(s.en, rate), 250);
    on("#prev", () => { i--; stopAll(); render(); });
    on("#nx", () => { stopAll(); if (i < ids.length - 1) { i++; render(); } else go("home"); });
    const mic = $("#mic"), tr = $("#tr");
    let listening = false;
    const setMic = (v) => { listening = v; mic.classList.toggle("on", v); mic.innerHTML = v ? I.stop : I.mic; };
    on(mic, () => {
      if (listening) { stopFn?.(); return; }
      sp.stopSpeaking(); setMic(true);
      stopFn = sp.listen({
        record: false,
        onText: (fin, interim) => { tr.innerHTML = `${esc(fin)} <span class="interim">${esc(interim)}</span>`; },
        onError: () => { setMic(false); stopFn = null; },
        onEnd: (text) => {
          setMic(false); stopFn = null;
          if (!text) return;
          const g = grade(text, s);
          $("#target").innerHTML = g.targetMarks.map(m => `<span class="w ${m.ok ? "hit" : ""}">${esc(m.w)}</span>`).join(" ");
          tr.innerHTML = `<span class="verdict ${g.verdict}" style="font-size:16px">${verdictText[g.verdict]}</span>`;
          if (g.verdict !== "wrong" && i < ids.length - 1) setTimeout(() => { i++; render(); }, 1100);
        },
      });
    });
  };
  render();
}

// ── S11 내 노트 ─────────────────────────
function notes() {
  const pr = store.progress();
  app.innerHTML = `
  <section class="screen">
    <div class="topbar"><button class="icon-btn" id="back" aria-label="뒤로">${I.back}</button><h2 class="grow">내 노트</h2></div>
    <p class="small muted" style="margin:0">여행 가서 꼭 하고 싶은 말을 직접 더해요. 오늘 공부에 섞여서 나와요.</p>
    <form class="card tight" id="f" style="display:grid;gap:12px">
      <div class="field"><label for="ko">한국어</label><input class="input" id="ko" required maxlength="80" placeholder="예) 해변까지 셔틀버스 있어요?"></div>
      <div class="field"><label for="en">영어</label><input class="input" id="en" required maxlength="120" autocapitalize="sentences" placeholder="예) Is there a shuttle bus to the beach?"></div>
      <button class="btn primary" type="submit">더하기</button>
    </form>
    <div class="list">
      ${pr.notes.length ? pr.notes.slice().reverse().map(n => `
        <div class="card tight note-item">
          <div class="grow"><div class="small muted">${esc(n.ko)}</div><div><b>${esc(n.en)}</b></div></div>
          <button class="icon-btn" data-say="${n.id}" aria-label="듣기">${I.speaker}</button>
          <button class="icon-btn" data-del="${n.id}" aria-label="지우기">${I.close}</button>
        </div>`).join("") : `<p class="center muted">아직 없어요.</p>`}
    </div>
  </section>`;
  on("#back", () => go("home"));
  on("#f", (e) => {
    e.preventDefault();
    const ko = $("#ko").value.trim(), en = $("#en").value.trim();
    if (!ko || !en) return;
    pr.notes.push({ id: Date.now().toString(36), ko, en });
    store.save(); toast("더했어요"); go("notes");
  }, "submit");
  app.querySelectorAll("[data-say]").forEach(b => on(b, () => sp.speak(pr.notes.find(n => n.id === b.dataset.say).en, store.profile().rate)));
  app.querySelectorAll("[data-del]").forEach(b => on(b, () => {
    if (!confirm("이 문장을 지울까요?")) return;
    pr.notes = pr.notes.filter(n => n.id !== b.dataset.del);
    delete pr.reviews["note-" + b.dataset.del];
    store.save(); go("notes");
  }));
}

// ── S13 설정 ────────────────────────────
function settings() {
  const p = store.profile();
  app.innerHTML = `
  <section class="screen">
    <div class="topbar"><button class="icon-btn" id="back" aria-label="뒤로">${I.back}</button><h2 class="grow">설정 · ${esc(p.name)}</h2></div>
    <div class="card tight" style="display:grid;gap:18px">
      <div class="field"><label>하루 목표</label>
        <div class="seg" id="goal">${[3, 5, 10, 15, 20].map(n => `<button aria-pressed="${p.dailyGoal === n}" data-n="${n}">${n}문장</button>`).join("")}</div></div>
      <div class="field"><label for="rate">정답 읽는 빠르기 <span class="muted" id="rv">${p.rate.toFixed(2)}</span></label>
        <input type="range" id="rate" min="0.6" max="1.2" step="0.05" value="${p.rate}">
        <button class="btn secondary" id="testRate">${I.speaker}들어 보기</button></div>
      <div class="field"><label for="nm">이름</label><input class="input" id="nm" value="${esc(p.name)}" maxlength="10"></div>
    </div>
    <div class="card tight" style="display:grid;gap:10px">
      <b>기록 옮기기</b>
      <p class="small muted" style="margin:0">브라우저 기록을 지우면 공부 기록도 사라져요. 가끔 파일로 내보내 두세요. 다른 폰으로 옮길 때도 써요.</p>
      <div class="btn-row"><button class="btn secondary" id="exp">내보내기</button><button class="btn secondary" id="imp">불러오기</button></div>
      <input type="file" id="file" accept="application/json,.json" hidden>
    </div>
    <div class="card tight" style="display:grid;gap:10px">
      <b>이 폰에서 된 것</b>
      <p class="small muted" style="margin:0">말 받아쓰기 ${sp.canListen ? "됨" : "안 됨"} · 소리 읽기 ${sp.canSpeak ? "됨" : "안 됨"}${sp.inAppBrowser ? " · 앱 안 브라우저(마이크 막힘)" : ""}</p>
    </div>
    <button class="btn danger" id="reset">${esc(p.name)} 기록 처음부터</button>
  </section>`;
  on("#back", () => go("home"));
  app.querySelectorAll("#goal button").forEach(b => on(b, () => { p.dailyGoal = +b.dataset.n; store.save(); go("settings"); }));
  on("#rate", (e) => { p.rate = +e.target.value; $("#rv").textContent = p.rate.toFixed(2); store.save(); }, "input");
  on("#testRate", () => sp.speak("Could I get a window seat, please?", p.rate));
  on("#nm", (e) => { const v = e.target.value.trim(); if (v) { p.name = v; store.save(); } }, "change");
  on("#exp", async () => {
    const blob = new Blob([store.exportJson()], { type: "application/json" });
    const name = `입트기-기록-${store.today()}.json`;
    const file = new File([blob], name, { type: "application/json" });
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
    const pr = store.progress();
    pr.reviews = {}; pr.days = {}; store.save(); toast("지웠어요"); go("home");
  });
}

const SCREENS = { pick, home, speak, blocks, result, repeat3, done, courses, drill, notes, settings };

// ── 시작 ────────────────────────────────
store.load();
go(store.get().activeProfile ? "home" : "pick");

if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
