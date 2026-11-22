// 듣기 연습 기록: 못 알아들은 것은 내일, 알아들은 것은 날을 두고 다시
import { L_COURSES, L_BY_ID } from "../data/listening.js?v=15";
import { progress, today, addDays, dayLog, save } from "./store.js?v=15";

const STEPS = [4, 7, 14, 30]; // 알아들은 문장은 4일 뒤부터 · 못 알아들은 문장만 다음 날

function lp() { const p = progress(); return p.listen || (p.listen = { current: L_COURSES[0].id, items: {} }); }
export const listenState = lp;

export function listenCourseStats(cid) {
  const c = L_COURSES.find(x => x.id === cid), it = lp().items;
  return { total: c.ids.length, seen: c.ids.filter(id => it[id]).length, ok: c.ids.filter(id => it[id]?.box >= 1).length };
}

/** 오늘 들을 묶음: 다시 들을 것 먼저, 그다음 지금 코스의 새 것 */
export function buildListenSession(n = 6) {
  const st = lp(), t = today();
  // 다시 들을 것: 못 알아들은 것 먼저 · 오늘 이미 들은 건 빼기
  const due = Object.entries(st.items)
    .filter(([id, v]) => v.due <= t && v.lastAt !== t && L_BY_ID[id])
    .sort((a, b) => (a[1].last === "miss" ? 0 : 1) - (b[1].last === "miss" ? 0 : 1) || a[1].due.localeCompare(b[1].due))
    .map(([id]) => id);
  const order = [st.current, ...L_COURSES.map(c => c.id).filter(id => id !== st.current)];
  const fresh = [];
  for (const cid of order) for (const id of L_COURSES.find(c => c.id === cid).ids) if (!st.items[id]) fresh.push(id);
  // 다시 듣기는 절반까지만, 나머지는 새 문장 (새 문장이 모자라면 다시 듣기로 채움)
  const half = Math.ceil(n / 2);
  let q = [...due.slice(0, half), ...fresh.slice(0, n - Math.min(due.length, half))];
  if (q.length < n) q = [...q, ...due.slice(half)].slice(0, n);
  // 순서를 섞어 매번 같은 게 맨 앞에 오지 않게
  for (let i = q.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [q[i], q[j]] = [q[j], q[i]]; }
  return { queue: q, index: 0, results: {} };
}

export function recordListen(id, ok) {
  const st = lp(), t = today();
  const r = st.items[id] || { box: 0, seen: 0 };
  r.seen++; r.last = ok ? "ok" : "miss"; r.lastAt = t;
  if (ok) { r.box = Math.min(r.box + 1, STEPS.length); r.due = addDays(t, STEPS[r.box - 1]); }
  else { r.box = 0; r.due = addDays(t, 1); }
  st.items[id] = r;
  const d = dayLog(); d.listened = (d.listened || 0) + 1; d.xp += ok ? 5 : 2;
  save();
}
