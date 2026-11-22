/**
 * 航海几何工具
 * 约定：
 *  - 世界坐标 y 轴向北；角度为「从北顺时针」的航向角（0~360），0=北、90=东。
 *  - windDir 表示风「吹来」的方向（来风方向，水手口径：0=北风、90=东风）。
 *  - 上风 = 靠近来风方向；下风 = 远离来风方向。
 */
import type { BoatState, Tack } from './types';

export const TAU = Math.PI * 2;

/** 角度差 a - b，归一到 (-180, 180] */
export function angleDiff(a: number, b: number): number {
  let d = (a - b) % 360;
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return d;
}

/** 航向角转单位向量（指向船首）：顺时针航向，x = sin、y = cos */
export function headingVec(headingDeg: number): { x: number; y: number } {
  const r = (headingDeg * Math.PI) / 180;
  return { x: Math.sin(r), y: Math.cos(r) };
}

export function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

/** 点 p 相对船 b 的相对方位：正=右舷侧，负=左舷侧，0/±180=首尾线 */
export function relativeBearing(p: { x: number; y: number }, b: BoatState): number {
  const v = headingVec(b.heading);
  const dx = p.x - b.x;
  const dy = p.y - b.y;
  // 船首向顺时针转 90° 即右舷正横方向 (v.y, -v.x)，与目标向量点积给出左右侧
  const cross = v.y * dx - v.x * dy;
  const dot = v.x * dx + v.y * dy;
  return (Math.atan2(cross, dot) * 180) / Math.PI;
}

/**
 * RRS 定义「相联(overlap)」：
 * 一船的正横后方线（过船尾、垂直首尾线）落在他船正横后方线之前即相联。
 * 以两船在各自首尾线上的投影比较实现；相反舷风时不构成同舷相联。
 */
export function isOverlapped(a: BoatState, b: BoatState): boolean {
  if (a.tack !== b.tack) return false;
  const va = headingVec(a.heading);
  const projB = (b.x - a.x) * va.x + (b.y - a.y) * va.y;
  const vb = headingVec(b.heading);
  const projA = (a.x - b.x) * vb.x + (a.y - b.y) * vb.y;
  // 他船投影在本船船尾（-船长/2）之前 => 相联
  return projB > -a.length / 2 && projA > -b.length / 2;
}

/** 上风方向单位向量（指向风吹来的方向） */
export function windwardVec(windDir: number): { x: number; y: number } {
  return headingVec(windDir);
}

/**
 * 同舷两船的上风船：在来风方向上更靠「上游」的一艘。
 * 用两船在来风单位向量上的投影之差判定（与坐标原点位置无关）。
 */
export function windwardBoat(a: BoatState, b: BoatState, windDir: number): string {
  const w = windwardVec(windDir);
  const projA = a.x * w.x + a.y * w.y;
  const projB = b.x * w.x + b.y * w.y;
  return projA >= projB ? a.id : b.id;
}

/** 接触判定：两船外形包络半径（船长 1/2）之和，即中心距小于两船半船长之和 */
export function contactThreshold(a: BoatState, b: BoatState): number {
  return (a.length + b.length) * 0.5;
}

export function isContact(a: BoatState, b: BoatState): boolean {
  return dist(a.x, a.y, b.x, b.y) <= contactThreshold(a, b);
}

/** 船是否在某标志的绕标区内 */
export function inZone(boat: BoatState, markX: number, markY: number, radius: number): boolean {
  return dist(boat.x, boat.y, markX, markY) <= radius;
}

/**
 * 由来风方向与航向推算受风舷。
 * 看「风吹来的方位」落在船的哪一舷：
 * 风来自右舷侧 => 右舷受风(starboard)；来自左舷侧 => 左舷受风(port)。
 */
export function deriveTack(heading: number, windDir: number): Tack {
  const ref: BoatState = {
    id: '__ref__',
    name: '__ref__',
    x: 0,
    y: 0,
    heading,
    length: 1,
    speed: 0,
    tack: 'starboard',
    inTacking: false,
  };
  const windPoint = headingVec(windDir);
  return relativeBearing(windPoint, ref) >= 0 ? 'starboard' : 'port';
}

/** 两航向间是否构成一次迎风换舷（船首越过正迎风，即来风方向） */
export function isTackCrossing(oldHeading: number, newHeading: number, windDir: number): boolean {
  const before = angleDiff(windDir, oldHeading);
  const after = angleDiff(windDir, newHeading);
  // 来风方向相对船首的方位从一舷跨到另一舷，且走的是迎风一侧（小角侧）
  return before * after < 0 && Math.abs(before) < 90 && Math.abs(after) < 90;
}

/** 两航向间是否构成一次顺风换舷（船尾越过顺风，即风吹去方向） */
export function isGybeCrossing(oldHeading: number, newHeading: number, windDir: number): boolean {
  const downwind = norm360(windDir + 180);
  const before = angleDiff(downwind, oldHeading);
  const after = angleDiff(downwind, newHeading);
  return before * after < 0 && Math.abs(before) < 90 && Math.abs(after) < 90;
}

/** 约束到 [0,360) */
export function norm360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}
