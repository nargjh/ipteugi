// 말 받아쓰기(Web Speech) · 녹음(MediaRecorder) · 소리(Amara 녹음 → 없으면 speechSynthesis)
import { AUDIO } from "../data/audio.js?v=14";
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
export const canListen = !!SR;
export const canSpeak = "speechSynthesis" in window;

// 카카오톡·인스타 같은 앱 안 브라우저
export const inAppBrowser = /KAKAOTALK|Instagram|FBAN|FBAV|NAVER\(inapp|Line\//i.test(navigator.userAgent);

// 휴대폰: 녹음(MediaRecorder)이 마이크를 잡으면 받아쓰기가 아무것도 못 들음(안드로이드 크롬) → 녹음 끔
export const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export const canRecordWhileListening = !isMobile;
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

let rec = null;

// 안드로이드 크롬은 계속 듣기에서 앞서 받아쓴 말을 다음 조각에 또 담아 보냄 → 겹치는 부분은 한 번만
const low = (t) => t.toLowerCase().replace(/[^a-z0-9' ]/g, "").replace(/\s+/g, " ").trim();
export function mergeSegs(segs) {
  let out = "";
  for (const raw of segs) {
    const t = (raw || "").trim(); if (!t) continue;
    const a = low(out), b = low(t);
    if (!a) { out = t; continue; }
    if (b.startsWith(a)) { out = t; continue; }          // 새 조각이 앞의 것을 다 품음
    if (a.endsWith(b) || a.includes(b)) continue;          // 이미 들어 있음
    // 앞 끝과 새 앞머리가 겹치면 겹친 낱말만큼 빼고 붙임
    const aw = a.split(" "), bw = b.split(" "), tw = t.split(/\s+/);
    let ov = 0;
    for (let k = Math.min(aw.length, bw.length); k > 0; k--) { if (aw.slice(-k).join(" ") === bw.slice(0, k).join(" ")) { ov = k; break; } }
    out = (out + " " + tw.slice(ov).join(" ")).trim();
  }
  return out;
}
export let lastError = "";
let mediaRec = null, chunks = [], lastAudioUrl = null, stream = null;

/**
 * 듣기 시작. handlers: onText(final, interim), onEnd(finalText, reason), onError(code)
 * 반환: stop() 함수
 */
export function listen({ onText, onEnd, onError, onState, record = false }) {
  if (!SR) { onError?.("unsupported"); return () => {}; }
  stopListening();
  let finalText = "";
  let interim = "";
  let stoppedByUser = false;
  let ended = false;
  lastError = "";

  rec = new SR();
  rec.lang = "en-US";
  rec.interimResults = true;
  rec.continuous = !isIOS; // 잠깐 멈춰도 계속 듣기 · 아이폰 사파리는 계속 듣기가 불안정해 한 문장 모드
  // 말이 끝나고 2.5초 조용하면 스스로 끝냄 · 아무 말 없이 9초면 끝냄
  let lastHeard = Date.now(), heardAny = false;
  const silenceTimer = setInterval(() => {
    if (ended) { clearInterval(silenceTimer); return; }
    const quiet = Date.now() - lastHeard;
    if ((heardAny && quiet > 2500) || (!heardAny && quiet > 9000)) { clearInterval(silenceTimer); stoppedByUser = true; try { rec?.stop(); } catch {} }
  }, 300);
  rec.maxAlternatives = 5;
  let finalAlts = [];

  rec.onresult = (e) => {
    lastHeard = Date.now(); heardAny = true;
    const finals = [...e.results].filter(r => r.isFinal);
    const top = finals.map(r => r[0].transcript.trim());
    finalText = mergeSegs(top);
    interim = [...e.results].filter(r => !r.isFinal).map(r => r[0].transcript.trim()).join(" ");
    // 끝난 조각마다 후보를 바꿔 끼운 문장들 (겹침 없이 합침)
    const alts = new Set([finalText]);
    finals.forEach((r, i) => { for (let k = 1; k < r.length; k++) { const c = top.slice(); c[i] = r[k].transcript.trim(); alts.add(mergeSegs(c)); } });
    finalAlts = [...alts].filter(Boolean);
    // 보이는 글: 받아쓴 것 + 아직 듣는 중인 것(겹치면 한 번만)
    const shown = mergeSegs([finalText, interim].filter(Boolean));
    onText?.(finalText, shown.slice(finalText.length).trim());
  };
  rec.onstart = () => onState?.("start");
  rec.onaudiostart = () => onState?.("audio");
  rec.onspeechstart = () => onState?.("speech");
  rec.onerror = (e) => {
    lastError = e.error;
    if (e.error === "no-speech" || e.error === "aborted") return;
    onError?.(e.error); // not-allowed, service-not-allowed, network, audio-capture
  };
  rec.onend = () => {
    clearInterval(silenceTimer);
    if (ended) return;
    ended = true;
    stopRecording();
    const text = (stoppedByUser || !finalText) ? mergeSegs([finalText, interim].filter(Boolean)) : finalText;
    const alts = finalAlts.length ? [...finalAlts] : [];
    if (text && !alts.includes(text)) alts.unshift(text);
    if (!finalText && interim) alts.push(mergeSegs([interim]));
    onEnd?.(text, stoppedByUser ? "user" : "auto", alts);
    rec = null;
  };

  try { rec.start(); } catch (err) { onError?.("start-failed"); return () => {}; }
  if (record && canRecordWhileListening) startRecording();

  return () => { stoppedByUser = true; try { rec?.stop(); } catch {} };
}

export function stopListening() {
  if (rec) { try { rec.abort(); } catch {} rec = null; }
  stopRecording();
}

async function startRecording() {
  if (!window.MediaRecorder || !navigator.mediaDevices?.getUserMedia) return;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunks = [];
    mediaRec = new MediaRecorder(stream);
    mediaRec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    mediaRec.onstop = () => {
      if (lastAudioUrl) URL.revokeObjectURL(lastAudioUrl);
      lastAudioUrl = chunks.length ? URL.createObjectURL(new Blob(chunks, { type: mediaRec.mimeType })) : null;
      stream?.getTracks().forEach(t => t.stop()); stream = null;
    };
    mediaRec.start();
  } catch { mediaRec = null; stream?.getTracks().forEach(t => t.stop()); stream = null; }
}
function stopRecording() {
  if (mediaRec && mediaRec.state !== "inactive") { try { mediaRec.stop(); } catch {} }
  else if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
}
export function clearMyVoice() {
  if (lastAudioUrl) URL.revokeObjectURL(lastAudioUrl);
  lastAudioUrl = null;
}
export function playMyVoice() {
  if (!lastAudioUrl) return false;
  new Audio(lastAudioUrl).play().catch(() => {});
  return true;
}
export const hasMyVoice = () => !!lastAudioUrl;

// 소리 읽기
let voice = null;
const ACCENTS = [
  { key: "us", label: "미국 영어", re: /en[-_]US/i },
  { key: "gb", label: "영국 영어", re: /en[-_]GB/i },
  { key: "au", label: "호주 영어", re: /en[-_]AU/i },
  { key: "in", label: "인도 영어", re: /en[-_]IN/i },
  { key: "ca", label: "캐나다 영어", re: /en[-_]CA/i },
];
function englishVoices() { return canSpeak ? speechSynthesis.getVoices().filter(v => /^en(-|_)/i.test(v.lang)) : []; }
function pickVoice() {
  const vs = englishVoices();
  const pref = ["Samantha", "Google US English", "Microsoft Aria", "Microsoft Jenny", "Ava", "Allison"];
  for (const p of pref) { const v = vs.find(v => v.name.includes(p)); if (v) return v; }
  return vs.find(v => /en[-_]US/i.test(v.lang)) || vs[0] || null;
}
if (canSpeak) {
  voice = pickVoice();
  speechSynthesis.onvoiceschanged = () => { voice = pickVoice(); };
}
/** 억양별 목소리 하나씩: [{key,label,voice}] */
export function accentVoices() {
  const vs = englishVoices();
  const out = [];
  for (const a of ACCENTS) {
    const cands = vs.filter(v => a.re.test(v.lang));
    if (cands.length) out.push({ ...a, voices: cands });
  }
  return out;
}
/** 아무 억양이나 하나(듣기 연습용) */
export function randomAccent() {
  const list = accentVoices();
  if (!list.length) return null;
  const a = list[Math.floor(Math.random() * list.length)];
  return { key: a.key, label: a.label, voice: a.voices[Math.floor(Math.random() * a.voices.length)] };
}
// 녹음 파일 재생: rate 0.9(기본) = 원래 빠르기
let audioEl = null, audioDone = null;
export const hasRecording = (text) => !!AUDIO[text];
function playRecording(text, rate) {
  stopSpeaking();
  return new Promise((resolve) => {
    audioEl = new Audio(AUDIO[text]);
    audioEl.preservesPitch = true;
    audioEl.playbackRate = Math.min(1.4, Math.max(0.5, rate / 0.9));
    audioDone = resolve;
    audioEl.onended = audioEl.onerror = () => { audioDone = null; resolve(); };
    audioEl.play().catch(() => { audioDone = null; resolve(false); });
  });
}
export function speak(text, rate = 0.9, v = null) {
  if (AUDIO[text]) return playRecording(text, rate);
  if (!canSpeak) return Promise.resolve();
  speechSynthesis.cancel();
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    const vv = v || voice;
    u.lang = vv?.lang || "en-US"; u.rate = rate;
    if (vv) u.voice = vv;
    u.onend = u.onerror = () => resolve();
    speechSynthesis.speak(u);
  });
}
export function stopSpeaking() {
  if (audioEl) { try { audioEl.pause(); } catch {} audioEl = null; if (audioDone) { const d = audioDone; audioDone = null; d(); } }
  if (canSpeak) speechSynthesis.cancel();
}
