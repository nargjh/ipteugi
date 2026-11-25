/* 보고말해 3D 튜터 — VRM 캐릭터를 띄우고 목소리에 맞춰 입·눈·고개를 움직인다 (three.js + three-vrm, 무료)
   window.VRM3D.mount(el, url) · .mouth(vol 0~30) · .stop() */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

let cur = null; // { renderer, scene, camera, vrm, raf, ro, el }
const cache = new Map(); // url → gltf 로드 약속 (같은 튜터 다시 열 때 빠르게)

function load(url) {
  if (!cache.has(url)) {
    const loader = new GLTFLoader();
    loader.register((p) => new VRMLoaderPlugin(p));
    cache.set(url, loader.loadAsync(url));
  }
  return cache.get(url);
}

async function mount(el, url) {
  stop();
  const me = { el, mouthTarget: 0, mouth: 0, vowel: "aa", nextBlink: 1.5, blinkT: -1, t: 0, alive: true };
  cur = me;
  el.innerHTML = `<div class="t3d-load">3D 튜터 불러오는 중…</div>`;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 20);
  const light = new THREE.DirectionalLight(0xffffff, 2.2); light.position.set(0.6, 1.4, 1.6); scene.add(light);
  scene.add(new THREE.AmbientLight(0xffffff, 1.1));
  Object.assign(me, { renderer, scene, camera });

  let gltf;
  try { gltf = await load(url); } catch (e) { el.innerHTML = `<div class="t3d-load">3D 튜터를 못 불러왔어요</div>`; throw e; }
  if (!me.alive) return;
  // 같은 gltf 를 두 번 붙이지 않게: 캐시는 한 번 쓰면 새로 불러오도록 비움
  cache.delete(url);
  const vrm = gltf.userData.vrm;
  VRMUtils.removeUnnecessaryVertices(gltf.scene);
  if (VRMUtils.combineSkeletons) VRMUtils.combineSkeletons(gltf.scene);
  VRMUtils.rotateVRM0(vrm);
  vrm.scene.traverse((o) => { o.frustumCulled = false; });
  scene.add(vrm.scene);
  me.vrm = vrm;

  // 팔 내리기 (T자 → 차렷)
  const H = vrm.humanoid;
  const bone = (n) => H.getNormalizedBoneNode(n);
  bone("leftUpperArm") && (bone("leftUpperArm").rotation.z = 1.22);
  bone("rightUpperArm") && (bone("rightUpperArm").rotation.z = -1.22);
  bone("leftLowerArm") && (bone("leftLowerArm").rotation.z = 0.12);
  bone("rightLowerArm") && (bone("rightLowerArm").rotation.z = -0.12);
  vrm.update(0);

  // 카메라: 얼굴~가슴이 화면 위쪽에 오게
  const head = new THREE.Vector3();
  bone("head").getWorldPosition(head);
  me.head = head.clone();
  if (vrm.lookAt) vrm.lookAt.target = camera;

  el.innerHTML = "";
  el.appendChild(renderer.domElement);
  const fit = () => {
    const w = el.clientWidth || 300, h = el.clientHeight || 400;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = "100%"; renderer.domElement.style.height = "100%";
    camera.aspect = w / h;
    const tall = h / w > 1.1; // 통화(세로) · 채팅(가로)
    const dist = tall ? 1.6 : 0.95;
    camera.position.set(0, me.head.y - (tall ? 0.06 : 0.0), dist);
    camera.lookAt(0, me.head.y - (tall ? 0.13 : 0.02), 0);
    camera.updateProjectionMatrix();
  };
  fit();
  me.ro = new ResizeObserver(fit); me.ro.observe(el);

  const clock = new THREE.Clock();
  const E = vrm.expressionManager;
  const loop = () => {
    if (!me.alive) return;
    me.raf = requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05); me.t += dt;
    // 숨쉬기·고개 살짝
    const sp = bone("spine"), nk = bone("neck"), hd = bone("head");
    if (sp) sp.rotation.x = Math.sin(me.t * 1.6) * 0.012;
    if (hd) { hd.rotation.y = Math.sin(me.t * 0.5) * 0.06; hd.rotation.x = Math.sin(me.t * 0.7) * 0.025 + (me.mouth > 0.1 ? Math.sin(me.t * 6) * 0.012 : 0); }
    if (nk) nk.rotation.z = Math.sin(me.t * 0.4) * 0.02;
    // 눈 깜빡임
    if (E) {
      me.nextBlink -= dt;
      if (me.nextBlink <= 0 && me.blinkT < 0) { me.blinkT = 0; me.nextBlink = 2.5 + Math.random() * 3; }
      let b = 0;
      if (me.blinkT >= 0) { me.blinkT += dt; const p = me.blinkT / 0.16; b = p < 0.5 ? p * 2 : Math.max(0, 2 - p * 2); if (p >= 1) me.blinkT = -1; }
      E.setValue("blink", b);
      // 입: 소리 크기 → 입 벌림, 모음은 가끔 바꿔 자연스럽게
      me.mouth += (me.mouthTarget - me.mouth) * Math.min(1, dt * 18);
      if (Math.random() < dt * 6) me.vowel = ["aa", "aa", "oh", "ih", "ee", "ou"][Math.floor(Math.random() * 6)];
      for (const v of ["aa", "ih", "ou", "ee", "oh"]) E.setValue(v, v === me.vowel ? me.mouth : me.mouth * 0.15);
      E.setValue("relaxed", 0.25);
    }
    vrm.update(dt);
    renderer.render(scene, camera);
  };
  loop();
}

function mouth(vol) {
  if (!cur) return;
  cur.mouthTarget = Math.max(0, Math.min(1, (vol - 1.5) / 14));
}

function stop() {
  if (!cur) return;
  const me = cur; cur = null; me.alive = false;
  cancelAnimationFrame(me.raf);
  me.ro?.disconnect();
  if (me.vrm) { me.scene.remove(me.vrm.scene); VRMUtils.deepDispose(me.vrm.scene); }
  me.renderer?.dispose();
  me.renderer?.domElement?.remove();
}

window.VRM3D = { mount, mouth, stop, active: () => !!cur };
