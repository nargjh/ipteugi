/* 보고말해 — 서버 없이(휴대폰·무료 웹 공간) 도는 판
   tools/build_static.py 가 dist/ 를 만들 때만 붙는다 (window.BGM_STATIC).
   /api/subs → subs/<id>.json · /api/meaning → 저장된 뜻 → 구글 번역 → Gemini
   /api/teacher → Gemini(무료 열쇠는 이 휴대폰에만 저장) · 목소리 → 미리 만든 mp3, 없으면 휴대폰 목소리 */
(function () {
  if (!window.BGM_STATIC) return;
  const KEY = "bgm2_gemini";
  const realFetch = window.fetch.bind(window);
  const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });
  const vid = (u) => (String(u).match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/) || [])[1] || (/^[\w-]{11}$/.test(u) ? u : null);

  // 미리 만든 원어민 소리
  window.BGM_TTSURL = (voice, rate, text) => {
    const f = (window.BGM_TTSMAP || {})[`${voice}|${rate}|${String(text).trim()}`];
    return f ? `tts/${f}.mp3` : null;
  };

  let meanings = null;
  async function meaning(q) {
    q = q.trim().toLowerCase().slice(0, 60);
    if (!q) return "";
    meanings ||= await realFetch("data/meanings.json").then((r) => r.json()).catch(() => ({}));
    if (meanings[q]) return meanings[q];
    try { // 구글 번역 공개 주소 (열쇠 없음)
      const j = await (await realFetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&dt=bd&q=${encodeURIComponent(q)}`)).json();
      const c = [];
      (j[1] || []).forEach((p) => c.push(...(p[1] || []).slice(0, 2)));
      c.push((j[0] || []).map((s) => s && s[0]).join(""));
      const out = [...new Set(c.map((x) => (x || "").trim().replace(/\.$/, "")).filter((x) => /[가-힣]/.test(x) && x.length < 30))].slice(0, 3).join(", ");
      if (out) return out;
    } catch {}
    const r = await gemini(`Give the Korean meaning of the English expression "${q}" in at most 3 short Korean words/phrases separated by ", ". Reply ONLY JSON: {"meaning": "..."}`);
    return r.meaning || "";
  }

  const TEACHER = `You are {tutor}, an AI English tutor in a voice/video call app, role-playing to help a Korean beginner practice spoken English.
Your role in this conversation: {role}. The learner's mission (in Korean): {mission}
Rules:
- Stay in character. Speak simple, natural, everyday English (CEFR A2), 1-2 short sentences per turn.
- Move the situation forward step by step so the learner can finish the mission.
- If the learner's last message has a mistake or sounds unnatural, give a corrected natural version.
- If the learner writes Korean, understand it and show how to say it in English in "better".
- When the mission is clearly finished, wrap up politely and set "done" to true.
Reply ONLY with one JSON object, no code fence:
{"reply": "<your line in English>", "reply_ko": "<natural Korean translation>",
 "better": "<corrected/more natural version of the learner's last message, or empty if it was fine>",
 "better_ko": "<explain the fix in one short, friendly Korean sentence (e.g. 'speak 뒤엔 -ing 를 써요'), or empty>",
 "hint": "<a natural English line the learner could say next>", "hint_ko": "<Korean of the hint>",
 "done": false}
Conversation so far (T = you, L = learner):
{history}
`;
  // 구글 무료는 붐빌 때 한 번에 7~40초 (11-25 잼) → 빠른 lite 둘을 «동시에» 부르고 먼저 온 답을 씀 · 둘 다 안 되면 flash
  const FAST = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"], SLOW = ["gemini-3.5-flash", "gemini-flash-latest"];
  async function ask(m, key, prompt, ctl) {
    const r = await realFetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
      method: "POST", signal: ctl.signal, headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.8 } }) });
    if (!r.ok) { const e = new Error("http"); e.status = r.status; throw e; }
    const j = await r.json();
    const t = (j.candidates?.[0]?.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || "").join("");
    const mm = t.match(/\{[\s\S]*\}/);
    const o = JSON.parse(mm ? mm[0] : t);
    if (!o.reply && !o.meaning) { const e = new Error("empty"); e.status = 0; throw e; }
    return o;
  }
  async function race(models, key, prompt, ms) {
    const ctls = models.map(() => new AbortController());
    const timer = setTimeout(() => ctls.forEach((c) => c.abort()), ms);
    try { return await Promise.any(models.map((m, i) => ask(m, key, prompt, ctls[i]))); }
    finally { clearTimeout(timer); ctls.forEach((c) => c.abort()); }
  }
  async function gemini(prompt) {
    const key = localStorage.getItem(KEY);
    if (!key) return { error: "AI 열쇠(무료 Gemini)를 아직 안 넣었어요" };
    if (!navigator.onLine) return { error: "인터넷 연결을 확인해 주세요" };
    for (const [models, ms] of [[FAST, 12000], [FAST, 15000], [SLOW, 25000]]) {
      try { return await race(models, key, prompt, ms); }
      catch (agg) {
        const st = (agg.errors || [agg]).map((e) => e.status);
        if (st.some((s) => s === 400 || s === 401 || s === 403)) return { error: "AI 열쇠가 맞지 않아요 — 다시 넣어 주세요" };
        if (st.includes(402)) return { error: "이 열쇠는 유료(선불) 프로젝트 것이라 돈이 다 떨어졌어요 — AI Studio 에서 «새 프로젝트»로 열쇠를 다시 만들면 무료예요" };
        if (st.length && st.every((s) => s === 429)) return { error: "오늘 무료 AI 횟수를 다 썼어요 (1분 뒤 · 내일 다시)" };
      }
    }
    return { error: "구글 AI 가 지금 너무 붐벼요 — 조금 뒤 다시" };
  }
  function teacher(b) {
    const hist = (b.history || []).slice(-10).map((m) => `${m.who === "t" ? "T" : "L"}: ${m.text}`).join("\n") || "(start — greet the learner and open the situation)";
    return gemini(TEACHER.replace("{tutor}", b.tutor || "Mina").replace("{role}", b.role || "a friendly English teacher")
      .replace("{mission}", b.mission || "").replace("{history}", hist)
      + (b.wrap ? "\nIMPORTANT: The 5-minute lesson time is over. Reply to the learner, then say a warm, short goodbye in the same turn and set \"done\" to true.\n" : ""));
  }

  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input.url;
    const u = new URL(url, location.href);
    if (u.origin !== location.origin || !u.pathname.includes("/api/")) return realFetch(input, init);
    const q = (k) => u.searchParams.get(k) || "";
    if (u.pathname.endsWith("/api/subs")) {
      const id = vid(q("url"));
      const r = id && (await realFetch(`subs/${id}.json`).catch(() => null));
      if (r && r.ok) return r;
      return json({ error: "이 영상은 아직 휴대폰 판에 없어요 — PC 에서 넣은 뒤 «올리기»를 한 번 해 주세요" }, 400);
    }
    if (u.pathname.endsWith("/api/meaning")) return json({ meaning: await meaning(q("q")) });
    if (u.pathname.endsWith("/api/teacher")) return json(await teacher(JSON.parse(init?.body || "{}")));
    if (u.pathname.endsWith("/api/tts")) return json({}, 404);
    return realFetch(input, init);
  };

  // PC 에서 넣어 둔 영상도 «내 영상»에 (처음 한 번)
  try {
    const d = JSON.parse(localStorage.getItem("bgm2") || "{}");
    d.videos ||= [];
    (window.BGM_PCVIDEOS || []).forEach((v) => { if (!d.videos.some((x) => x.id === v.id)) d.videos.push({ ...v, seenAt: 0 }); });
    localStorage.setItem("bgm2", JSON.stringify(d));
  } catch {}

  // AI 회화 화면 맨 위: 무료 Gemini 열쇠 넣는 칸
  document.addEventListener("DOMContentLoaded", () => {
    const talk = document.getElementById("talk"); if (!talk) return;
    const box = document.createElement("div");
    box.className = "keybox";
    const draw = () => {
      const has = !!localStorage.getItem(KEY);
      box.innerHTML = has
        ? `🤖 AI 튜터 켜짐 (무료 Gemini) <button class="kchg">열쇠 바꾸기</button>`
        : `🤖 <b>AI 튜터를 켜려면 무료 열쇠 하나가 필요해요</b><br>
           <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a> 에서 구글 로그인 → «API 키 만들기» → 복사해서 아래에 붙여 넣기<br>
           <input class="kin" placeholder="AIza… 또는 AQ.… 붙여 넣기" autocomplete="off"><button class="ksave">저장</button>
           <small>열쇠는 이 휴대폰에만 저장돼요. 없어도 연습 대본으로 대화할 수 있어요.</small>`;
      box.querySelector(".kchg")?.addEventListener("click", () => { localStorage.removeItem(KEY); draw(); });
      box.querySelector(".ksave")?.addEventListener("click", () => {
        const v = box.querySelector(".kin").value.trim();
        if (!/^[\w.-]{20,}$/.test(v)) { box.querySelector(".kin").style.borderColor = "#e5484d"; return; }
        localStorage.setItem(KEY, v); try { aiState = null; } catch {} draw();
      });
    };
    draw();
    talk.insertBefore(box, talk.children[1]);
  });
})();
