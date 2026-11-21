// 채점: 받아쓴 글 ↔ 정답·다른 답 낱말 맞대기
const CONTRACTIONS = {
  "i'm": "i am", "you're": "you are", "we're": "we are", "they're": "they are",
  "he's": "he is", "she's": "she is", "it's": "it is", "that's": "that is",
  "there's": "there is", "what's": "what is", "where's": "where is", "who's": "who is",
  "how's": "how is", "here's": "here is", "let's": "let us",
  "i've": "i have", "you've": "you have", "we've": "we have", "they've": "they have",
  "i'll": "i will", "you'll": "you will", "we'll": "we will", "it'll": "it will",
  "i'd": "i would", "you'd": "you would", "we'd": "we would",
  "don't": "do not", "doesn't": "does not", "didn't": "did not", "isn't": "is not",
  "aren't": "are not", "wasn't": "was not", "weren't": "were not", "can't": "cannot",
  "couldn't": "could not", "won't": "will not", "wouldn't": "would not",
  "shouldn't": "should not", "haven't": "have not", "hasn't": "has not",
  "how've": "how have", "o'clock": "oclock",
};
const NUMS = { zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6",
  seven: "7", eight: "8", nine: "9", ten: "10", eleven: "11", twelve: "12" };
const SAME = { "okay": "ok", "alright": "all right", "gonna": "going to", "wanna": "want to",
  "e-mail": "email", "wi-fi": "wifi", "wi fi": "wifi", "cannot": "can not",
  "check-in": "check in", "check-out": "check out", "gift-wrap": "gift wrap",
  "must-see": "must see", "tax-free": "tax free", "one-day": "one day",
  "americano": "americano", "anytime": "any time", "ac": "a c", "i'll seat": "aisle seat", "isle seat": "aisle seat" };

