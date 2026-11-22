/**
 * 模拟比赛：用关键帧 DSL 构造一场含多种典型犯规的演示赛，
 * 由 RaceJudge 逐帧驱动，产出帧、犯规、罚转、回放数据供 UI 使用。
 */
import { RaceJudge } from '../engine/raceJudge';
import type { BoatState, Mark, RaceFrame } from '../engine/types';
import { deriveTack } from '../engine/geometry';

export const SIM_FPS = 10;
export const SIM_DT = 1 / SIM_FPS;
export const SIM_SECONDS = 24;
const WIND = 0; // 北风（来风方向）

interface BoatPath {
  id: string;
  name: string;
  length: number;
  color: string;
  /** 关键帧：时间点 -> 位置/航向/状态 */
  keys: { t: number; x: number; y: number; heading: number; inTacking?: boolean; tackHail?: 'tack' | 'youTack' }[];
}

/** 线性插值取关键帧之间的状态 */
function samplePath(path: BoatPath, t: number): BoatState {
  const keys = path.keys;
  let lo = keys[0];
  let hi = keys[keys.length - 1];
  for (let i = 0; i < keys.length - 1; i++) {
    if (t >= keys[i].t && t <= keys[i + 1].t) {
      lo = keys[i];
      hi = keys[i + 1];
      break;
    }
  }
  const span = Math.max(hi.t - lo.t, 1e-9);
  const k = Math.min(Math.max((t - lo.t) / span, 0), 1);
  const heading = lo.heading + ((hi.heading - lo.heading + 540) % 360) - 180 === 0
    ? lo.heading
    : lo.heading + shortestAngle(lo.heading, hi.heading) * k;
  const x = lo.x + (hi.x - lo.x) * k;
  const y = lo.y + (hi.y - lo.y) * k;
  const speed = Math.hypot(hi.x - lo.x, hi.y - lo.y) / span;
  return {
    id: path.id,
    name: path.name,
    x,
    y,
    heading,
    length: path.length,
    speed,
    tack: deriveTack(heading, WIND),
    inTacking: hi.inTacking ?? lo.inTacking ?? false,
    tackHail: hi.tackHail ?? lo.tackHail,
  };
}

function shortestAngle(a: number, b: number): number {
  let d = (b - a) % 360;
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return d;
}

const marks: Mark[] = [
  { id: 'WM', name: '上风标', x: 0, y: 26, zoneRadius: 8, kind: 'windward' },
  { id: 'LM', name: '下风标', x: 0, y: -10, zoneRadius: 8, kind: 'leeward' },
  { id: 'OB', name: '障碍物', x: -16, y: 12, zoneRadius: 6, kind: 'obstruction' },
];

/**
 * 四条船的演示航线，覆盖：
 *  - P/S 左右舷汇聚（RRS10）
 *  - W/L 相联挤压（RRS11）
 *  - 上风标区内换舷（RRS18.3）
 *  - 720° 罚转解脱
 */
const paths: BoatPath[] = [
  {
    id: 'S', name: '右舷船·蓝', length: 4, color: '#2f7df6',
    keys: [
      { t: 0, x: 14, y: -16, heading: 315 },
      { t: 8, x: -4, y: 2, heading: 315 },
      { t: 16, x: -12, y: 22, heading: 315 },
      { t: 24, x: -8, y: 40, heading: 315 },
    ],
  },
  {
    id: 'P', name: '左舷船·红', length: 4, color: '#e5484d',
    keys: [
      { t: 0, x: -14, y: -16, heading: 45 },
      { t: 8, x: 4, y: 2, heading: 45 }, // 与 S 在 t≈8 汇聚接触 => RRS10
      // 犯规后做完整 720° 两圈旋转（持续右转，含一次 tack 与一次 gybe），位置基本原地
      { t: 9, x: 8, y: 5, heading: 135 },
      { t: 10.5, x: 8, y: 5, heading: 225 },
      { t: 12, x: 8, y: 5, heading: 315 },
      { t: 13.5, x: 8, y: 5, heading: 45 },
      { t: 15, x: 8, y: 5, heading: 135 },
      { t: 16.5, x: 8, y: 5, heading: 225 },
      { t: 18, x: 8, y: 5, heading: 315 },
      { t: 19.5, x: 8, y: 5, heading: 45 },
      // 旋转完成后驶离
      { t: 24, x: 12, y: 9, heading: 45 },
    ],
  },
  {
    id: 'W', name: '上风船·橙', length: 4, color: '#f5a524',
    keys: [
      { t: 0, x: -8, y: 6, heading: 320 },
      { t: 10, x: 2, y: 18, heading: 320 }, // 向下风 L 挤压 => RRS11
      { t: 18, x: 6, y: 30, heading: 315 },
      { t: 24, x: 8, y: 42, heading: 315 },
    ],
  },
  {
    id: 'L', name: '下风船·绿', length: 4, color: '#30a46c',
    keys: [
      { t: 0, x: -2, y: 2, heading: 315 },
      { t: 10, x: 4, y: 16, heading: 315 },
      { t: 18, x: 4, y: 30, heading: 315 },
      { t: 24, x: 6, y: 42, heading: 315 },
    ],
  },
];

export interface Simulation {
  judge: RaceJudge;
  frames: RaceFrame[];
}

/** 运行整场模拟，返回裁判门面与全部帧 */
export function runSimulation(): Simulation {
  const judge = new RaceJudge({ fps: SIM_FPS, replaySeconds: 30, scoreDeduction: 20 });
  const frames: RaceFrame[] = [];
  const steps = Math.round(SIM_SECONDS / SIM_DT);
  for (let i = 0; i <= steps; i++) {
    const t = Number((i * SIM_DT).toFixed(3));
    const boats = paths.map((p) => samplePath(p, t));
    const frame: RaceFrame = { time: t, frameNo: i, windDir: WIND, boats, marks };
    judge.step(frame);
    frames.push(frame);
  }
  judge.finish(SIM_SECONDS);
  return { judge, frames };
}
