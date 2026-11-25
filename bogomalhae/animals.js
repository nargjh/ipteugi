/* 보고말해 — 귀여운 동물 튜터 (미나=여우 · 올리버=곰 · 소피=코알라)
   만화 그림이라 눈은 위아래로 납작해지며 감고(.aeye.shut), 입(.mouth ellipse ry)은 소리 크기만큼 열린다.
   viewBox 0 0 300 360 · class tsvg (사람 SVG 와 같은 자리에 들어감) */
(function () {
  const eye = (cx, cy, r = 13) => `<g class="aeye"><ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r * 1.18}" fill="#2a1d1a"/>
    <circle cx="${cx + r * 0.32}" cy="${cy - r * 0.42}" r="${r * 0.38}" fill="#fff"/><circle cx="${cx - r * 0.35}" cy="${cy + r * 0.4}" r="${r * 0.15}" fill="#fff" opacity=".8"/></g>`;
  const mouth = (y, tongue = "#ff8a8a") => `<g class="mouth-g" transform="translate(150 ${y})">
    <ellipse class="mouth" cx="0" cy="0" rx="13" ry="3" fill="#6b2a2e"/>
    <path class="smile" d="M-14 -3 Q-7 6 0 -1 Q7 6 14 -3" stroke="#4a2a22" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  const blush = (y) => `<ellipse cx="92" cy="${y}" rx="15" ry="9" fill="#ff7b8a" opacity=".35"/><ellipse cx="208" cy="${y}" rx="15" ry="9" fill="#ff7b8a" opacity=".35"/>`;
  const bg = (id, a, b) => `<defs><radialGradient id="abg-${id}" cx=".5" cy=".38" r=".75"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient></defs>
    <rect width="300" height="360" fill="url(#abg-${id})"/>`;

  const FOX = `${bg("fox", "#fff4ea", "#ffd8bf")}
    <g class="abody"><path d="M104 214 Q150 232 196 214 L206 282 Q150 296 94 282 Z" fill="#ff8a3d"/><path d="M62 360 Q66 262 150 254 Q234 262 238 360 Z" fill="#ff8a3d"/>
      <path d="M112 360 Q116 284 150 278 Q184 284 188 360 Z" fill="#fff8f0"/>
      <path d="M128 262 L150 290 L172 262 Q150 272 128 262 Z" fill="#ff6a3d"/></g>
    <g class="ahead">
      <g class="aear-l"><path d="M70 120 L62 28 Q100 46 128 92 Z" fill="#ff8a3d"/><path d="M80 108 L76 52 Q98 66 114 94 Z" fill="#4a2a22"/></g>
      <g class="aear-r"><path d="M230 120 L238 28 Q200 46 172 92 Z" fill="#ff8a3d"/><path d="M220 108 L224 52 Q202 66 186 94 Z" fill="#4a2a22"/></g>
      <path d="M150 74 Q246 74 252 168 Q256 236 150 250 Q44 236 48 168 Q54 74 150 74 Z" fill="#ff8a3d"/>
      <path d="M150 170 Q120 142 62 176 Q74 238 150 248 Q226 238 238 176 Q180 142 150 170 Z" fill="#fff8f0"/>
      <path d="M150 74 Q140 100 150 118 Q160 100 150 74 Z" fill="#ffa766"/>
      ${eye(112, 160)}${eye(188, 160)}
      ${blush(194)}
      <path d="M140 186 Q150 180 160 186 Q158 196 150 198 Q142 196 140 186 Z" fill="#2a1d1a"/>
      ${mouth(210)}
    </g>`;

  const BEAR = `${bg("bear", "#eef3ff", "#cfdcff")}
    <g class="abody"><path d="M104 214 Q150 232 196 214 L206 282 Q150 296 94 282 Z" fill="#a8744a"/><path d="M60 360 Q64 262 150 254 Q236 262 240 360 Z" fill="#a8744a"/>
      <path d="M118 360 Q120 290 150 286 Q180 290 182 360 Z" fill="#e8cfae"/>
      <g transform="translate(150 270)"><path d="M0 0 L-26 -12 L-26 12 Z M0 0 L26 -12 L26 12 Z" fill="#3d6cff"/><circle r="6" fill="#2d54d8"/></g></g>
    <g class="ahead">
      <g class="aear-l"><circle cx="76" cy="84" r="34" fill="#a8744a"/><circle cx="76" cy="84" r="19" fill="#e8b98e"/></g>
      <g class="aear-r"><circle cx="224" cy="84" r="34" fill="#a8744a"/><circle cx="224" cy="84" r="19" fill="#e8b98e"/></g>
      <ellipse cx="150" cy="162" rx="104" ry="92" fill="#a8744a"/>
      <ellipse cx="150" cy="200" rx="46" ry="36" fill="#ecd4b4"/>
      ${eye(110, 152, 12)}${eye(190, 152, 12)}
      ${blush(184)}
      <ellipse cx="150" cy="184" rx="15" ry="10" fill="#3a2420"/><ellipse cx="146" cy="181" rx="5" ry="3" fill="#fff" opacity=".5"/>
      ${mouth(208)}
    </g>`;

  const KOALA = `${bg("koala", "#effbf3", "#c9f0d8")}
    <g class="abody"><path d="M104 214 Q150 232 196 214 L206 282 Q150 296 94 282 Z" fill="#9aa3ad"/><path d="M60 360 Q64 262 150 254 Q236 262 240 360 Z" fill="#9aa3ad"/>
      <path d="M116 360 Q118 290 150 284 Q182 290 184 360 Z" fill="#eef0f2"/></g>
    <g class="ahead">
      <g class="aear-l"><circle cx="62" cy="110" r="46" fill="#9aa3ad"/><circle cx="66" cy="112" r="28" fill="#f3f4f6"/></g>
      <g class="aear-r"><circle cx="238" cy="110" r="46" fill="#9aa3ad"/><circle cx="234" cy="112" r="28" fill="#f3f4f6"/></g>
      <ellipse cx="150" cy="166" rx="96" ry="88" fill="#a9b1ba"/>
      <ellipse cx="150" cy="214" rx="50" ry="30" fill="#c3c9cf"/>
      ${eye(110, 158, 11)}${eye(190, 158, 11)}
      ${blush(196)}
      <path d="M132 168 Q150 160 168 168 Q172 196 150 202 Q128 196 132 168 Z" fill="#3a3436"/><ellipse cx="143" cy="174" rx="5" ry="7" fill="#fff" opacity=".35"/>
      ${mouth(220)}
      <g transform="translate(205 92) rotate(18)"><circle r="9" fill="#ffd34d"/><circle cx="0" cy="-13" r="9" fill="#ff9ec0"/><circle cx="12" cy="-4" r="9" fill="#ff9ec0"/><circle cx="8" cy="10" r="9" fill="#ff9ec0"/><circle cx="-8" cy="10" r="9" fill="#ff9ec0"/><circle cx="-12" cy="-4" r="9" fill="#ff9ec0"/><circle r="7" fill="#ffd34d"/></g>
    </g>`;

  const ART = { mina: FOX, oliver: BEAR, sophie: KOALA };
  window.ANIMAL_NAME = { mina: "여우", oliver: "곰", sophie: "코알라" };
  window.animalSVG = (t) => `<svg viewBox="0 0 300 360" xmlns="http://www.w3.org/2000/svg" class="tsvg animal a-${t.id}">${ART[t.id] || FOX}</svg>`;

  // 깜빡임: 동물마다 따로 2.5~5.5초 · 가끔 두 번
  function blinkLoop() {
    document.querySelectorAll(".animal").forEach((svg) => {
      if (svg._next && performance.now() < svg._next) return;
      const twice = Math.random() < 0.2;
      svg._next = performance.now() + 2500 + Math.random() * 3000;
      const shut = (d) => setTimeout(() => { svg.querySelectorAll(".aeye").forEach((e) => e.classList.add("shut")); setTimeout(() => svg.querySelectorAll(".aeye").forEach((e) => e.classList.remove("shut")), 110); }, d);
      shut(0); if (twice) shut(260);
    });
  }
  setInterval(blinkLoop, 200);
})();
