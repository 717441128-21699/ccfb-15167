/**
 * RRS 11「同舷风相联」用例（12 个）：
 * 两船同舷受风且相联时，上风船（更靠近来风方向）应避让下风船。
 * windDir=0（北风）；近迎风右舷航向 315、左舷航向 45。
 * 几何由 buildOverlapPair 程序化构造，数学上保证全程相联且 T 秒后接触/逼近。
 */
import type { ScenarioCase } from '../testkit/scenario';
import { toward } from '../testkit/scenario';
import { buildOverlapPair } from '../testkit/geometryBuilder';

const WIND = 0;
const THRESHOLD = 4;

function overlapFoul(
  id: string,
  name: string,
  opts: { portTack?: boolean; T?: number; nonContact?: boolean } = {},
): ScenarioCase {
  const T = opts.T ?? 3;
  const base = opts.portTack ? 45 : 315;
  const { w, l } = buildOverlapPair(base, T, THRESHOLD, opts.nonContact ?? false);
  return {
    id,
    name,
    category: 'RRS11',
    windDir: WIND,
    durationSec: T,
    boats: [w, l],
    marks: [],
    expect: opts.nonContact
      ? { rule: '11', foulBoatId: 'W', rightBoatId: 'L' }
      : { rule: '11', foulBoatId: 'W', rightBoatId: 'L', alsoRules: ['14'] },
  };
}

export const rrs11Cases: ScenarioCase[] = [
  overlapFoul('C015', '右舷相联，上风船挤压下风船接触'),
  overlapFoul('C016', '左舷相联，上风船挤压下风船接触', { portTack: true }),
  overlapFoul('C017', '上风船高速贴近下风船'),
  overlapFoul('C018', '长距离并行后上风船缓慢下压接触', { T: 6 }),
  overlapFoul('C019', '短时间近距离相联挤压接触', { T: 2 }),
  overlapFoul('C020', '近迎风航段相联，上风船未保持避让'),
  overlapFoul('C021', '横风航段相联，上风船横压下风船'),
  overlapFoul('C022', '未接触但逼近至安全距离内，上风船犯规', { nonContact: true }),
  // 干净场景
  {
    id: 'C023',
    name: '相联但间距充足，上风船保持避让',
    category: 'RRS11',
    windDir: WIND,
    durationSec: 3,
    boats: [
      toward('W', '上风船A', 315, { x: -12, y: 12 }, 3),
      toward('L', '下风船B', 315, { x: 0, y: 2 }, 3),
    ],
    marks: [],
    expect: { rule: null, expectClean: true },
  },
  {
    id: 'C024',
    name: '上风船主动向上风偏转拉开距离，不犯规',
    category: 'RRS11',
    windDir: WIND,
    durationSec: 3,
    boats: [
      toward('W', '上风船A', 305, { x: -10, y: 16 }, 3),
      toward('L', '下风船B', 315, { x: 4, y: 4 }, 3),
    ],
    marks: [],
    expect: { rule: null, expectClean: true },
  },
  {
    id: 'C025',
    name: '下风船加速从后方驶出但未贴近，无妨碍',
    category: 'RRS11',
    windDir: WIND,
    durationSec: 3,
    // 两船横向间隔足够大（>安全距离 6.4m），L 加速也不会贴近 W
    boats: [
      toward('W', '上风船A', 315, { x: -14, y: 8 }, 3, 3),
      toward('L', '下风船B', 315, { x: 4, y: 2 }, 3, 5),
    ],
    marks: [],
    expect: { rule: null, expectClean: true },
  },
  {
    id: 'C026',
    name: '两船同舷但纵向相距甚远，不构成相联妨碍',
    category: 'RRS11',
    windDir: WIND,
    durationSec: 3,
    boats: [
      toward('W', '上风船A', 315, { x: -3, y: 40 }, 3),
      toward('L', '下风船B', 315, { x: 0, y: 0 }, 3),
    ],
    marks: [],
    expect: { rule: null, expectClean: true },
  },
];
