/**
 * RRS 19.2「障碍物旁的空间」用例（8 个）：
 * 同舷相联两船在障碍物旁通过时，外侧船应给内侧船留出通过空间。
 * windDir=0（北风），障碍物在北侧 y=10。
 */
import type { ScenarioCase } from '../testkit/scenario';
import { mark, toward } from '../testkit/scenario';
import { buildMarkRoomPair } from '../testkit/geometryBuilder';

const WIND = 0;
const OB = () => mark('OB', '障碍物', 0, 10, 'obstruction', 8);

/** 构造一对在障碍物旁相联汇聚的船 */
function obPair(contact: boolean, base = 315, markAt = { x: 0, y: 10 }) {
  return buildMarkRoomPair({ base, mark: markAt, T: 3, threshold: 4, contact });
}

export const rrs19Cases: ScenarioCase[] = [
  {
    id: 'C065',
    name: '相联通过障碍物，外侧船挤压内侧船接触，判 19.2',
    category: 'RRS19',
    windDir: WIND,
    durationSec: 3,
    boats: (() => {
      const { inside, outside } = obPair(true);
      return [inside, outside];
    })(),
    marks: [OB()],
    expect: { rule: '19.2', foulBoatId: 'B', rightBoatId: 'A', markId: 'OB', alsoRules: ['14'] },
  },
  {
    id: 'C066',
    name: '未接触但外侧船未留通过空间，逼近至安全距离内',
    category: 'RRS19',
    windDir: WIND,
    durationSec: 3,
    boats: (() => {
      const { inside, outside } = obPair(false);
      return [inside, outside];
    })(),
    marks: [OB()],
    expect: { rule: '19.2', foulBoatId: 'B', rightBoatId: 'A', markId: 'OB' },
  },
  {
    id: 'C067',
    name: '左舷受风相联通过障碍物，外侧船未给空间',
    category: 'RRS19',
    windDir: WIND,
    durationSec: 3,
    boats: (() => {
      const { inside, outside } = obPair(true, 45, { x: 0, y: 6 });
      return [inside, outside];
    })(),
    marks: [mark('OB', '障碍物', 0, 6, 'obstruction', 8)],
    expect: { rule: '19.2', foulBoatId: 'B', rightBoatId: 'A', markId: 'OB', alsoRules: ['14'] },
  },
  {
    id: 'C068',
    name: '内外侧位置随几何互换时，外侧船仍负给空间义务',
    category: 'RRS19',
    windDir: WIND,
    durationSec: 3,
    boats: [
      toward('A', '内侧船A', 315, { x: -1.4, y: 1 }, 3),
      toward('B', '外侧船B', 315, { x: 1.4, y: 1.2 }, 3),
    ],
    marks: [OB()],
    expect: { rule: '19.2', foulBoatId: 'B', rightBoatId: 'A', markId: 'OB', alsoRules: ['14'] },
  },
  // 干净/不适用场景
  {
    id: 'C069',
    name: '相联但在障碍物旁保持充足通过空间，不犯规',
    category: 'RRS19',
    windDir: WIND,
    durationSec: 3,
    boats: [
      toward('A', '内侧船A', 315, { x: -8, y: 1 }, 3),
      toward('B', '外侧船B', 315, { x: 4, y: 1 }, 3),
    ],
    marks: [OB()],
    expect: { rule: null, expectClean: true },
  },
  {
    id: 'C070',
    name: '两船相距甚远，障碍物规则不介入',
    category: 'RRS19',
    windDir: WIND,
    durationSec: 3,
    boats: [
      toward('A', '船A', 315, { x: -20, y: 1 }, 3),
      toward('B', '船B', 315, { x: 20, y: 1 }, 3),
    ],
    marks: [OB()],
    expect: { rule: null, expectClean: true },
  },
  {
    id: 'C071',
    name: '不相联的后船通过障碍物时按 RRS12 处理，不判 19.2',
    category: 'RRS19',
    windDir: WIND,
    durationSec: 3,
    boats: [
      toward('A', '前船A', 315, { x: 0, y: 3 }, 3, 2.5),
      toward('B', '后船B', 315, { x: 0, y: -7 }, 3, 4.5),
    ],
    marks: [OB()],
    expect: { rule: null, expectClean: true },
  },
  {
    id: 'C072',
    name: '相反舷风驶近障碍物，按 RRS10 处理，不判 19.2',
    category: 'RRS19',
    windDir: WIND,
    durationSec: 3,
    boats: [
      toward('P', '左舷船A', 45, { x: -9, y: 0 }, 3),
      toward('S', '右舷船B', 315, { x: 9, y: 16 }, 3),
    ],
    marks: [OB()],
    expect: { rule: null, expectClean: true },
  },
];
