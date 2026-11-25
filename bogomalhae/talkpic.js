/* 보고말해 — 그림(순정만화·실사) 튜터가 말하게: 입 자리를 알고, 목소리 크기만큼 아랫입술·턱을 내리고 입 안을 그린다
   window.TalkPic.mount(canvas, src, [입가운데x, 입선y, 입너비, 턱y]) · .mouth(vol) · .stop() · .active() */
(function () {
  // 그림마다 입 자리 (그림 원본 픽셀 · tools 로 잰 값)
  const MOUTH = {
    mina_manga: [316, 302, 52, 347], mina_real: [348, 342, 73, 397],
    oliver_manga: [230, 325, 60, 380], oliver_real: [327, 381, 65, 455],
    sophie_manga: [322, 384, 65, 437], sophie_real: [288, 279, 73, 335],
  };
  // 그림마다 두 눈 자리 [가운데x, 가운데y, 너비, 높이, (1=눈 위가 머리카락 → 볼 살로 덮기)]
  const EYES = {
    mina_manga: [[281, 212, 38, 14, 1], [368, 220, 38, 14]], mina_real: [[307, 242, 50, 20], [410, 248, 40, 16]],
    oliver_manga: [[162, 242, 26, 11], [253, 218, 34, 13]], oliver_real: [[260, 273, 38, 13], [360, 272, 42, 13]],
    sophie_manga: [[259, 301, 46, 21], [367, 298, 50, 19]], sophie_real: [[255, 197, 36, 13], [337, 207, 32, 12]],
  };
  let cur = null;

  function mount(canvas, key) {
    stop();
    const m = MOUTH[key];
    const img = new Image();
    const me = { canvas, ctx: canvas.getContext("2d"), img, m, eyes: EYES[key] || [], a: 0, target: 0, t: 0, alive: true,
      blink: 0, blinkT: -1, nextBlink: 1.2 + Math.random() * 2, twice: false };
    cur = me;
    img.onload = () => {
      if (!me.alive) return;
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      draw(me);
      let last = performance.now();
      const loop = (now) => {
        if (!me.alive) return;
        const dt = Math.min(0.05, (now - last) / 1000); last = now; me.t += dt;
        me.a += (me.target - me.a) * Math.min(1, dt * (me.target > me.a ? 14 : 10));  // 부드럽게 열고 닫음
        // 눈 깜빡임: 2.5~6초마다 0.16초 · 가끔 두 번
        me.nextBlink -= dt;
        if (me.nextBlink <= 0 && me.blinkT < 0) {
          me.blinkT = 0;
          if (me.twice) { me.twice = false; me.nextBlink = 2.5 + Math.random() * 3.5; }
          else if (Math.random() < 0.2) { me.twice = true; me.nextBlink = 0.28; }
          else me.nextBlink = 2.5 + Math.random() * 3.5;
        }
        if (me.blinkT >= 0) {
          me.blinkT += dt; const p = me.blinkT / 0.17;
          me.blink = p < 0.45 ? p / 0.45 : Math.max(0, 1 - (p - 0.45) / 0.55);
          if (p >= 1) { me.blinkT = -1; me.blink = 0; }
        }
        draw(me);
        // 숨쉬기: 아주 살짝 커졌다 작아짐
        canvas.style.transform = `translateX(-50%) scale(${1 + Math.sin(me.t * 1.7) * 0.003})`;
        me.raf = requestAnimationFrame(loop);
      };
      me.raf = requestAnimationFrame(loop);
    };
    img.src = `img/tutors/${key}.jpg`;
  }

  function draw(me) {
    const { ctx, img, m } = me;
    const [cx, cy, w, chin] = m;
    ctx.drawImage(img, 0, 0);
    if (me.blink > 0.02) me.eyes.forEach((e) => lid(ctx, img, e, me.blink));
    const a = me.a;
    if (!m || a < 0.03) return;
    const g = a * w * 0.2;                // 입이 벌어지는 높이(px) · 살짝만
    const W = w * 0.62;                   // 입이 벌어지는 반폭
    const L = cx - w * 0.46, R = cx + w * 0.46;
    // 입 안: 입꼬리에서 모이는 렌즈 모양(위는 거의 평평 · 아래는 둥글게)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(L, cy);
    ctx.quadraticCurveTo(cx, cy - g * 0.12, R, cy);
    ctx.quadraticCurveTo(cx, cy + g * 2.0, L, cy);
    ctx.closePath();
    ctx.clip();
    // 입 안은 진한 검정 대신 입술빛이 도는 어두운 색 · 가장자리는 옅게 (그림에 녹아들게)
    const gr = ctx.createRadialGradient(cx, cy + g * 0.5, 1, cx, cy + g * 0.5, w * 0.5);
    gr.addColorStop(0, "rgba(92,38,42,.92)"); gr.addColorStop(0.6, "rgba(130,62,66,.8)"); gr.addColorStop(1, "rgba(170,95,95,.45)");
    ctx.fillStyle = gr; ctx.fillRect(L - 2, cy - g, R - L + 4, g * 3);
    if (g > 4) { // 윗니: 아주 옅게
      ctx.fillStyle = `rgba(240,232,226,${Math.min(0.55, (g - 4) * 0.15)})`;
      ctx.beginPath(); ctx.ellipse(cx, cy, w * 0.2, Math.min(g * 0.25, 3), 0, 0, Math.PI); ctx.fill();
    }
    ctx.restore();
    // 아랫입술~턱을 아래로 (가운데일수록 많이, 턱 끝은 제자리)
    const H = chin - cy;
    for (let x = Math.floor(cx - W * 1.25); x <= Math.ceil(cx + W * 1.25); x++) {
      const u = (x - cx) / (W * 1.25);
      if (Math.abs(u) >= 1) continue;
      const f = 0.5 * (1 + Math.cos(Math.PI * u));
      const d = g * f;
      if (d < 0.3) continue;
      ctx.drawImage(img, x, cy, 1, H, x, cy + d, 1, H - d);
    }
  }

  // 눈꺼풀: 윗눈꺼풀(살 + 윗속눈썹 줄)을 세로로 늘려 아래로 내림 → c=1 이면 눈을 다 덮고 속눈썹이 감은 선이 됨
  function lid(ctx, img, [x, y, w, h, below], c) {
    const hw = w * 0.6, t = Math.max(1.5, h * 0.13);
    const top = y - h * 0.95;
    for (let px = Math.floor(x - hw); px <= Math.ceil(x + hw); px++) {
      const u = (px - x) / hw; if (Math.abs(u) >= 1) continue;
      const lash = y - h * 0.5 * Math.sqrt(1 - u * u);   // 지금 윗속눈썹 줄
      const shut = y + h * 0.5 * (1 - u * u * 0.7);      // 감았을 때 선
      const nw = lash + (shut - lash) * c;
      if (nw - lash < 0.3) continue;
      if (below) ctx.drawImage(img, px, y + h * 0.55, 1, (nw - lash) * 0.6, px, lash, 1, nw - lash);  // 눈 위가 머리카락이면 바로 아래 살로 덮음
      else ctx.drawImage(img, px, top, 1, lash - top, px, top, 1, nw - top);   // 눈꺼풀 살만 늘림
      ctx.drawImage(img, px, lash, 1, t, px, nw, 1, t);                    // 속눈썹 줄은 두께 그대로
      if (below) { ctx.fillStyle = `rgba(80,40,35,${0.22 * c})`; ctx.fillRect(px, lash, 1, nw - lash); }
    }
  }

  function mouth(vol) { if (cur) cur.target = Math.max(0, Math.min(1, (vol - 2) / 16)) * 0.75; }  // 크게 소리쳐도 75%까지만
  function stop() { if (!cur) return; cur.alive = false; cancelAnimationFrame(cur.raf); cur = null; }
  window.TalkPic = { mount, mouth, stop, active: () => !!cur, MOUTH, EYES, _draw: draw, _lid: lid };
})();
