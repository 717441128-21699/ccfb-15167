/**
 * RRS 10「相对舷风」用例（14 个）：
 * 左舷受风(port)船应避让右舷受风(starboard)船。
 * 来风方向 windDir=0（北风）：近迎风航向 315 => 右舷受风，45 => 左舷受风。
 * 标准交叉：右舷船 S(315) 从 SE 向 NW、左舷船 P(45) 从 SW 向 NE，在原点汇聚。
 */
import type { ScenarioCase } from '../testkit/scenario';
import { mark, toward } from '../testkit/scenario';

const WIND = 0; // 北风（风从北吹来）

/** 标准汇聚：P(45,左舷) 与 S(315,右舷) T 秒后在原点接触；opts.clean=true 表示应零判罚 */
function converge(
  id: string,
  name: string,
  opts: { pHeading?: number; sHeading?: number; T?: number; pSpeed?: number; sSpeed?: number; offset?: number; clean?: boolean } = {},
): ScenarioCase {
  const T = opts.T ?? 3;
  const pH = opts.pHeading ?? 45;
  const sH = opts.sHeading ?? 315;
  const rp = (pH * Math.PI) / 180;
  const rs = (sH * Math.PI) / 180;
  const pStart = { x: -Math.sin(rp) * 3 * T, y: -Math.cos(rp) * 3 * T };
  const sStart = { x: -Math.sin(rs) * (opts.sSpeed ?? 3) * T, y: -Math.cos(rs) * (opts.sSpeed ?? 3) * T };
  const p = toward('P', '左舷船A', pH, pStart, T, opts.pSpeed ?? 3);
  const s = toward('S', '右舷船B', sH, { x: sStart.x + (opts.offset ?? 0), y: sStart.y }, T, opts.sSpeed ?? 3);
  return {
    id,
    name,
    category: 'RRS10',
    windDir: WIND,
    durationSec: T,
    boats: [p, s],
    marks: [],
    expect: opts.clean
      ? { rule: null, expectClean: true }
      : { rule: '10', foulBoatId: 'P', rightBoatId: 'S', alsoRules: ['14'] },
  };
}

export const rrs10Cases: ScenarioCase[] = [
  converge('C001', '左右舷汇聚接触，左舷船犯规'),
  converge('C002', '两船高速汇聚，左舷船仍应避让', { pSpeed: 4.2, sSpeed: 4.5 }),
  converge('C003', '低速汇聚接触，左舷船犯规', { pSpeed: 1.8, sSpeed: 2.0 }),
  converge('C004', '航向不同的对遇局面，左舷船犯规', { pHeading: 30, sHeading: 330 }),
  converge('C005', '小角度交叉相遇，左舷船犯规', { pHeading: 5, sHeading: 355 }),
  converge('C006', '右舷船航速更快，左舷船未让', { sSpeed: 5 }),
  converge('C007', '左舷船航速更快，仍负避让义务', { pSpeed: 5 }),
  converge('C008', '较长的汇聚时间，接触前持续妨碍右舷船', { T: 5 }),
  converge('C009', '近距离起手即接触，左舷船犯规', { T: 1 }),
  // 未接触但在安全距离内持续逼近 => 未保持避让（横向错开 3m，小于安全距离 6.4m）
  converge('C010', '未接触但逼近右舷船至安全距离内，左舷船犯规', { offset: -3 }),
  // 干净场景
  {
    id: 'C011',
    name: '左舷船从右舷船船尾后方通过，保持避让',
    category: 'RRS10',
    windDir: WIND,
    durationSec: 3,
    boats: [
      toward('P', '左舷船A', 45, { x: -8, y: -16 }, 3),
      toward('S', '右舷船B', 315, { x: 14, y: 8 }, 3),
    ],
    marks: [],
    expect: { rule: null, expectClean: true },
  },
  {
    id: 'C012',
    name: '两船平行同向不同舷，间距充足不犯规',
    category: 'RRS10',
    windDir: WIND,
    durationSec: 3,
    boats: [
      toward('P', '左舷船A', 45, { x: -12, y: -8 }, 3),
      toward('S', '右舷船B', 45, { x: 12, y: -8 }, 3),
    ],
    marks: [],
    expect: { rule: null, expectClean: true },
  },
  {
    id: 'C013',
    name: '两船背向驶离，距离持续增大不犯规',
    category: 'RRS10',
    windDir: WIND,
    durationSec: 3,
    // P 在西南角向 SW(225) 远离、S 在东北角向 NE(45) 远离，初始间隔 11m（安全距离外），持续增大
    boats: [
      toward('P', '左舷船A', 225, { x: -4, y: -4 }, 3),
      toward('S', '右舷船B', 45, { x: 4, y: 4 }, 3),
    ],
    marks: [],
    expect: { rule: null, expectClean: true },
  },
  {
    id: 'C014',
    name: '标志附近汇聚，但均未进入绕标区，仍按 RRS10 判左舷',
    category: 'RRS10',
    windDir: WIND,
    durationSec: 3,
    // 汇聚点设在原点，标志在 (0,-12) 远离汇聚点，两船全程在区外
    boats: [
      toward('P', '左舷船A', 45, { x: -Math.sin(Math.PI / 4) * 9, y: -Math.cos(Math.PI / 4) * 9 }, 3),
      toward('S', '右舷船B', 315, { x: -Math.sin((315 * Math.PI) / 180) * 9, y: -Math.cos((315 * Math.PI) / 180) * 9 }, 3),
    ],
    marks: [mark('M1', '上风标', 0, -12, 'windward', 6)],
    expect: { rule: '10', foulBoatId: 'P', rightBoatId: 'S', alsoRules: ['14'] },
  },
];
