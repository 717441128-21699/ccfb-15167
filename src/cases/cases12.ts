/**
 * RRS 12「同舷风不相联」用例（8 个）：
 * 两船同舷受风且不相联时，清晰在后的船应避让清晰在前的船。
 * windDir=0（北风）；近迎风右舷航向 315。
 */
import type { ScenarioCase } from '../testkit/scenario';
import { toward } from '../testkit/scenario';

const WIND = 0;

/** 标准追尾：后船 A 航速更快，沿同航向追上前船 B 并接触（按 T 秒后接触反推起点） */
function overtaking(
  id: string,
  name: string,
  opts: { heading?: number; aSpeed?: number; T?: number; lateral?: number } = {},
): ScenarioCase {
  const T = opts.T ?? 3;
  const heading = opts.heading ?? 315;
  const aSpeed = opts.aSpeed ?? 5;
  const bSpeed = 2;
  // 后船起点：让两船 T 秒后在原点接触
  const r = (heading * Math.PI) / 180;
  const aStart = {
    x: (opts.lateral ?? 0) - Math.sin(r) * aSpeed * T,
    y: -Math.cos(r) * aSpeed * T,
  };
  const bStart = { x: -Math.sin(r) * bSpeed * T, y: -Math.cos(r) * bSpeed * T };
  return {
    id,
    name,
    category: 'RRS12',
    windDir: WIND,
    durationSec: T,
    boats: [
      toward('A', '后船A', heading, aStart, T, aSpeed),
      toward('B', '前船B', heading, bStart, T, bSpeed),
    ],
    marks: [],
    expect: { rule: '12', foulBoatId: 'A', rightBoatId: 'B', alsoRules: ['14'] },
  };
}

export const rrs12Cases: ScenarioCase[] = [
  overtaking('C027', '同航向追尾接触，后船犯规'),
  overtaking('C028', '左舷受风航段追尾，后船犯规', { heading: 45 }),
  overtaking('C029', '后船高速追及前船', { aSpeed: 6, T: 2.5 }),
  overtaking('C030', '长距离缓慢追及后接触', { aSpeed: 4.5, T: 5 }),
  overtaking('C031', '带横向偏差的追越，贴近前船右舷', { lateral: 2 }),
  overtaking('C032', '顺风航段追尾，后船犯规', { heading: 135 }),
  {
    id: 'C033',
    name: '后船未接触但追至安全距离内，后船犯规',
    category: 'RRS12',
    windDir: WIND,
    durationSec: 3,
    // 同航向 315：B 从原点后退 7.5m 出发，A 从后退 17m 出发，
    // A 速 4、B 速 2.5，3 秒后 A 追到 B 后方 5m（安全距离 6.4 内、阈值外）
    boats: [
      toward('A', '后船A', 315, { x: Math.sin((315 * Math.PI) / 180) * -17, y: Math.cos((315 * Math.PI) / 180) * -17 }, 3, 4),
      toward('B', '前船B', 315, { x: Math.sin((315 * Math.PI) / 180) * -7.5, y: Math.cos((315 * Math.PI) / 180) * -7.5 }, 3, 2.5),
    ],
    marks: [],
    expect: { rule: '12', foulBoatId: 'A', rightBoatId: 'B' },
  },
  {
    id: 'C034',
    name: '后船保持安全距离跟随，不犯规',
    category: 'RRS12',
    windDir: WIND,
    durationSec: 3,
    boats: [
      toward('A', '后船A', 315, { x: 0, y: -14 }, 3, 3),
      toward('B', '前船B', 315, { x: 0, y: 0 }, 3, 3),
    ],
    marks: [],
    expect: { rule: null, expectClean: true },
  },
];
