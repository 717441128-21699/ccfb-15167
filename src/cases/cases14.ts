/**
 * RRS 14「避免接触」用例（4 个）：
 * 所有船都应在合理可能时避免接触；接触事件一律附带 14 条，
 * 但享有航行权/绕标空间的船在无损坏情形下依 14(b) 免责（不作为犯规船）。
 * windDir=0（北风）。
 */
import type { ScenarioCase } from '../testkit/scenario';
import { toward } from '../testkit/scenario';
import { buildOverlapPair } from '../testkit/geometryBuilder';

const WIND = 0;

/** 汇聚起点：沿 heading 反方向后退 d 米，使两船在原点相遇 */
function start(heading: number, d: number, lateral = 0): { x: number; y: number } {
  const r = (heading * Math.PI) / 180;
  return { x: lateral - Math.sin(r) * d, y: -Math.cos(r) * d };
}

export const rrs14Cases: ScenarioCase[] = [
  {
    id: 'C043',
    name: '右舷船享有航行权但发生接触：犯规船为左舷船，事件附带 RRS14',
    category: 'RRS14',
    windDir: WIND,
    durationSec: 3,
    boats: [
      toward('P', '左舷船A', 45, start(45, 9), 3),
      toward('S', '右舷船B', 315, start(315, 9), 3),
    ],
    marks: [],
    expect: { rule: '10', foulBoatId: 'P', rightBoatId: 'S', alsoRules: ['14'] },
  },
  {
    id: 'C044',
    name: '同舷相联接触：上风船犯规，事件附带 RRS14',
    category: 'RRS14',
    windDir: WIND,
    durationSec: 3,
    // 用程序化构造保证接触时两船仍相联 => RRS11 而非 RRS12
    boats: (() => {
      const { w, l } = buildOverlapPair(315, 3, 4, false);
      return [w, l];
    })(),
    marks: [],
    expect: { rule: '11', foulBoatId: 'W', rightBoatId: 'L', alsoRules: ['14'] },
  },
  {
    id: 'C045',
    name: '权利方始终未被登记为犯规船（14(b) 无损坏免责验证）',
    category: 'RRS14',
    windDir: WIND,
    durationSec: 3,
    boats: [
      // 后船 A 更快，沿 315 追上慢船 B
      toward('A', '后船A', 315, start(315, 15), 3, 5),
      toward('B', '前船B', 315, start(315, 6), 3, 2),
    ],
    marks: [],
    expect: { rule: '12', foulBoatId: 'A', rightBoatId: 'B', alsoRules: ['14'] },
  },
  {
    id: 'C046',
    name: '无接触的妨碍只判航行权条款，不附带 RRS14',
    category: 'RRS14',
    windDir: WIND,
    durationSec: 3,
    // 横向错开 3m：逼近但不接触
    boats: [
      toward('P', '左舷船A', 45, start(45, 9, -3), 3),
      toward('S', '右舷船B', 315, start(315, 9), 3),
    ],
    marks: [],
    expect: { rule: '10', foulBoatId: 'P', rightBoatId: 'S' },
  },
];