export function normalize(text) {
  let t = (text || "").toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/…/g, " ")
    .replace(/\bwi-?\s?fi\b/g, "wifi");
  for (const [a, b] of Object.entries(SAME)) t = t.replace(new RegExp(`\\b${a.replace(/[-]/g, "\\-")}\\b`, "g"), b);
  t = t.replace(/[^a-z0-9' ]+/g, " ");
  const out = [];
  for (let w of t.split(/\s+/)) {
    if (!w) continue;
    w = w.replace(/^'+|'+$/g, "");
    if (CONTRACTIONS[w]) { out.push(...CONTRACTIONS[w].split(" ")); continue; }
    if (w.endsWith("'s")) w = w.slice(0, -2) + "s";
    w = w.replace(/'/g, "");
    if (NUMS[w]) w = NUMS[w];
    if (w === "can" ) { out.push("can"); continue; }
    out.push(w);
  }
  // "can not" 과 "cannot" 을 같게
  const joined = out.join(" ").replace(/\bcannot\b/g, "can not");
  return joined.split(" ").filter(Boolean);
}

// 화면에 보일 낱말(원래 모양) — 정답 문장을 낱말로
export function displayWords(text) {
  return (text || "").split(/\s+/).filter(Boolean);
}

// 받아쓰기가 자주 헷갈리는 같은 소리 낱말
const SOUNDS = [
  ["to", "too", "2"], ["for", "4", "fore"], ["there", "their", "theyre"], ["your", "youre", "yore"],
  ["its", "it's"], ["right", "write", "rite"], ["here", "hear"], ["buy", "by", "bye"], ["know", "no"],
  ["wait", "weight"], ["meet", "meat"], ["see", "sea", "c"], ["be", "bee", "b"], ["check", "czech", "cheque", "chek"],
  ["aisle", "isle", "i'll", "ill"], ["seat", "sit", "seed"], ["bag", "back"], ["bags", "backs"], ["eight", "ate", "8"],
  ["one", "won", "1"], ["would", "wood"], ["through", "threw"], ["weather", "whether"], ["whole", "hole"],
  ["menu", "manu"], ["receipt", "recite"], ["hi", "high"], ["ok", "okay", "k"], ["a", "uh"], ["can", "could"],
  ["cash", "catch"], ["water", "waiter"], ["board", "bored"], ["fare", "fair"], ["pear", "pair", "pare"], ["plane", "plain"], ["cent", "sent", "scent"], ["peace", "piece"], ["flour", "flower"], ["mail", "male"], ["sale", "sail"], ["tea", "t"], ["steak", "stake"], ["hour", "our"], ["knew", "new"], ["week", "weak"], ["fourth", "forth"], ["way", "weigh"], ["I", "eye", "i"],
];
const SOUND_KEY = {};
SOUNDS.forEach((g, k) => g.forEach(w => { SOUND_KEY[w.toLowerCase().replace(/'/g, "")] = "#" + k; }));
// 빠져도 봐주는 낱말(관사)
export const SOFT = new Set(["a", "an", "the"]);

function lev(a, b) {
  if (Math.abs(a.length - b.length) > 1) return 9;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}
const stem = (w) => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) ? w.slice(0, -1) : w;
export function sameWord(a, b) {
  if (a === b) return true;
  if (SOUND_KEY[a] && SOUND_KEY[a] === SOUND_KEY[b]) return true;
  const sa = stem(a), sb = stem(b);
  if (sa === sb) return true;
  if (sa.length >= 5 && sb.length >= 5 && lev(sa, sb) <= 1) return true; // 철자 한 글자 차이
  return false;
}

function lcs(a, b) {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = sameWord(a[i], b[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  // 짝 찾기
  const matchA = new Array(n).fill(false), matchB = new Array(m).fill(false);
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (sameWord(a[i], b[j]) && dp[i][j] === dp[i + 1][j + 1] + 1) { matchA[i] = matchB[j] = true; i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return { len: dp[0][0], matchA, matchB };
}

// 정답 낱말(보이는 모양)마다 정규화 낱말이 몇 개인지 → 표시용 맞음/빠짐
function markDisplay(display, normMatched) {
  const marks = [];
  let k = 0;
  for (const w of display) {
    const parts = normalize(w);
    if (!parts.length) { marks.push({ w, ok: true }); continue; }
    let ok = true;
    for (let p = 0; p < parts.length; p++) { if (!normMatched[k + p]) ok = false; }
    k += parts.length;
    marks.push({ w, ok });
  }
  return marks;
}

/**
 * said: 받아쓴 글, s: 문장 {en, alt}
 * → { verdict: "exact"|"close"|"wrong", target, targetMarks, saidMarks, score }
 */
export function grade(said, s) {
  const saidN = normalize(said);
  const cands = [s.en, ...(s.alt || [])];
  let best = null;
  for (const c of cands) {
    const tN = normalize(c);
    const r = lcs(tN, saidN);
    const missing = tN.filter((w, k) => !r.matchA[k] && !SOFT.has(w)).length;
    const extra = saidN.filter((w, k) => !r.matchB[k] && !SOFT.has(w)).length;
    const score = tN.length ? r.len / Math.max(tN.length, saidN.length || 1) : 0;
    const cand = { c, tN, r, missing, extra, score };
    if (!best || missing + extra < best.missing + best.extra ||
        (missing + extra === best.missing + best.extra && c === s.en)) best = cand;
  }
  const { c, tN, r, missing, extra } = best;
  let verdict = "wrong";
  if (saidN.length && missing === 0 && extra === 0) verdict = "exact";
  else if (saidN.length && ((r.len / Math.max(tN.filter(w => !SOFT.has(w)).length, 1) >= 0.7 && missing + extra <= 2) || (r.len / tN.length >= 0.85 && missing + extra <= 3))) verdict = "close";

  const saidDisplay = displayWords(said);
  const saidMarks = markDisplay(saidDisplay, r.matchB);
  const targetMarks = markDisplay(displayWords(c), r.matchA);
  return { verdict, target: c, isMain: c === s.en, targetMarks, saidMarks, score: best.score };
}

// 받아쓰기 후보 여러 개 → 가장 잘 맞는 것 하나
const RANK = { exact: 3, close: 2, wrong: 1 };
export function gradeBest(saids, s) {
  let best = null, bestSaid = "";
  for (const said of saids.filter(Boolean)) {
    const g = grade(said, s);
    if (!best || RANK[g.verdict] > RANK[best.verdict] || (RANK[g.verdict] === RANK[best.verdict] && g.score > best.score)) { best = g; bestSaid = said; }
  }
  return { res: best || grade("", s), said: bestSaid };
}

// 낱말 블록용: 정답을 낱말로 자르고 섞기
export function chips(en) {
  const words = displayWords(en);
  const arr = words.map((w, i) => ({ w, i }));
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  // 섞었는데 그대로면 한 번 더
  if (arr.length > 1 && arr.every((x, k) => x.i === k)) [arr[0], arr[1]] = [arr[1], arr[0]];
  return arr;
}
