// A port of the Apila app's AvatarAnimator (AvatarSkeleton.swift), standing
// only: idle breathing and weight shifts, glances, following a pointer, the
// buds (ears) springing about, blinking, and a nod-and-hop reaction. Walking,
// dancing and sitting are left out. Keep in step with the Swift original.

import { Quaternion, Vector3 } from "three";

export type Skeleton = {
  names: string[];
  parents: number[];
  restOffsets: number[];
  restPositions: number[];
  petalAngles: number[];
  headPitch: number;
  gazeReach: [number, number];
  restAnkleHeight: number;
  /** Iris shift in head space per side (left, right), over a 5×5 gaze grid from −1 to 1. */
  irisGrid: number[][];
};

const X = new Vector3(1, 0, 0), Y = new Vector3(0, 1, 0), Z = new Vector3(0, 0, 1);
const axisAngle = (axis: Vector3, angle: number) => new Quaternion().setFromAxisAngle(axis, angle);
const lean = (a: number) => axisAngle(X, a);
const swing = (a: number) => axisAngle(X, -a);
const turn = (a: number) => axisAngle(Y, a);
const tilt = (a: number) => axisAngle(Z, a);
/** Raises a hanging arm out to its own side: `right` true for her right. */
const spread = (right: boolean, a: number) => tilt(right ? -a : a);
const mul = (...qs: Quaternion[]) => qs.reduce((acc, q) => acc.multiply(q), new Quaternion());
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** A springy lag, as two angles (lean forward, tilt). */
class Wobble {
  angle: [number, number] = [0, 0];
  private speed: [number, number] = [0, 0];
  static gain = 0.05;
  constructor(private frequency = 2.1, private damping = 0.3) {}
  kick(v: [number, number]) {
    this.speed[0] += v[0];
    this.speed[1] += v[1];
  }
  step(push: [number, number], seconds: number) {
    const k = 2 * Math.PI * this.frequency;
    for (const i of [0, 1]) {
      const target = clamp(push[i], -0.4, 0.4);
      const spring = (target - this.angle[i]) * k * k;
      const drag = this.speed[i] * 2 * this.damping * k;
      this.speed[i] += (spring - drag) * seconds;
      this.angle[i] += this.speed[i] * seconds;
    }
  }
}

export type JointTransform = { position: Vector3; orientation: Quaternion };

export class Pose {
  rootOffset = new Vector3();
  rotations: Quaternion[];
  constructor(private skeleton: SkeletonInfo) {
    this.rotations = skeleton.names.map(() => new Quaternion());
  }
  get(j: number) {
    return this.rotations[j];
  }
  set(j: number, q: Quaternion) {
    this.rotations[j] = q;
  }
  worldTransforms(): JointTransform[] {
    const { parents, restOffset } = this.skeleton;
    const result: JointTransform[] = [];
    for (let j = 0; j < parents.length; j++) {
      const parent = parents[j];
      if (parent < 0) {
        result.push({ position: restOffset[j].clone().add(this.rootOffset), orientation: this.rotations[j].clone() });
      } else {
        const base = result[parent];
        result.push({
          position: base.position.clone().add(restOffset[j].clone().applyQuaternion(base.orientation)),
          orientation: base.orientation.clone().multiply(this.rotations[j]),
        });
      }
    }
    return result;
  }
  /** Lowers or raises her so the lower foot rests on the ground. */
  plantFeet() {
    const s = this.skeleton, joints = this.worldTransforms();
    let lowest = Infinity;
    for (const [foot, toe] of [[s.j.footL, s.j.toeL], [s.j.footR, s.j.toeR]]) {
      lowest = Math.min(lowest, joints[foot].position.y - s.restAnkleHeight, joints[toe].position.y);
    }
    this.rootOffset.y -= lowest;
  }
}

/** The skeleton with joints looked up by name. */
export class SkeletonInfo {
  names: string[];
  parents: number[];
  restOffset: Vector3[];
  restPosition: Vector3[];
  petalAngles: number[];
  headPitch: number;
  restAnkleHeight: number;
  irisGrid: number[][];
  j: Record<string, number>;
  constructor(raw: Skeleton) {
    this.names = raw.names;
    this.parents = raw.parents;
    const vecs = (a: number[]) => raw.names.map((_, i) => new Vector3(a[3 * i], a[3 * i + 1], a[3 * i + 2]));
    this.restOffset = vecs(raw.restOffsets);
    this.restPosition = vecs(raw.restPositions);
    this.petalAngles = raw.petalAngles;
    this.headPitch = raw.headPitch;
    this.restAnkleHeight = raw.restAnkleHeight;
    this.irisGrid = raw.irisGrid;
    this.j = Object.fromEntries(raw.names.map((n, i) => [n, i]));
  }
  petal(k: number) {
    return this.j.petal0 + k;
  }
  /** Iris shift in head space for `gaze` (−1…1 each way), bilinear over the exported grid. */
  irisShift(side: 0 | 1, gx: number, gy: number): Vector3 {
    const grid = this.irisGrid[side];
    const fx = (clamp(gx, -1, 1) + 1) * 2, fy = (clamp(gy, -1, 1) + 1) * 2;
    const x0 = Math.min(3, Math.floor(fx)), y0 = Math.min(3, Math.floor(fy));
    const tx = fx - x0, ty = fy - y0;
    const at = (x: number, y: number) => new Vector3().fromArray(grid, 3 * (y * 5 + x));
    const top = at(x0, y0).lerp(at(x0 + 1, y0), tx), bottom = at(x0, y0 + 1).lerp(at(x0 + 1, y0 + 1), tx);
    return top.lerp(bottom, ty);
  }
}

