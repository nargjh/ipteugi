// 코칭 캐릭터 — 판다 (사용자가 고른 그림)
// 그림은 한 장, 기분은 움직임으로: happy(살랑) · cheer(통통+반짝) · think(갸웃) · oops(흔들) · listen(귀 기울임)
const IMG = { main: "assets/char/panda.png", listen: "assets/char/panda.png" };

export function mascot(mood = "happy", size = 72, cls = "") {
  const src = mood === "listen" ? IMG.listen : IMG.main;
  const sparkle = mood === "cheer"
    ? `<i class="spk s1">✦</i><i class="spk s2">✦</i><i class="spk s3">✧</i>` : "";
  const q = mood === "think" ? `<i class="qm">?</i>` : mood === "oops" ? `<i class="qm drop">💧</i>` : "";
  return `<span class="mascot ${cls} mood-${mood}" style="--sz:${size}px" aria-hidden="true">
    <img src="${src}" alt="" width="${size}" height="${size}" decoding="async">${sparkle}${q}</span>`;
}

/** 캐릭터 + 말풍선. tone: good|mid|bad|"" */
export function coach(mood, title, sub = "", tone = "", size = 64) {
  return `<div class="coach ${tone}" role="status">
    ${mascot(mood, size)}
    <div class="bubble"><b>${title}</b>${sub ? `<span>${sub}</span>` : ""}</div>
  </div>`;
}
