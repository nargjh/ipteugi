// 복습: 틀림 → 오늘 한 번 더 + 내일 · 아슬 → 간격 늘려 다시(최대 60일) · 정확 → 졸업
import { COURSES, BY_ID } from "../data/sentences.js?v=7";
import { progress, profile, today, addDays, dayLog, save } from "./store.js?v=7";

const STEPS = [1, 3, 7, 14, 30, 60];

// 코스 문장 또는 내 노트 문장
export function getSentence(id) {
  if (BY_ID[id]) return BY_ID[id];
  if (id.startsWith("note-")) {
    const n = progress().notes.find(n => "note-" + n.id === id);
    if (n) return { id, course: "notes", group: "노트", ko: n.ko, en: n.en, alt: [], when: "내 노트", tip: "" };
  }
  return null;
}

export function dueReviews(date = today()) {
  const r = progress().reviews;
  return Object.entries(r)
    .filter(([id, v]) => v.state !== "graduated" && v.due <= date && getSentence(id))
    .sort((a, b) => a[1].due.localeCompare(b[1].due))
    .map(([id]) => id);
}

export function courseStats(courseId) {
  const c = COURSES.find(x => x.id === courseId);
  const r = progress().reviews;
  const seen = c.ids.filter(id => r[id]).length;
  const graduated = c.ids.filter(id => r[id]?.state === "graduated").length;
  return { total: c.ids.length, seen, graduated };
}

function nextNew(n) {
  const p = progress();
  const order = [p.currentCourse, ...COURSES.map(c => c.id).filter(id => id !== p.currentCourse)];
  const out = [];
  // 내 노트에서 아직 안 본 문장이 먼저
  for (const note of p.notes) {
    const id = "note-" + note.id;
    if (!p.reviews[id]) out.push(id);
    if (out.length >= n) return out;
  }
  for (const cid of order) {
    const c = COURSES.find(x => x.id === cid);
    for (const id of c.ids) {
      if (!p.reviews[id]) out.push(id);
      if (out.length >= n) return out;
    }
  }
  return out;
}

// 오늘 할 묶음: 복습 먼저, 남은 목표만큼 새 문장
export function buildSession() {
  const goal = profile().dailyGoal;
  const doneToday = dayLog().done;
  const due = dueReviews();
  const left = Math.max(goal - doneToday, 0);
  const reviews = due.slice(0, left);
  const fresh = nextNew(Math.max(left - reviews.length, 0));
  return { queue: [...reviews, ...fresh], retry: [], index: 0, results: {} };
}

// 목표를 다 했어도 «더 하기»
export function buildExtra(n = 5) {
  return { queue: [...dueReviews().slice(0, n), ...nextNew(n)].slice(0, n), retry: [], index: 0, results: {}, extra: true };
}

export function record(id, verdict) {
  const p = progress();
  const t = today();
  const prev = p.reviews[id];
  const isNew = !prev;
  const r = prev || { state: "new", box: 0, due: t, lapses: 0, seen: 0 };
  r.seen += 1; r.last = verdict; r.lastAt = t;

  if (verdict === "wrong") {
    r.state = "learning"; r.box = 0; r.lapses += 1; r.due = addDays(t, 1);
  } else if (verdict === "close") {
    r.state = "learning"; r.box = Math.min(r.box + 1, STEPS.length - 1); r.due = addDays(t, STEPS[r.box]);
  } else { // exact
    if (isNew) { r.state = "graduated"; r.due = addDays(t, 365); }
    else {
      const nb = r.box + 2;
      if (nb >= STEPS.length) { r.state = "graduated"; r.due = addDays(t, 365); }
      else { r.state = "learning"; r.box = nb; r.due = addDays(t, STEPS[nb]); }
    }
  }
  p.reviews[id] = r;

  const d = dayLog();
  d.done += 1;
  if (isNew) d.new += 1;
  d.xp += verdict === "exact" ? 10 : verdict === "close" ? 6 : 3;
  save();
  return r;
}

// 7일 기록
export function week(profileProgress, endDate = today()) {
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(endDate, -i);
    out.push({ date: d, done: profileProgress.days[d]?.done || 0 });
  }
  return out;
}
