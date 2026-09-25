import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { buildMech, disposeMech } from "./mechModel";
import type { AnchorKey, MechRig } from "./mechModel";
import type { CombatProfileSpec } from "./profiles";

// WebGL hangar bay for the Combat Profile screen: turntable, scan-line
// materialise transition between chassis, drag-to-orbit, scroll-to-zoom and
// weapon callouts projected onto an SVG overlay. Pure presentation — the
// screen component owns selection state and just tells the scene what to show.

export interface CalloutElements {
  svg: SVGSVGElement;
  tags: Record<AnchorKey, HTMLElement>;
}

export interface HangarScene {
  showProfile(profile: CombatProfileSpec): void;
  punchIn(): void;
  dispose(): void;
}

const CAM_DIST = 17;
const CALLOUT_ROWS: Record<AnchorKey, number> = { sensor: -110, ranged: -10, melee: 90 };
const SVG_NS = "http://www.w3.org/2000/svg";

function stripeTexture(repeat: number): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 32;
  const x = c.getContext("2d")!;
  x.fillStyle = "#15181b";
  x.fillRect(0, 0, 128, 32);
  x.fillStyle = "#c8901a";
  for (let i = -32; i < 160; i += 32) {
    x.beginPath();
    x.moveTo(i, 32);
    x.lineTo(i + 16, 32);
    x.lineTo(i + 32, 0);
    x.lineTo(i + 16, 0);
    x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.set(repeat, 1);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function textTexture(text: string, size: number): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 512;
  const x = c.getContext("2d")!;
  x.fillStyle = "#fff";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.font = `800 ${size}px "Saira Condensed", "Arial Narrow", sans-serif`;
  x.fillText(text, c.width / 2, c.height / 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const glow = (c: THREE.ColorRepresentation, intensity = 3) =>
  new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: intensity });