export class Animator {
  isAttentive = true;
  /** Where to look, (toward her left, up) each −1…1, or null to glance about on her own. */
  lookTarget: [number, number] | null = null;
  armSpread = 0;
  perksBuds = true;
  time = 0;
  eyeLook: [number, number] = [0, 0];
  private attention = 0;
  private headLook = new Vector3();
  private glance = new Vector3();
  private glanceEnds = 0;
  private nextGlance = 2.5;
  private nextPerk = 1.5;
  private sinceReaction = Infinity;
  private buds = [new Wobble(), new Wobble()];
  private petals: Wobble[];
  private tails = [new Wobble(1.5, 0.3), new Wobble(1.5, 0.3)];
  private tailTips = [new Wobble(2, 0.22), new Wobble(2, 0.22)];
  private head: { position: Vector3; velocity: Vector3 | null } | null = null;
  // Blinking (AvatarFigure.blink).
  private blinkEnds = 0;
  private nextBlink = 1.5;

  constructor(private s: SkeletonInfo) {
    this.petals = s.petalAngles.map(() => new Wobble());
  }

  get eyesClosed() {
    return this.time < this.blinkEnds;
  }

  /** A nod and a little hop, as if to say "mm!". */
  react() {
    this.sinceReaction = 0;
    if (this.perksBuds) this.perkBuds(1);
  }

  private idle(time: number, lookAround: number): Pose {
    const s = this.s, j = s.j, pose = new Pose(s);
    const breath = Math.sin((time * 2 * Math.PI) / 3.6);
    const shift = Math.sin((time * 2 * Math.PI) / 7);
    const look = Math.sin((time * 2 * Math.PI) / 11);
    pose.rootOffset.x = 0.008 * shift;
    pose.set(j.hips, tilt(0.02 * shift));
    pose.set(j.spine, tilt(-0.02 * shift));
    pose.set(j.chest, lean(-0.015 * breath));
    pose.set(j.neck, lean(s.headPitch / 2));
    pose.set(j.head, mul(turn(0.18 * look * lookAround),
      lean(s.headPitch / 2 + 0.03 * lookAround * Math.sin((time * 2 * Math.PI) / 5))));
    for (const [thigh, upperArm, forearm, right] of [
      [j.thighL, j.upperArmL, j.forearmL, false], [j.thighR, j.upperArmR, j.forearmR, true],
    ] as const) {
      pose.set(thigh, tilt(-0.02 * shift));
      pose.set(upperArm, spread(right, 0.12 + this.armSpread + 0.015 * breath));
      pose.set(forearm, swing(0.15));
    }
    return pose;
  }

  private bodyPose(): Pose {
    const j = this.s.j;
    const pose = this.idle(this.time, 1 - this.attention);
    const look = this.headLook;
    pose.set(j.neck, mul(pose.get(j.neck), turn(0.35 * look.x), lean(-0.4 * look.y)));
    pose.set(j.head, mul(pose.get(j.head), turn(0.65 * look.x), lean(-0.6 * look.y), tilt(look.z)));
    pose.plantFeet();
    if (this.sinceReaction < 0.7) {
      const t = this.sinceReaction;
      const nod = Math.sin((t / 0.35) * Math.PI) * (t < 0.35 ? 1 : 0.5);
      pose.set(j.neck, mul(pose.get(j.neck), lean(0.12 * nod)));
      pose.set(j.head, mul(pose.get(j.head), lean(0.18 * nod)));
      if (t < 0.3) pose.rootOffset.y += 0.035 * Math.sin((t / 0.3) * Math.PI);
    }
    return pose;
  }

  pose(): Pose {
    const s = this.s, j = s.j, pose = this.bodyPose();
    this.buds.forEach((w, i) => pose.set(i === 0 ? j.budL : j.budR, mul(lean(w.angle[0]), tilt(w.angle[1]))));
    this.petals.forEach((w, k) => {
      const t = s.petalAngles[k];
      pose.set(s.petal(k), mul(axisAngle(new Vector3(Math.cos(t), -Math.sin(t), 0), w.angle[0]), tilt(0.5 * w.angle[1])));
    });
    [[j.tailL, j.tailTipL, false], [j.tailR, j.tailTipR, true]].forEach(([tail, tip, right], i) => {
      pose.set(tail as number, mul(lean(this.tails[i].angle[0]), spread(right as boolean, this.tails[i].angle[1])));
      pose.set(tip as number, mul(lean(this.tailTips[i].angle[0]), spread(right as boolean, this.tailTips[i].angle[1])));
    });
    return pose;
  }

