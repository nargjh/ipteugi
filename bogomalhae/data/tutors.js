/* 보고말해 AI 튜터 — 우리가 그린 캐릭터(SVG) · 말할 때 입이 움직이고 눈을 깜빡인다
   voice: 브라우저 영어 목소리 고를 때 쓰는 낱말(이름에 들어 있으면 우선) */
window.TUTORS = [
  { id: "mina", name: "Mina", flag: "🇺🇸", accent: "미국식", age: "20대", desc: "다정하고 천천히 말해 주는 튜터. 처음이라면 미나!",
    tts: "en-US-AvaNeural", voice: ["Aria", "Jenny", "Samantha", "Google US English", "Zira"], pitch: 1.08, rate: 1.0,
    skin: "#f6d3b8", hair: "#2b1d1a", hairStyle: "bob", shirt: "#ff6a3d", bg: ["#ffe2d3", "#ffd0b8"], eye: "#3a2a22" },
  { id: "oliver", name: "Oliver", flag: "🇬🇧", accent: "영국식", age: "30대", desc: "위트 있는 런던 토박이. 여행·카페 이야기를 좋아해요.",
    tts: "en-GB-RyanNeural", voice: ["Ryan", "Daniel", "Google UK English Male", "George", "Libby"], pitch: 0.95, rate: 1.0,
    skin: "#e9c09d", hair: "#8a5a2b", hairStyle: "short", shirt: "#3d6cff", bg: ["#dbe5ff", "#c6d5ff"], eye: "#2d3a52", beard: true },
  { id: "sophie", name: "Sophie", flag: "🇦🇺", accent: "호주식", age: "20대", desc: "밝고 수다스러운 여행 덕후. 스몰토크 연습 상대로 딱!",
    tts: "en-AU-NatashaNeural", voice: ["Natasha", "Karen", "Google UK English Female", "Hazel", "Susan"], pitch: 1.12, rate: 1.0,
    skin: "#fbe0c8", hair: "#e08a3a", hairStyle: "long", shirt: "#14b86a", bg: ["#dff7ea", "#c8f0da"], eye: "#2f5a3a" },
];

/* 튜터 그림 (viewBox 0 0 300 360) — #mouth 가 말할 때 열리고, #lids 가 깜빡임 */
window.tutorSVG = function (t) {
  const hair = {
    bob: `<path d="M78 150 Q70 60 150 52 Q230 60 222 150 L222 205 Q205 180 200 135 Q150 120 100 135 Q95 180 78 205 Z" fill="${t.hair}"/>`,
    short: `<path d="M86 140 Q84 66 150 60 Q218 66 214 140 Q206 104 182 96 Q150 112 116 98 Q94 108 86 140 Z" fill="${t.hair}"/>`,
    long: `<path d="M74 160 Q66 58 150 50 Q234 58 226 160 L236 300 Q214 270 206 150 Q150 118 94 150 Q86 270 64 300 Z" fill="${t.hair}"/>`,
  }[t.hairStyle];
  const back = t.hairStyle === "long" ? `<path d="M80 150 Q60 260 70 310 L230 310 Q240 260 220 150 Z" fill="${t.hair}" opacity=".9"/>` : "";
  return `<svg viewBox="0 0 300 360" xmlns="http://www.w3.org/2000/svg" class="tsvg">
  <defs><linearGradient id="bg-${t.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.bg[0]}"/><stop offset="1" stop-color="${t.bg[1]}"/></linearGradient></defs>
  <rect width="300" height="360" fill="url(#bg-${t.id})"/>
  ${back}
  <path d="M40 360 Q50 270 150 262 Q250 270 260 360 Z" fill="${t.shirt}"/>
  <rect x="130" y="222" width="40" height="46" rx="14" fill="${t.skin}"/>
  <ellipse cx="150" cy="160" rx="72" ry="84" fill="${t.skin}"/>
  <ellipse cx="80" cy="168" rx="12" ry="18" fill="${t.skin}"/><ellipse cx="220" cy="168" rx="12" ry="18" fill="${t.skin}"/>
  ${hair}
  <g class="eyes">
    <ellipse cx="122" cy="160" rx="9" ry="11" fill="${t.eye}"/><ellipse cx="178" cy="160" rx="9" ry="11" fill="${t.eye}"/>
    <circle cx="125" cy="156" r="3" fill="#fff"/><circle cx="181" cy="156" r="3" fill="#fff"/>
    <g class="lids"><rect x="110" y="146" width="24" height="0" fill="${t.skin}"/><rect x="166" y="146" width="24" height="0" fill="${t.skin}"/></g>
  </g>
  <path d="M108 136 Q122 128 136 135" stroke="${t.hair}" stroke-width="5" fill="none" stroke-linecap="round" class="brow"/>
  <path d="M164 135 Q178 128 192 136" stroke="${t.hair}" stroke-width="5" fill="none" stroke-linecap="round" class="brow"/>
  <circle cx="106" cy="190" r="11" fill="#ff8f8f" opacity=".25"/><circle cx="194" cy="190" r="11" fill="#ff8f8f" opacity=".25"/>
  <path d="M146 172 Q150 186 156 182" stroke="#c99a7a" stroke-width="3" fill="none" stroke-linecap="round"/>
  ${t.beard ? `<path d="M96 190 Q102 246 150 250 Q198 246 204 190 Q190 226 150 228 Q110 226 96 190 Z" fill="${t.hair}" opacity=".55"/>` : ""}
  <g class="mouth-g" transform="translate(150 208)">
    <ellipse class="mouth" cx="0" cy="0" rx="17" ry="3" fill="#8a3b3b"/>
    <path class="smile" d="M-20 -4 Q0 12 20 -4" stroke="#8a3b3b" stroke-width="4" fill="none" stroke-linecap="round"/>
  </g>
</svg>`;
};
