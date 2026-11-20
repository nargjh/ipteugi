// 말 받아쓰기(Web Speech) · 녹음(MediaRecorder) · 소리(Amara 녹음 → 없으면 speechSynthesis)
import { AUDIO } from "../data/audio.js?v=6";
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
export const canListen = !!SR;
export const canSpeak = "speechSynthesis" in window;

// 카카오톡·인스타 같은 앱 안 브라우저
export const inAppBrowser = /KAKAOTALK|Instagram|FBAN|FBAV|NAVER\(inapp|Line\//i.test(navigator.userAgent);

// 휴대폰: 녹음(MediaRecorder)이 마이크를 잡으면 받아쓰기가 아무것도 못 들음(안드로이드 크롬) → 녹음 끔
export const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export const canRecordWhileListening = !isMobile;

let rec = null;
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
  rec.continuous = !isMobile; // 휴대폰은 한 문장 듣고 스스로 끝나는 모드가 안정적
  rec.maxAlternatives = 1;

  rec.onresult = (e) => {
    interim = "";
    let fin = "";
    for (let i = 0; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) fin += r[0].transcript + " ";
      else interim += r[0].transcript + " ";
    }
    finalText = fin.trim();
    onText?.(finalText, interim.trim());
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
    if (ended) return;
    ended = true;
    stopRecording();
    const text = (finalText + " " + (stoppedByUser || !finalText ? interim : "")).trim();
    onEnd?.(text, stoppedByUser ? "user" : "auto");
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