export function createHangarScene(
  canvas: HTMLCanvasElement,
  callouts: CalloutElements,
): HangarScene {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07090b);
  scene.fog = new THREE.Fog(0x07090b, 16, 44);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envMap;
  scene.environmentIntensity = 0.28;

  const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.1, 120);
  const lookAt = new THREE.Vector3(0, 2.4, 0);
  let camDist = CAM_DIST;
  let camDistTarget = CAM_DIST;

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(
    new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.42, 0.45, 0.92),
  );
  composer.addPass(new OutputPass());

  // ---- lights ----
  scene.add(new THREE.HemisphereLight(0x8fa3b5, 0x0a0c0e, 0.45));
  const key = new THREE.SpotLight(0xfff1dc, 420, 34, Math.PI / 7.5, 0.55, 1.4);
  key.position.set(3.5, 13, 6);
  key.target.position.set(0, 1.8, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0004;
  scene.add(key, key.target);
  const rim = new THREE.SpotLight(0xe25837, 260, 30, Math.PI / 6, 0.6, 1.4);
  rim.position.set(-5, 8, -7);
  rim.target.position.set(0, 2.4, 0);
  scene.add(rim, rim.target);
  const rim2 = new THREE.SpotLight(0x6fa8c8, 140, 30, Math.PI / 6, 0.6, 1.4);
  rim2.position.set(6, 5, -6);
  rim2.target.position.set(0, 2.4, 0);
  scene.add(rim2, rim2.target);
  const floorGlow = new THREE.PointLight(0xffb020, 3, 9, 2);
  floorGlow.position.set(0, 0.6, 3.8);
  scene.add(floorGlow);

  // ---- hangar floor ----
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(140, 140),
    new THREE.MeshStandardMaterial({ color: 0x0f1316, metalness: 0.55, roughness: 0.5 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const grid = new THREE.GridHelper(90, 90, 0x3b2c10, 0x1a2025);
  grid.position.y = 0.003;
  grid.material.transparent = true;
  grid.material.opacity = 0.55;
  scene.add(grid);

  const amberLine = new THREE.MeshBasicMaterial({ color: 0xffb020, transparent: true, opacity: 0.55 });
  const floorRing = new THREE.Mesh(new THREE.RingGeometry(4.1, 4.2, 96), amberLine);
  floorRing.rotation.x = -Math.PI / 2;
  floorRing.position.y = 0.006;
  scene.add(floorRing);
  for (const sx of [-1.9, 1.9]) {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 14), amberLine);
    l.rotation.x = -Math.PI / 2;
    l.position.set(sx, 0.006, 11);
    scene.add(l);
  }
  for (let i = 0; i < 6; i++) {
    // walkway chevrons
    const s = new THREE.Shape();
    s.moveTo(-0.6, 0);
    s.lineTo(0, -0.45);
    s.lineTo(0.6, 0);
    s.lineTo(0.6, 0.16);
    s.lineTo(0, -0.29);
    s.lineTo(-0.6, 0.16);
    const m = new THREE.Mesh(
      new THREE.ShapeGeometry(s),
      new THREE.MeshBasicMaterial({ color: 0xffb020, transparent: true, opacity: 0.25 - i * 0.03 }),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(0, 0.006, 5.2 + i * 1.3);
    scene.add(m);
  }

  // ---- turntable ----
  const turntable = new THREE.Group();
  scene.add(turntable);
  const plateTop = new THREE.MeshStandardMaterial({ color: 0x1c2227, metalness: 0.8, roughness: 0.35 });
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.7, 0.36, 72), [
    new THREE.MeshStandardMaterial({ map: stripeTexture(22), metalness: 0.4, roughness: 0.6 }),
    plateTop,
    plateTop,
  ]);
  plat.position.y = 0.18;
  plat.receiveShadow = true;
  plat.castShadow = true;
  scene.add(plat);
  const ringMat = glow(0xffb020, 4);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.3, 0.035, 8, 160), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.37;
  scene.add(ring);
  const ringInner = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.018, 6, 120), glow(0xffb020, 1.5));
  ringInner.rotation.x = -Math.PI / 2;
  ringInner.position.y = 0.37;
  turntable.add(ringInner);
  const tickLong = glow(0xffb020, 1.2);
  const tickShort = glow(0xffb020, 0.5);
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const long = i % 5 === 0;
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.01, long ? 0.36 : 0.16), long ? tickLong : tickShort);
    t.position.set(Math.sin(a) * 2.85, 0.37, Math.cos(a) * 2.85);
    t.rotation.y = a;
    turntable.add(t);
  }

  // ---- walls, pillars, strip lights ----
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x191e23, metalness: 0.6, roughness: 0.6 });
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x12161a, metalness: 0.7, roughness: 0.5 });
  const stripMat = glow(0x9fb6c8, 1.2);
  const beaconMat = glow(0xffb020, 5);
  const WALL_R = 18;
  const WALL_N = 14;
  const span = Math.PI * 1.25;
  for (let i = 0; i <= WALL_N; i++) {
    const th = -span / 2 + (i / WALL_N) * span;
    const p = new THREE.Mesh(new THREE.BoxGeometry(1.4, 18, 1.4), pillarMat);
    p.position.set(Math.sin(th) * WALL_R, 9, -Math.cos(th) * WALL_R);
    p.rotation.y = -th;
    scene.add(p);
    if (i % 3 === 1) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 0.3), beaconMat);
      b.position.set(Math.sin(th) * (WALL_R - 0.8), 6.5, -Math.cos(th) * (WALL_R - 0.8));
      scene.add(b);
    }
    if (i === WALL_N) break;
    const mid = th + span / WALL_N / 2;
    const w = 2 * WALL_R * Math.sin(span / WALL_N / 2) - 1.3;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 18, 0.4), wallMat);
    wall.position.set(Math.sin(mid) * (WALL_R + 0.4), 9, -Math.cos(mid) * (WALL_R + 0.4));
    wall.rotation.y = -mid;
    wall.receiveShadow = true;
    scene.add(wall);
    for (const y of [2.5, 8.5, 14]) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 0.07, 0.05), stripMat);
      s.position.set(Math.sin(mid) * (WALL_R + 0.15), y, -Math.cos(mid) * (WALL_R + 0.15));
      s.rotation.y = -mid;
      scene.add(s);
    }
  }
  // gantry
  for (const z of [-4, 3]) {
    const g = new THREE.Mesh(new THREE.BoxGeometry(34, 0.8, 0.8), pillarMat);
    g.position.set(0, 14, z);
    scene.add(g);
    const s = new THREE.Mesh(new THREE.BoxGeometry(30, 0.05, 0.2), glow(0xfff1dc, 2));
    s.position.set(0, 13.58, z);
    scene.add(s);
  }
  // light cone from the ceiling
  const cone = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 4.2, 13.4, 48, 1, true),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: { c: { value: new THREE.Color(0xffe2a8) } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
      fragmentShader: `uniform vec3 c; varying vec2 vUv; void main(){ float a = pow(vUv.y, 1.6) * .10 + .012; gl_FragColor = vec4(c, a); }`,
    }),
  );
  cone.position.set(0, 6.9, 0);
  scene.add(cone);

  // bay stencil on the back wall
  const bay = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 5),
    new THREE.MeshBasicMaterial({
      map: textTexture("BAY 04", 380),
      transparent: true,
      opacity: 0.05,
      color: 0xffb020,
      depthWrite: false,
    }),
  );
  bay.position.set(0, 9, -WALL_R + 0.2);
  scene.add(bay);

  // dust
  const DUST = 500;
  const dustGeo = new THREE.BufferGeometry();
  const dp = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) {
    dp[i * 3] = (Math.random() - 0.5) * 14;
    dp[i * 3 + 1] = Math.random() * 12;
    dp[i * 3 + 2] = (Math.random() - 0.5) * 14;
  }
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dp, 3));
  scene.add(
    new THREE.Points(
      dustGeo,
      new THREE.PointsMaterial({
        color: 0xffe0a0,
        size: 0.035,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    ),
  );

  // ---- materialise transition ----
  const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  const scanRing = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.025, 6, 96), glow(0xffb020, 6));
  scanRing.rotation.x = -Math.PI / 2;
  scanRing.visible = false;
  scene.add(scanRing);

  let mech: MechRig | null = null;
  let pending: CombatProfileSpec | null = null;
  let clipH = 0;
  let clipTarget = 0;
  const timers = new Set<number>();
  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
  };

  function swapMech(): void {
    if (mech) {
      turntable.remove(mech.root);
      disposeMech(mech);
    }
    mech = buildMech(pending!, clip);
    pending = null;
    turntable.add(mech.root);
    clipH = 0;
    clipTarget = mech.height;
  }

  // ---- orbit (drag) + zoom + parallax ----
  let yaw = -0.35;
  let yawVel = 0;
  let dragging = false;
  let lastX = 0;
  let idle = 0;
  let mx = 0;
  let my = 0;
  const onPointerDown = (e: PointerEvent) => {
    dragging = true;
    lastX = e.clientX;
    idle = 0;
  };
  const onPointerUp = () => {
    dragging = false;
  };
  const onPointerMove = (e: PointerEvent) => {
    mx = e.clientX / window.innerWidth - 0.5;
    my = e.clientY / window.innerHeight - 0.5;
    if (!dragging) return;
    yawVel = (e.clientX - lastX) * 0.006;
    lastX = e.clientX;
    idle = 0;
  };
  const onWheel = (e: WheelEvent) => {
    camDistTarget = THREE.MathUtils.clamp(camDistTarget + e.deltaY * 0.01, 10, 22);
  };
  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
  };
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("wheel", onWheel, { passive: true });
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("resize", onResize);

  // ---- callouts ----
  const calls = (Object.keys(CALLOUT_ROWS) as AnchorKey[]).map((k) => {
    const line = document.createElementNS(SVG_NS, "polyline");
    const dot = document.createElementNS(SVG_NS, "circle");
    dot.setAttribute("r", "3");
    callouts.svg.append(line, dot);
    return { k, line, dot, tag: callouts.tags[k] };
  });
  const projected = new THREE.Vector3();
  const world = new THREE.Vector3();
  function updateCallouts(): void {
    if (!mech) return;
    const W = window.innerWidth;
    const H = window.innerHeight;
    const cx = W / 2;
    // keep tags clear of the ident block (left) and stat panel (right)
    const minX = 480;
    const maxX = W - 410;
    for (const c of calls) {
      mech.anchors[c.k].getWorldPosition(world);
      projected.copy(world).project(camera);
      const x = ((projected.x + 1) / 2) * W;
      const y = ((1 - projected.y) / 2) * H;
      const visible = !pending && clipH > world.y + 0.2 && W > 1100;
      const side = x < cx ? -1 : 1;
      const w = c.tag.offsetWidth;
      const tx = side < 0 ? Math.max(minX + w, x - 150) : Math.min(maxX - w, x + 150);
      const ty = y + CALLOUT_ROWS[c.k] * 0.4;
      c.line.setAttribute("points", `${x},${y} ${tx - side * 30},${ty} ${tx},${ty}`);
      c.dot.setAttribute("cx", String(x));
      c.dot.setAttribute("cy", String(y));
      c.tag.style.transform = `translate(${side < 0 ? tx - w : tx}px, ${ty - 22}px)`;
      const o = visible ? 1 : 0;
      c.tag.style.opacity = String(o);
      c.line.style.opacity = String(o * 0.8);
      c.dot.style.opacity = String(o);
    }
  }

  // ---- loop ----
  const clock = new THREE.Clock();
  let frame = 0;
  function tick(): void {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    // dematerialise → swap → materialise
    if (pending && clipH <= 0.05) swapMech();
    const speed = pending ? 14 : 4.2;
    clipH += Math.sign(clipTarget - clipH) * Math.min(Math.abs(clipTarget - clipH), speed * dt);
    clip.constant = clipH;
    scanRing.visible = mech !== null && Math.abs(clipTarget - clipH) > 0.02;
    scanRing.position.y = clipH;
    scanRing.scale.setScalar(1 + Math.sin(t * 20) * 0.02);

    // turntable drifts back to a slow sway when idle
    if (!dragging) {
      yawVel *= 0.94;
      idle += dt;
      if (idle > 2.5) yaw += (Math.sin(t * 0.22) * 0.7 - yaw) * dt * 0.6;
    }
    yaw += yawVel;
    turntable.rotation.y = yaw;

    // idle life
    if (mech) {
      mech.torso.position.y = mech.torsoBaseY + Math.sin(t * 1.7) * 0.025;
      mech.head.rotation.y = Math.sin(t * 0.6) * 0.3;
      mech.arms.right.arm.rotation.x = Math.sin(t * 1.7) * 0.03;
      mech.arms.left.arm.rotation.x = -Math.sin(t * 1.7) * 0.03;
      mech.lit.emissiveIntensity = 3 + Math.sin(t * 3) * 0.5;
    }

    camDist += (camDistTarget - camDist) * Math.min(1, dt * 3);
    camera.position.set(
      Math.sin(mx * 0.25) * camDist + mx * 1.2,
      3.3 - my * 1.2,
      Math.cos(mx * 0.25) * camDist,
    );
    camera.lookAt(lookAt);

    const pos = dustGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < DUST; i++) {
      let y = pos.getY(i) + dt * 0.12;
      if (y > 12) y = 0;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;

    ringMat.emissiveIntensity = 2.2 + Math.sin(t * 2) * 0.5;
    composer.render();
    updateCallouts();
    frame = requestAnimationFrame(tick);
  }
  frame = requestAnimationFrame(tick);

  return {
    showProfile(profile) {
      pending = profile;
      clipTarget = 0;
      rim.color.set(profile.accent);
      camDistTarget = CAM_DIST - 1;
      later(() => (camDistTarget = CAM_DIST), 450);
    },
    punchIn() {
      camDistTarget = 11;
      later(() => (camDistTarget = CAM_DIST), 2600);
    },
    dispose() {
      cancelAnimationFrame(frame);
      for (const id of timers) window.clearTimeout(id);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("wheel", onWheel);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", onResize);
      for (const c of calls) {
        c.line.remove();
        c.dot.remove();
      }
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Points) {
          o.geometry.dispose();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of mats as THREE.Material[]) {
            if ("map" in m && m.map instanceof THREE.Texture) m.map.dispose();
            m.dispose();
          }
        }
      });
      envMap.dispose();
      pmrem.dispose();
      composer.dispose();
      renderer.dispose();
    },
  };
}
