import * as THREE from "three";
import { MECH_SHAPES } from "./hangarShared";
import type { AnchorKey } from "./hangarShared";
import type { CombatProfileSpec } from "./profiles";

// Procedural low-poly mech per Combat Profile for the Three.js hangar.

interface MechArm {
  arm: THREE.Group;
  fore: THREE.Group;
}

export interface MechRig {
  root: THREE.Group;
  torso: THREE.Group;
  torsoBaseY: number;
  head: THREE.Group;
  arms: { left: MechArm; right: MechArm };
  anchors: Record<AnchorKey, THREE.Object3D>;
  lit: THREE.MeshStandardMaterial;
  height: number;
}

// `clip` hides everything above its constant — used for the scan-line
// materialise transition.
export function buildMech(profile: CombatProfileSpec, clip: THREE.Plane): MechRig {
  const s = MECH_SHAPES[profile.id];
  const accent = new THREE.Color(profile.accent);
  const mat = (o: THREE.MeshStandardMaterialParameters) =>
    new THREE.MeshStandardMaterial({ clippingPlanes: [clip], clipShadows: true, ...o });
  const body = mat({ color: 0x56616a, metalness: 0.6, roughness: 0.42 });
  const dark = mat({ color: 0x23292e, metalness: 0.7, roughness: 0.45 });
  const paint = mat({ color: accent.clone().multiplyScalar(0.36), metalness: 0.45, roughness: 0.45 });
  const lit = mat({ color: accent, emissive: accent, emissiveIntensity: 3.2 });
  const B = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
  const C = (r: number, h: number, seg = 12) => new THREE.CylinderGeometry(r, r, h, seg);
  const add = (
    geo: THREE.BufferGeometry,
    m: THREE.Material,
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D,
    rx = 0,
  ) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    mesh.rotation.x = rx;
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  const root = new THREE.Group();
  const kneeY = 0.25 + s.shin;
  const hipY = kneeY + s.thigh;
  for (const side of [-1, 1]) {
    const hx = (side * s.hipW) / 2;
    add(B(s.legW * 1.5, 0.25, s.legW * 2.5), dark, hx * 1.08, 0.125, 0.15, root);
    add(B(s.legW * 1.3, 0.12, s.legW * 0.6), paint, hx * 1.08, 0.3, 0.15 + s.legW * 1.1, root);
    add(B(s.legW * 1.05, s.shin, s.legW * 1.2), body, hx * 1.08, 0.25 + s.shin / 2, 0, root);
    add(B(s.legW * 0.9, s.shin * 0.7, 0.12), paint, hx * 1.08, 0.25 + s.shin * 0.55, s.legW * 0.62, root, -0.08);
    add(B(s.legW * 1.25, s.legW * 0.8, s.legW * 1.35), dark, hx * 1.05, kneeY, 0.12, root);
    add(B(s.legW * 0.95, s.thigh, s.legW * 1.05), body, hx, kneeY + s.thigh / 2, -0.05, root, 0.06);
  }
  add(B(s.hipW + s.legW * 1.1, 0.45, s.torsoD * 0.7), dark, 0, hipY, 0, root);

  const torso = new THREE.Group();
  torso.position.y = hipY + 0.2;
  root.add(torso);
  add(B(s.torsoW, s.torsoH, s.torsoD), body, 0, s.torsoH / 2, 0, torso);
  add(B(s.torsoW * 0.72, s.torsoH * 0.5, 0.14), paint, 0, s.torsoH * 0.64, s.torsoD / 2 + 0.05, torso, -0.16);
  add(B(s.torsoW * 0.42, 0.06, 0.03), lit, 0, s.torsoH * 0.3, s.torsoD / 2 + 0.02, torso);
  add(B(s.torsoW * 0.5, s.torsoH * 0.25, 0.1), dark, 0, s.torsoH * 0.3, s.torsoD / 2 - 0.02, torso);
  add(B(s.torsoW * 0.82, s.torsoH * 0.82, s.torsoD * 0.55), dark, 0, s.torsoH * 0.5, -s.torsoD / 2 - s.torsoD * 0.22, torso);

  const head = new THREE.Group();
  head.position.set(0, s.torsoH + s.headH / 2 - 0.04, s.headZ);
  torso.add(head);
  add(B(s.headW, s.headH, s.headD), body, 0, 0, 0, head);
  add(B(s.headW * 0.82, 0.07, 0.03), lit, 0, s.headH * 0.05, s.headD / 2 + 0.01, head);
  const sensor = new THREE.Object3D();
  sensor.position.set(0, s.headH * 0.2, s.headD / 2);
  head.add(sensor);

  const buildArm = (side: number): MechArm => {
    const sx = side * (s.torsoW / 2 + s.shoulder / 2 - 0.05);
    const arm = new THREE.Group();
    arm.position.set(sx, s.torsoH - 0.15, 0);
    torso.add(arm);
    add(B(s.shoulder, s.shoulder * 0.5, s.shoulder * 1.1), paint, side * 0.05, 0.02, 0, arm);
    add(B(s.shoulder * 1.02, 0.05, s.shoulder * 0.3), dark, side * 0.05, 0.02, s.shoulder * 0.45, arm);
    add(B(0.34 * s.armT, s.arm, 0.36 * s.armT), body, 0, -s.arm / 2 - 0.1, 0, arm);
    const fore = new THREE.Group();
    fore.position.set(0, -s.arm - 0.1, 0);
    fore.rotation.x = -0.55;
    arm.add(fore);
    add(B(0.48 * s.armT, s.arm * 1.05, 0.52 * s.armT), body, 0, -s.arm * 0.5, 0, fore);
    add(B(0.5 * s.armT, 0.1, 0.54 * s.armT), dark, 0, -s.arm * 0.08, 0, fore);
    return { arm, fore };
  };
  const arms = { left: buildArm(-1), right: buildArm(1) };

  // Weapon hardpoints differ per profile (SPEC §35 loadouts).
  const melee = new THREE.Object3D();
  const ranged = new THREE.Object3D();
  const R = arms.right.fore;
  const L = arms.left.fore;
  const fl = -s.arm * 1.05;
  if (profile.id === "BRAWLER") {
    add(C(0.07, 1.2), dark, 0, fl - 0.35, 0, R);
    add(B(0.62, 0.5, 0.95), body, 0, fl - 0.95, 0, R);
    add(B(0.64, 0.52, 0.1), lit, 0, fl - 0.95, 0.48, R);
    melee.position.set(0, fl - 0.95, 0.5);
    R.add(melee);
    add(B(0.5, 0.45, 0.8), dark, 0, fl * 0.55, 0.2, L);
    for (const dx of [-0.1, 0.1]) add(C(0.06, 1.1), body, dx, fl * 0.55, 0.9, L, Math.PI / 2);
    ranged.position.set(0, fl * 0.55, 1.45);
    L.add(ranged);
    for (const dx of [-0.35, 0.35]) {
      add(C(0.12, 0.9), dark, dx, s.torsoH + 0.35, -s.torsoD / 2 - 0.35, torso);
      add(C(0.13, 0.06), lit, dx, s.torsoH + 0.8, -s.torsoD / 2 - 0.35, torso);
    }
  } else if (profile.id === "ASSAULT") {
    add(B(0.2, 0.25, 0.2), dark, 0, fl - 0.05, 0, R);
    add(B(0.05, 1.7, 0.22), lit, 0, fl - 0.95, 0.05, R);
    melee.position.set(0, fl - 1.2, 0.1);
    R.add(melee);
    const rail = new THREE.Group();
    rail.position.set(-(s.torsoW / 2 + 0.15), s.torsoH + 0.35, 0);
    torso.add(rail);
    add(B(0.34, 0.3, 1.1), dark, 0, 0, -0.1, rail);
    for (const dy of [-0.08, 0.08]) add(B(0.1, 0.05, 2.4), body, 0, dy, 0.9, rail);
    add(B(0.03, 0.08, 2.2), lit, 0, 0, 0.9, rail);
    ranged.position.set(0, 0, 2.1);
    rail.add(ranged);
    add(C(0.02, 0.9, 6), dark, s.headW * 0.3, s.headH / 2 + 0.45, -0.1, head);
  } else {
    add(B(0.5, 0.45, 0.5), dark, 0, fl - 0.2, 0, R);
    add(B(0.52, 0.08, 0.52), lit, 0, fl - 0.05, 0, R);
    melee.position.set(0, fl - 0.3, 0.25);
    R.add(melee);
    add(C(0.13, 1.3), body, 0, fl * 0.5, 0.55, L, Math.PI / 2);
    add(C(0.16, 0.12), lit, 0, fl * 0.5, 1.2, L, Math.PI / 2);
    ranged.position.set(0, fl * 0.5, 1.25);
    L.add(ranged);
    for (const side of [-1, 1]) {
      add(B(0.06, 0.8, 0.5), paint, side * s.torsoW * 0.3, s.torsoH + 0.2, -s.torsoD / 2 - 0.3, torso, -0.5);
    }
  }

  return {
    root,
    torso,
    torsoBaseY: torso.position.y,
    head,
    arms,
    anchors: { melee, ranged, sensor },
    lit,
    height: hipY + 0.2 + s.torsoH + s.headH + 0.9,
  };
}

export function disposeMech(rig: MechRig): void {
  const materials = new Set<THREE.Material>();
  rig.root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      materials.add(o.material as THREE.Material);
    }
  });
  for (const m of materials) m.dispose();
}
