// 기록 저장 — 폰 안 localStorage, 사람별 칸
const KEY = "ipteugi.v1";

export function today(d = new Date()) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return today(new Date(y, m - 1, d + n));
}

function fresh() {
  return {
    version: 1,
    activeProfile: null,
    profiles: {
      me:   { name: "나",   dailyGoal: 5, rate: 0.9 },
      jian: { name: "지안", dailyGoal: 5, rate: 0.9 },
    },
    progress: {},
  };
}
function freshProgress() {
  return { currentCourse: "tr-airport", reviews: {}, days: {}, notes: [], session: null };
}

let state = null;
let memoryOnly = false;

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    state = raw ? JSON.parse(raw) : fresh();
  } catch { state = fresh(); memoryOnly = true; }
  if (!state.version) state = fresh();
  for (const id of Object.keys(state.profiles)) if (!state.progress[id]) state.progress[id] = freshProgress();
  return state;
}
export function save() {
  if (memoryOnly) return;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { memoryOnly = true; }
}
export const get = () => state;
export const isMemoryOnly = () => memoryOnly;

export function profile() { return state.profiles[state.activeProfile]; }
export function progress() { return state.progress[state.activeProfile]; }
export function setProfile(id) { state.activeProfile = id; save(); }

export function dayLog(date = today()) {
  const p = progress();
  return p.days[date] || (p.days[date] = { done: 0, xp: 0, new: 0 });
}

export function streak(profileId = state.activeProfile) {
  const days = state.progress[profileId]?.days || {};
  let n = 0, d = today();
  if (!(days[d]?.done > 0)) d = addDays(d, -1); // 오늘 아직이면 어제부터 셈
  while (days[d]?.done > 0) { n++; d = addDays(d, -1); }
  return n;
}

export function exportJson() { return JSON.stringify(state, null, 2); }
export function importJson(text) {
  const s = JSON.parse(text);
  if (!s || s.version !== 1 || !s.profiles || !s.progress) throw new Error("bad file");
  state = s; save();
}
