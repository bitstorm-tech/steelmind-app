import type { CombatProfileSpec, ProfileId } from "./profiles";

// Renderer-neutral parts of the hangar bay: scene interface, callout overlay,
// orbit input and mech proportions. Nothing in here may import Three.js, so
// the 3D code stays confined to hangarScene.ts and mechModel.ts.

export type AnchorKey = "melee" | "ranged" | "sensor";

export interface CalloutElements {
  svg: SVGSVGElement;
  tags: Record<AnchorKey, HTMLElement>;
}

export interface HangarScene {
  showProfile(profile: CombatProfileSpec): void;
  punchIn(): void;
  dispose(): void;
}

export const CAM_DIST = 17;

// Procedural low-poly mech proportions per Combat Profile. Presentation only —
// they visualize mass/mobility, not engine data.
export interface MechShape {
  legW: number;
  thigh: number;
  shin: number;
  hipW: number;
  torsoW: number;
  torsoH: number;
  torsoD: number;
  headW: number;
  headH: number;
  headD: number;
  headZ: number;
  shoulder: number;
  arm: number;
  armT: number;
}

export const MECH_SHAPES: Record<ProfileId, MechShape> = {
  BRAWLER: { legW: 0.62, thigh: 1.0, shin: 1.05, hipW: 1.25, torsoW: 2.2, torsoH: 1.5, torsoD: 1.5, headW: 0.6, headH: 0.42, headD: 0.6, headZ: 0.35, shoulder: 0.95, arm: 0.8, armT: 1.45 },
  ASSAULT: { legW: 0.5, thigh: 1.15, shin: 1.2, hipW: 1.05, torsoW: 1.75, torsoH: 1.35, torsoD: 1.2, headW: 0.6, headH: 0.5, headD: 0.65, headZ: 0.2, shoulder: 0.75, arm: 0.9, armT: 1.15 },
  SKIRMISHER: { legW: 0.36, thigh: 1.35, shin: 1.45, hipW: 0.9, torsoW: 1.3, torsoH: 1.05, torsoD: 1.0, headW: 0.55, headH: 0.36, headD: 0.75, headZ: 0.35, shoulder: 0.55, arm: 0.85, armT: 0.9 },
};

export function stripeCanvas(): HTMLCanvasElement {
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
  return c;
}

export function textCanvas(text: string, size: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 512;
  const x = c.getContext("2d")!;
  x.fillStyle = "#fff";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.font = `800 ${size}px "Saira Condensed", "Arial Narrow", sans-serif`;
  x.fillText(text, c.width / 2, c.height / 2);
  return c;
}

const CALLOUT_ROWS: Record<AnchorKey, number> = { sensor: -110, ranged: -10, melee: 90 };
const SVG_NS = "http://www.w3.org/2000/svg";

export interface ProjectedAnchor {
  // CSS pixels relative to the viewport
  x: number;
  y: number;
  // world-space height, used to hide tags below the materialise scan line
  worldY: number;
}

export interface CalloutOverlay {
  update(project: (k: AnchorKey) => ProjectedAnchor, visible: (worldY: number) => boolean): void;
  dispose(): void;
}

// Weapon callouts drawn on an SVG overlay, anchored to projected mech
// hardpoints. The engine only has to supply the projection.
export function createCalloutOverlay(callouts: CalloutElements): CalloutOverlay {
  const calls = (Object.keys(CALLOUT_ROWS) as AnchorKey[]).map((k) => {
    const line = document.createElementNS(SVG_NS, "polyline");
    const dot = document.createElementNS(SVG_NS, "circle");
    dot.setAttribute("r", "3");
    callouts.svg.append(line, dot);
    return { k, line, dot, tag: callouts.tags[k] };
  });
  return {
    update(project, visible) {
      const W = window.innerWidth;
      const cx = W / 2;
      // keep tags clear of the ident block (left) and stat panel (right)
      const minX = 480;
      const maxX = W - 410;
      for (const c of calls) {
        const { x, y, worldY } = project(c.k);
        const show = visible(worldY) && W > 1100;
        const side = x < cx ? -1 : 1;
        const w = c.tag.offsetWidth;
        const tx = side < 0 ? Math.max(minX + w, x - 150) : Math.min(maxX - w, x + 150);
        const ty = y + CALLOUT_ROWS[c.k] * 0.4;
        c.line.setAttribute("points", `${x},${y} ${tx - side * 30},${ty} ${tx},${ty}`);
        c.dot.setAttribute("cx", String(x));
        c.dot.setAttribute("cy", String(y));
        c.tag.style.transform = `translate(${side < 0 ? tx - w : tx}px, ${ty - 22}px)`;
        const o = show ? 1 : 0;
        c.tag.style.opacity = String(o);
        c.line.style.opacity = String(o * 0.8);
        c.dot.style.opacity = String(o);
      }
    },
    dispose() {
      for (const c of calls) {
        c.line.remove();
        c.dot.remove();
      }
    },
  };
}

// Orbit/zoom/parallax input state.
export interface OrbitInput {
  readonly dragging: boolean;
  yaw: number;
  yawVel: number;
  idle: number;
  mx: number;
  my: number;
  camDistTarget: number;
  dispose(): void;
}

export function createOrbitInput(canvas: HTMLCanvasElement): OrbitInput {
  let lastX = 0;
  const state: OrbitInput = {
    dragging: false,
    yaw: -0.35,
    yawVel: 0,
    idle: 0,
    mx: 0,
    my: 0,
    camDistTarget: CAM_DIST,
    dispose,
  };
  const s = state as { dragging: boolean };
  const onPointerDown = (e: PointerEvent) => {
    s.dragging = true;
    lastX = e.clientX;
    state.idle = 0;
  };
  const onPointerUp = () => {
    s.dragging = false;
  };
  const onPointerMove = (e: PointerEvent) => {
    state.mx = e.clientX / window.innerWidth - 0.5;
    state.my = e.clientY / window.innerHeight - 0.5;
    if (!state.dragging) return;
    state.yawVel = (e.clientX - lastX) * 0.006;
    lastX = e.clientX;
    state.idle = 0;
  };
  const onWheel = (e: WheelEvent) => {
    state.camDistTarget = Math.min(22, Math.max(10, state.camDistTarget + e.deltaY * 0.01));
  };
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("wheel", onWheel, { passive: true });
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointermove", onPointerMove);
  function dispose(): void {
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("wheel", onWheel);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointermove", onPointerMove);
  }
  return state;
}

// Turntable drifts back to a slow sway when idle.
export function stepOrbit(o: OrbitInput, dt: number, t: number): void {
  if (!o.dragging) {
    o.yawVel *= 0.94;
    o.idle += dt;
    if (o.idle > 2.5) o.yaw += (Math.sin(t * 0.22) * 0.7 - o.yaw) * dt * 0.6;
  }
  o.yaw += o.yawVel;
}

export function cameraPosition(o: OrbitInput, camDist: number): [number, number, number] {
  return [
    Math.sin(o.mx * 0.25) * camDist + o.mx * 1.2,
    3.3 - o.my * 1.2,
    Math.cos(o.mx * 0.25) * camDist,
  ];
}

export function timerBag() {
  const timers = new Set<number>();
  return {
    later(fn: () => void, ms: number) {
      const id = window.setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
    },
    clear() {
      for (const id of timers) window.clearTimeout(id);
    },
  };
}