  advance(seconds: number): Pose {
    this.time += seconds;
    this.attention += ((this.isAttentive ? 1 : 0) - this.attention) * Math.min(1, seconds * 4);
    this.sinceReaction += seconds;

    let target = new Vector3();
    if (!this.isAttentive) {
      this.glanceEnds = 0;
    } else if (this.lookTarget) {
      target = new Vector3(this.lookTarget[0] * 0.55, this.lookTarget[1] * 0.4, 0);
      this.nextGlance = Math.max(this.nextGlance, this.time + 1.5);
    } else {
      if (this.time > this.nextGlance) this.pickGlance();
      if (this.time < this.glanceEnds) target = this.glance.clone();
    }
    this.headLook.add(target.sub(this.headLook).multiplyScalar(Math.min(1, seconds * 4.5)));
    const eyeTarget = this.lookTarget ?? [this.headLook.x / 0.5, this.headLook.y / 0.4];
    for (const i of [0, 1]) {
      this.eyeLook[i] += (clamp(eyeTarget[i], -1, 1) - this.eyeLook[i]) * Math.min(1, seconds * 14);
    }
    if (this.perksBuds && this.time > this.nextPerk) {
      this.perkBuds(rand(0.6, 1));
      this.nextPerk = this.time + (this.isAttentive ? rand(1.5, 3.5) : rand(2.5, 5));
    }
    this.shakeBuds(seconds);

    // Blinks every few seconds, sometimes twice in quick succession.
    if (this.time > this.nextBlink) {
      this.blinkEnds = this.time + 0.13;
      this.nextBlink = Math.random() < 0.25 ? this.time + 0.3 : this.time + rand(2, 5);
    }
    return this.pose();
  }

  private pickGlance() {
    const side = Math.random() < 0.5 ? 1 : -1, roll = Math.random();
    if (roll < 0.34) this.glance.set(side * rand(0.35, 0.5), rand(-0.05, 0.12), 0);
    else if (roll < 0.56) this.glance.set(side * 0.08, rand(-0.02, 0.06), side * rand(0.12, 0.2));
    else if (roll < 0.74) this.glance.set(side * rand(0.2, 0.35), rand(-0.25, -0.15), 0);
    else if (roll < 0.84) this.glance.set(side * rand(0, 0.15), rand(0.35, 0.5), 0);
    else this.glance.set(0, 0.06, side * 0.08);
    this.glanceEnds = this.time + rand(0.7, 2.2);
    this.nextGlance = Math.random() < 0.3 ? this.glanceEnds + rand(0, 0.3) : this.glanceEnds + rand(1.5, 6.5);
    if (this.perksBuds && Math.random() < 0.35) this.perkBuds(rand(0.5, 0.9));
  }

  private perkBuds(strength: number) {
    const twist = rand(-1, 1);
    this.buds[0].kick([-3.2 * strength, (1.6 + twist) * strength]);
    this.buds[1].kick([-3.2 * strength, -(1.6 - twist) * strength]);
  }

  private shakeBuds(seconds: number) {
    if (!(seconds > 0 && seconds < 0.1)) {
      this.head = null;
      return;
    }
    const transform = this.bodyPose().worldTransforms()[this.s.j.head];
    let push: [number, number] = [0, 0];
    if (this.head) {
      const velocity = transform.position.clone().sub(this.head.position).divideScalar(seconds);
      if (this.head.velocity) {
        const felt = velocity.clone().sub(this.head.velocity).divideScalar(seconds)
          .applyQuaternion(transform.orientation.clone().invert());
        push = [-felt.z * Wobble.gain, felt.y * Wobble.gain];
      }
      this.head = { position: transform.position, velocity };
    } else {
      this.head = { position: transform.position, velocity: null };
    }
    this.buds[0].step([push[0], -push[1]], seconds);
    this.buds[1].step([push[0], push[1]], seconds);
    this.petals.forEach((w, k) => {
      const t = this.s.petalAngles[k], turnSign = k % 2 === 0 ? 1 : -1;
      w.step([3 * push[0] + 2.4 * turnSign * push[1], 2.5 * Math.sin(t) * push[1]], seconds);
    });
    for (const i of [0, 1]) {
      const sw: [number, number] = [-2 * push[0], 0];
      this.tails[i].step(sw, seconds);
      this.tailTips[i].step([this.tails[i].angle[0] * 0.9 + sw[0] * 0.4, this.tails[i].angle[1] * 0.9], seconds);
    }
  }
}
