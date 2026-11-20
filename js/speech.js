// 말 받아쓰기(Web Speech) · 녹음(MediaRecorder) · 소리 읽기(speechSynthesis)
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
export const canListen = !!SR;
export const canSpeak = "speechSynthesis" in window;

// 카카오톡·인스타 같은 앱 안 브라우저
export const inAppBrowser = /KAKAOTALK|Instagram|FBAN|FBAV|NAVER\(inapp|Line\//i.test(navigator.userAgent);

let rec = null;
let mediaRec = null, chunks = [], lastAudioUrl = null, stream = null;

/**
 * 듣기 시작. handlers: onText(final, interim), onEnd(finalText, reason), onError(code)
 * 반환: stop() 함수
 */
export function listen({ onText, onEnd, onError, record = true }) {
  if (!SR) { onError?.("unsupported"); return () => {}; }
  stopListening();
  let finalText = "";
  let interim = "";
  let stoppedByUser = false;
  let ended = false;

  rec = new SR();
  rec.lang = "en-US";
  rec.interimResults = true;
  rec.continuous = true;
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
  rec.onerror = (e) => {
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
  if (record) startRecording();

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
function pickVoice() {
  if (!canSpeak) return null;
  const vs = speechSynthesis.getVoices().filter(v => /^en(-|_)/i.test(v.lang));
  const pref = ["Samantha", "Google US English", "Microsoft Aria", "Microsoft Jenny", "Ava", "Allison"];
  for (const p of pref) { const v = vs.find(v => v.name.includes(p)); if (v) return v; }
  return vs.find(v => /en-US/i.test(v.lang)) || vs[0] || null;
}
if (canSpeak) {
  voice = pickVoice();
  speechSynthesis.onvoiceschanged = () => { voice = pickVoice(); };
}
export function speak(text, rate = 0.9) {
  if (!canSpeak) return Promise.resolve();
  speechSynthesis.cancel();
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US"; u.rate = rate;
    if (voice) u.voice = voice;
    u.onend = u.onerror = () => resolve();
    speechSynthesis.speak(u);
  });
}
export function stopSpeaking() { if (canSpeak) speechSynthesis.cancel(); }
