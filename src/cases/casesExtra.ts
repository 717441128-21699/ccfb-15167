/**
 * 补充边界用例（13 个，C088–C100）：多船局面、极端几何、条款交叉等边界情形。
 * windDir=0（北风）。
 */
import type { ScenarioCase } from '../testkit/scenario';
import { mark, toward } from '../testkit/scenario';
import { buildOverlapPair, buildMarkRoomPair } from '../testkit/geometryBuilder';

const WIND = 0;

/** 汇聚起点：沿 heading 反方向后退 d 米，使船 T 秒后到达原点附近 */
function back(heading: number, d: number, lateral = 0): { x: number; y: number } {
  const r = (heading * Math.PI) / 180;
  return { x: lateral - Math.sin(r) * d, y: -Math.cos(r) * d };
}

export const extraCases: ScenarioCase[] = [
  {
    id: 'C088',
    name: '三船汇聚：左舷船与两艘右舷船均构成 RRS10 犯规',
    category: 'RRS10',
    windDir: WIND,
    durationSec: 3,
    // P(45,左舷) 从 SW、S1/S2(315,右舷) 从 SE 汇聚到原点
    boats: [
      toward('P', '左舷船A', 45, back(45, 9), 3),
      toward('S1', '右舷船B', 315, back(315, 9), 3),
      toward('S2', '右舷船C', 315, back(315, 9, 4), 3),
    ],
    marks: [],
    expect: { rule: '10', foulBoatId: 'P', rightBoatId: 'S1', alsoRules: ['14'] },
  },
  {
    id: 'C089',
    name: '三船同舷相联：上风船同时对两艘下风船负避让义务',
    category: 'RRS11',
    windDir: WIND,
    durationSec: 3,
    // 用程序化相联对构造 W/L1，L2 贴近 L1 同舷相联
    boats: (() => {
      const { w, l } = buildOverlapPair(315, 3, 4, false);
      const l2 = { ...l, id: 'L2', name: '下风船C', keyframes: l.keyframes.map((k) => ({ ...k, x: k.x + 3.5 })) };
      return [w, l, l2];
    })(),
    marks: [],
    // W 对任一下风船 L1/L2 负避让义务即算正确
    expect: { rule: '11', foulBoatId: 'W', alsoRules: ['14'] },
  },
  {
    id: 'C090',
    name: '四船编队无交汇，引擎零误判',
    category: 'clean',
    windDir: WIND,
    durationSec: 3,
    boats: [
      toward('A', '船A', 315, { x: -24, y: 0 }, 3),
      toward('B', '船B', 315, { x: -8, y: 0 }, 3),
      toward('C', '船C', 315, { x: 8, y: 0 }, 3),
      toward('D', '船D', 315, { x: 24, y: 0 }, 3),
    ],
    marks: [],
    expect: { rule: null, expectClean: true },
  },
  {
    id: 'C091',
    name: '小半径绕标区(4m)相联进区，外侧船未给空间',
    category: 'RRS18',
    windDir: WIND,
    durationSec: 3,
    boats: [
      toward('A', '内侧船A', 315, { x: -1.2, y: 0.5 }, 3),
      toward('B', '外侧船B', 315, { x: 1.2, y: 0.5 }, 3),
    ],
    marks: [mark('WM', '上风标', 0, 6, 'windward', 4)],
    expect: {
      rule: '18.2(b)',
      foulBoatId: 'B',
      rightBoatId: 'A',
      markId: 'WM',
      alsoRules: ['14', '21(a)'],
      exoneratedBoatId: 'A',
    },
  },
  {
    id: 'C092',
    name: '大半径绕标区(12m)下清晰在前船的绕标空间权利',
    category: 'RRS18',
    windDir: WIND,
    durationSec: 3,
    boats: (() => {
      const { inside, outside } = buildMarkRoomPair({
        base: 315, mark: { x: 0, y: 12 }, T: 3, threshold: 4, contact: true,
      });
      return [inside, outside];
    })(),
    marks: [mark('WM', '上风标', 0, 12, 'windward', 12)],
    expect: {
      rule: '18.2(b)',
      foulBoatId: 'B',
      rightBoatId: 'A',
      markId: 'WM',
      alsoRules: ['14', '21(a)'],
      exoneratedBoatId: 'A',
    },
  },
  {
    id: 'C093',
    name: '后船在区内最后一刻建立相联，内侧船仍获空间（18.2(e) 边界）',
    category: 'RRS18',
    windDir: WIND,
    durationSec: 3,
    boats: (() => {
      const { inside, outside } = buildMarkRoomPair({
        base: 315, mark: { x: 0, y: 10 }, T: 3, threshold: 4, contact: true,
      });
      return [inside, outside];
    })(),
    marks: [mark('WM', '上风标', 0, 10, 'windward', 8)],
    expect: {
      rule: '18.2(b)',
      foulBoatId: 'B',
      rightBoatId: 'A',
      markId: 'WM',
      alsoRules: ['14', '21(a)'],
      exoneratedBoatId: 'A',
    },
  },
  {
    id: 'C094',
    name: '换舷船在区内换舷但与他船距离持续拉大，18.3 不成立',
    category: 'RRS18',
    windDir: WIND,
    durationSec: 3,
    boats: [
      {
        id: 'T',
        name: '换舷船A',
        keyframes: [
          { t: 0, x: -6, y: 0, heading: 315, speed: 3 },
          { t: 1.6, x: -7.2, y: 3.6, heading: 352, speed: 2.4, inTacking: true },
          { t: 2.8, x: -5.8, y: 5.0, heading: 8, speed: 2.4, inTacking: true },
          { t: 3, x: -3.6, y: 6.5, heading: 45, speed: 3 },
        ],
      },
      toward('O', '驶近船B', 135, { x: 20, y: 16 }, 3),
    ],
    marks: [mark('WM', '上风标', 0, 10, 'windward')],
    expect: { rule: null, expectClean: true },
  },
  {
    id: 'C095',
    name: '障碍物相联通过：外侧船为上风船，主判 11 并附 19.2',
    category: 'RRS19',
    windDir: WIND,
    durationSec: 3,
    // 相联汇聚对（W 上风避让），障碍物在两船前方区内
    boats: (() => {
      const { w, l } = buildOverlapPair(315, 3, 4, false);
      return [l, w];
    })(),
    marks: [mark('OB', '障碍物', 0, 10, 'obstruction', 8)],
    expect: { rule: '11', foulBoatId: 'W', rightBoatId: 'L', alsoRules: ['14'] },
  },
  {
    id: 'C096',
    name: '近迎风极限航向(335)的左右舷汇聚接触',
    category: 'RRS10',
    windDir: WIND,
    durationSec: 3,
    // P(25,左舷) 与 S(335,右舷) 汇聚原点
    boats: [
      toward('P', '左舷船A', 25, back(25, 9), 3),
      toward('S', '右舷船B', 335, back(335, 9), 3),
    ],
    marks: [],
    expect: { rule: '10', foulBoatId: 'P', rightBoatId: 'S', alsoRules: ['14'] },
  },
  {
    id: 'C097',
    name: '横风航向(90)同舷相联，上风船下压接触',
    category: 'RRS11',
    windDir: WIND,
    durationSec: 3,
    boats: (() => {
      const { w, l } = buildOverlapPair(90, 3, 4, false);
      return [w, l];
    })(),
    marks: [],
    expect: { rule: '11', foulBoatId: 'W', rightBoatId: 'L', alsoRules: ['14'] },
  },
  {
    id: 'C098',
    name: '换舷完成后才与他船接近，按一般条款判而非 RRS13',
    category: 'RRS13',
    windDir: WIND,
    durationSec: 4,
    boats: [
      {
        id: 'T',
        name: '换舷船A',
        keyframes: [
          { t: 0, x: -20, y: 0, heading: 315, speed: 3 },
          { t: 1.2, x: -21.2, y: 3.6, heading: 352, speed: 2.4, inTacking: true },
          { t: 2.0, x: -19.8, y: 5.0, heading: 8, speed: 2.4, inTacking: true },
          { t: 4, x: -9, y: 11, heading: 45, speed: 3 },
        ],
      },
      toward('S', '右舷船B', 315, { x: 12, y: 16 }, 4),
    ],
    marks: [],
    expect: { rule: null, expectClean: true },
  },
  {
    id: 'C099',
    name: '后船追越中由不相联变为相联，首个判罚为 RRS12',
    category: 'RRS12',
    windDir: WIND,
    durationSec: 3,
    // 同航向 315，后船 A 速 5、前船 B 速 2，反推起点使 3 秒后接触（接触前不相联 => RRS12）
    boats: [
      toward('A', '后船A', 315, back(315, 15), 3, 5),
      toward('B', '前船B', 315, back(315, 6), 3, 2),
    ],
    marks: [],
    expect: { rule: '12', foulBoatId: 'A', rightBoatId: 'B', alsoRules: ['14'] },
  },
  {
    id: 'C100',
    name: '障碍物旁合规换舷：呼喊后被呼喊船响应，全流程无犯规',
    category: 'RRS20',
    windDir: WIND,
    durationSec: 3,
    boats: [
      toward('H', '呼喊船A', 315, { x: -6, y: 1 }, 3, 3, { tackHail: 'tack' }),
      toward('R', '被呼喊船B', 315, { x: 0, y: 1 }, 3, 3, { tackHail: 'youTack' }),
    ],
    marks: [mark('OB', '障碍物', 0, 16, 'obstruction', 8)],
    expect: { rule: null, expectClean: true },
  },
];
