/**
 * 规则用例场景 DSL：
 * 用「关键帧」描述每艘船的运动轨迹，运行器按固定步长插值生成逐帧 RaceFrame，
 * 再喂给 RaceJudge，使 100 个规则用例可以声明式编写。
 */
import { angleDiff, deriveTack, norm360 } from '../engine/geometry';
import { RaceJudge } from '../engine/raceJudge';
import type { BoatState, Incident, Mark, RaceFrame, Tack } from '../engine/types';

export interface BoatKeyframe {
  t: number;
  x: number;
  y: number;
  heading: number;
  speed?: number;
  inTacking?: boolean;
  tackHail?: 'tack' | 'youTack';
}

export interface BoatSpec {
  id: string;
  name: string;
  length?: number;
  keyframes: BoatKeyframe[];
}

export interface MarkSpec {
  id: string;
  name: string;
  x: number;
  y: number;
  zoneRadius?: number;
  kind: Mark['kind'];
}

export type CaseCategory =
  | 'RRS10'
  | 'RRS11'
  | 'RRS12'
  | 'RRS13'
  | 'RRS14'
  | 'RRS18'
  | 'RRS19'
  | 'RRS20'
  | 'clean';

export interface CaseExpectation {
  /** 期望触发的主条款，null 表示本场景不应有任何判罚 */
  rule: string | null;
  /** 显式标记「期望零判罚」，避免 null 在序列化/比较时的歧义 */
  expectClean?: boolean;
  foulBoatId?: string;
  rightBoatId?: string;
  markId?: string;
  /** 期望同时涉及的条款（子集匹配） */
  alsoRules?: string[];
  /** 期望被免责的船 */
  exoneratedBoatId?: string;
}

export interface ScenarioCase {
  id: string;
  name: string;
  category: CaseCategory;
  windDir: number;
  durationSec: number;
  dt?: number;
  boats: BoatSpec[];
  marks: MarkSpec[];
  expect: CaseExpectation;
}

export interface ScenarioRunResult {
  c: ScenarioCase;
  frames: RaceFrame[];
  incidents: Incident[];
  judge: RaceJudge;
}

const DEFAULT_DT = 0.1;
const DEFAULT_LENGTH = 4;
const DEFAULT_ZONE = 8;

function lerp(a: number, b: number, k: number): number {
  return a + (b - a) * k;
}

function lerpHeading(a: number, b: number, k: number): number {
  return norm360(a + angleDiff(b, a) * k);
}

function sampleBoat(spec: BoatSpec, t: number, windDir: number): BoatState {
  const kf = spec.keyframes;
  let lo = kf[0];
  let hi = kf[kf.length - 1];
  for (let i = 0; i < kf.length - 1; i++) {
    if (t >= kf[i].t && t <= kf[i + 1].t) {
      lo = kf[i];
      hi = kf[i + 1];
      break;
    }
  }
  const span = hi.t - lo.t;
  const k = span <= 1e-9 ? 0 : (t - lo.t) / span;
  const heading = lerpHeading(lo.heading, hi.heading, k);
  const tack: Tack = deriveTack(heading, windDir);
  return {
    id: spec.id,
    name: spec.name,
    x: lerp(lo.x, hi.x, k),
    y: lerp(lo.y, hi.y, k),
    heading,
    length: spec.length ?? DEFAULT_LENGTH,
    speed: lerp(lo.speed ?? 3, hi.speed ?? 3, k),
    tack,
    // RRS20 呼喊是持续意图：关键帧之间保持最近一次非空呼喊
    inTacking: hi.inTacking ?? lo.inTacking ?? false,
    tackHail: hi.tackHail ?? lo.tackHail,
  };
}

/** 运行一个场景，返回全部帧、犯规事件与裁判实例 */
export function runScenario(c: ScenarioCase): ScenarioRunResult {
  const dt = c.dt ?? DEFAULT_DT;
  const fps = Math.round(1 / dt);
  const judge = new RaceJudge({ fps, replaySeconds: 60, scoreDeduction: 20 });
  const frames: RaceFrame[] = [];
  const steps = Math.round(c.durationSec / dt);

  const marks: Mark[] = c.marks.map((m) => ({
    id: m.id,
    name: m.name,
    x: m.x,
    y: m.y,
    zoneRadius: m.zoneRadius ?? DEFAULT_ZONE,
    kind: m.kind,
  }));

  for (let i = 0; i <= steps; i++) {
    const t = Number((i * dt).toFixed(4));
    const frame: RaceFrame = {
      time: t,
      frameNo: i,
      windDir: c.windDir,
      boats: c.boats.map((spec) => sampleBoat(spec, t, c.windDir)),
      marks,
    };
    frames.push(frame);
    judge.step(frame);
  }
  return { c, frames, incidents: [...judge.incidents()], judge };
}

/** 常用船速 3m/s 下，直线航行 distance 米所需秒数 */
export function eta(distance: number, speed = 3): number {
  return Number((distance / speed).toFixed(2));
}

/** 单关键帧快捷构造（匀速直线运动） */
export function boat(
  id: string,
  name: string,
  x: number,
  y: number,
  heading: number,
  speed = 3,
  length = DEFAULT_LENGTH,
): BoatSpec {
  return { id, name, length, keyframes: [{ t: 0, x, y, heading, speed }] };
}

export interface Pt {
  x: number;
  y: number;
}

/** 从起点沿 heading 匀速航行 T 秒，自动给出终点关键帧（位置/速度严格一致） */
export function toward(
  id: string,
  name: string,
  heading: number,
  start: Pt,
  T: number,
  speed = 3,
  extra: Partial<BoatKeyframe> = {},
): BoatSpec {
  const r = (heading * Math.PI) / 180;
  const vx = Math.sin(r) * speed;
  const vy = Math.cos(r) * speed;
  return {
    id,
    name,
    keyframes: [
      { t: 0, x: start.x, y: start.y, heading, speed },
      { t: T, x: start.x + vx * T, y: start.y + vy * T, heading, speed, ...extra },
    ],
  };
}

/** 静止船（速度 0，单关键帧） */
export function stationary(id: string, name: string, x: number, y: number, heading = 0): BoatSpec {
  return { id, name, keyframes: [{ t: 0, x, y, heading, speed: 0 }] };
}

/** 直线位移（自动算航向与航速） */
export function move(
  id: string,
  name: string,
  from: Pt,
  to: Pt,
  T: number,
  extra: { inTacking?: boolean; tackHail?: 'tack' | 'youTack' } = {},
): BoatSpec {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const heading = (Math.atan2(dx, dy) * 180) / Math.PI;
  const speed = Math.hypot(dx, dy) / T;
  return {
    id,
    name,
    keyframes: [
      { t: 0, x: from.x, y: from.y, heading, speed },
      { t: T, x: to.x, y: to.y, heading, speed, ...extra },
    ],
  };
}

export function mark(id: string, name: string, x: number, y: number, kind: Mark['kind'], zoneRadius = DEFAULT_ZONE): MarkSpec {
  return { id, name, x, y, kind, zoneRadius };
}

