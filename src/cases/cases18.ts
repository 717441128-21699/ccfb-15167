/**
 * RRS 18「绕标区」用例（18 个）：
 * 18.2(b) 相联/清晰在前的绕标空间、18.2(e) 区内建立相联、
 * 18.3 上风标处迎风换舷的限制，以及 21(a) 免责。
 * windDir=0（北风）：上风标在北侧(y+)，船以近迎风 315/45 向北航行；
 * 下风标在南侧(y-)，船以顺风航向 135/225 向南航行。绕标区半径默认 8m。
 */
import type { BoatSpec, MarkSpec, ScenarioCase } from '../testkit/scenario';
import { mark, toward } from '../testkit/scenario';
import { buildMarkRoomPair } from '../testkit/geometryBuilder';

const WIND = 0;
const WM = () => mark('WM', '上风标', 0, 10, 'windward');
const LM = () => mark('LM', '下风标', 0, 2, 'leeward');

/** 汇聚起点：沿 heading 反方向后退 d 米，使船 T 秒后到达原点附近 */
function back(heading: number, d: number, lateral = 0): { x: number; y: number } {
  const r = (heading * Math.PI) / 180;
  return { x: lateral - Math.sin(r) * d, y: -Math.cos(r) * d };
}

/**
 * 同舷两船驶向标志 mk 的绕标空间用例：
 * 由 buildMarkRoomPair 程序化构造，内侧 A 先入区且入区相联，外侧 B 挤压接触/逼近。
 */
function sameTackApproach(
  id: string,
  name: string,
  heading: number,
  mk: MarkSpec,
  _lateralGap: number,
  expectRule: string | null,
  opts: {
    foulBoat?: string;
    rightBoat?: string;
    exonerated?: string;
    contact?: boolean;
    clean?: boolean;
    T?: number;
  } = {},
): ScenarioCase {
  const T = opts.T ?? 3;
  const contact = opts.contact !== false;
  const { inside, outside } = buildMarkRoomPair({
    base: heading,
    mark: { x: mk.x, y: mk.y },
    T,
    threshold: 4,
    contact,
    clean: opts.clean,
  });
  return {
    id,
    name,
    category: 'RRS18',
    windDir: WIND,
    durationSec: T,
    boats: [inside, outside],
    marks: [mk],
    expect: expectRule
      ? {
          rule: expectRule,
          foulBoatId: opts.foulBoat ?? 'B',
          rightBoatId: opts.rightBoat ?? 'A',
          markId: mk.id,
          alsoRules: contact ? ['14', '21(a)'] : ['21(a)'],
          exoneratedBoatId: opts.exonerated ?? 'A',
        }
      : { rule: null, expectClean: true },
  };
}

/** 上风标区内换舷船 T（315 -> 正迎风 0 -> 45），shift 控制与驶近船的间距 */
function tackerInZone(contact: boolean): BoatSpec {
  const shift = contact ? 0 : -2.5;
  return {
    id: 'T',
    name: '换舷船A',
    keyframes: [
      { t: 0, x: -6 + shift, y: 0, heading: 315, speed: 3 },
      { t: 1.6, x: -7.2 + shift, y: 3.6, heading: 352, speed: 2.4, inTacking: true },
      { t: 2.8, x: -5.8 + shift, y: 5.0, heading: 8, speed: 2.4, inTacking: true },
      { t: 3, x: -3.6 + shift, y: 6.5, heading: 45, speed: 3 },
    ],
  };
}

export const rrs18Cases: ScenarioCase[] = [
  // ---------- 18.2(b) 绕标空间 ----------
  sameTackApproach('C047', '上风标同舷相联进区，外侧船挤压内侧船接触，内侧船 21(a) 免责', 315, WM(), 2.8, '18.2(b)'),
  sameTackApproach('C048', '下风标同舷相联进区，外侧船未给绕标空间接触', 225, LM(), 2.8, '18.2(b)'),
  sameTackApproach('C049', '未接触但外侧船把内侧船挤到贴近标志，未给绕标空间', 315, WM(), 4.2, '18.2(b)', {
    contact: false,
  }),
  {
    id: 'C050',
    name: '外侧船本就是避让船（上风船），主判 RRS11 并附 18.2(b)',
    category: 'RRS18',
    windDir: WIND,
    durationSec: 3,
    boats: (() => {
      const { inside, outside } = buildMarkRoomPair({
        base: 315, mark: { x: 0, y: 10 }, T: 3, threshold: 4, contact: true,
      });
      return [inside, outside];
    })(),
    marks: [WM()],
    // 外侧上风船同时是 RRS11 避让方与绕标空间给与方
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
    id: 'C051',
    name: '第一艘入区船清晰在前，后船追上后未给前船绕标空间（18.2(b) 清晰在前）',
    category: 'RRS18',
    windDir: WIND,
    durationSec: 3,
    boats: (() => {
      const { inside, outside } = buildMarkRoomPair({
        base: 315, mark: { x: 0, y: 10 }, T: 3, threshold: 4, contact: true,
      });
      return [inside, outside];
    })(),
    marks: [WM()],
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
    id: 'C052',
    name: '区内才建立相联，内侧船仍有权获得绕标空间（18.2(e)）',
    category: 'RRS18',
    windDir: WIND,
    durationSec: 3,
    boats: (() => {
      const { inside, outside } = buildMarkRoomPair({
        base: 315, mark: { x: 0, y: 10 }, T: 3, threshold: 4, contact: true,
      });
      return [inside, outside];
    })(),
    marks: [WM()],
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
    id: 'C053',
    name: '顺风航段驶向下风标，相联进区外侧船未给空间',
    category: 'RRS18',
    windDir: WIND,
    durationSec: 3,
    boats: (() => {
      const { inside, outside } = buildMarkRoomPair({
        base: 225, mark: { x: 0, y: 2 }, T: 3, threshold: 4, contact: true,
      });
      return [inside, outside];
    })(),
    marks: [LM()],
    expect: {
      rule: '18.2(b)',
      foulBoatId: 'B',
      rightBoatId: 'A',
      markId: 'LM',
      alsoRules: ['14', '21(a)'],
      exoneratedBoatId: 'A',
    },
  },
  // ---------- 18.3 上风标换舷 ----------
  {
    id: 'C054',
    name: '上风标区内迎风换舷后与驶近船接触，换舷船犯规（18.3）',
    category: 'RRS18',
    windDir: WIND,
    durationSec: 3,
    // T 在区内(起点距标志 7m)完成 315->45 换舷；O(45,左舷)从东南汇聚到 T 附近接触
    boats: [
      {
        id: 'T',
        name: '换舷船A',
        keyframes: [
          { t: 0, x: -4, y: 3, heading: 315, speed: 3 },
          { t: 1.0, x: -5.2, y: 5.4, heading: 352, speed: 2.4, inTacking: true },
          { t: 2.0, x: -3.8, y: 6.8, heading: 8, speed: 2.4, inTacking: true },
          { t: 3, x: -1.6, y: 8.3, heading: 45, speed: 3 },
        ],
      },
      // O(45,左舷) 朝 T 的换舷终点(-1.6,8.3)汇聚，反推起点使 3 秒后接触
      toward('O', '驶近船B', 45, { x: -1.6 - Math.sin(Math.PI / 4) * 9, y: 8.3 - Math.cos(Math.PI / 4) * 9 }, 3),
    ],
    marks: [WM()],
    expect: { rule: '18.3', foulBoatId: 'T', rightBoatId: 'O', markId: 'WM', alsoRules: ['14'] },
  },
  {
    id: 'C055',
    name: '区内换舷船未接触但逼近驶近船至安全距离内（18.3）',
    category: 'RRS18',
    windDir: WIND,
    durationSec: 3,
    boats: [
      {
        id: 'T',
        name: '换舷船A',
        keyframes: [
          { t: 0, x: -6, y: 3, heading: 315, speed: 3 },
          { t: 1.0, x: -7.2, y: 5.4, heading: 352, speed: 2.4, inTacking: true },
          { t: 2.0, x: -5.8, y: 6.8, heading: 8, speed: 2.4, inTacking: true },
          { t: 3, x: -3.6, y: 8.3, heading: 45, speed: 3 },
        ],
      },
      // O(45) 从区内南侧驶向 T，3 秒后逼近到约 5m（安全距离内、阈值外），全程在绕标区内
      toward('O', '驶近船B', 45, { x: -6.4, y: 2.7 }, 3),
    ],
    marks: [WM()],
    expect: { rule: '18.3', foulBoatId: 'T', rightBoatId: 'O', markId: 'WM' },
  },
  {
    id: 'C056',
    name: '换舷发生在绕标区之外，不适用 18.3，无接触不犯规',
    category: 'RRS18',
    windDir: WIND,
    durationSec: 3,
    boats: [
      {
        id: 'T',
        name: '换舷船A',
        keyframes: [
          { t: 0, x: -26, y: 0, heading: 315, speed: 3 },
          { t: 1.2, x: -27.2, y: 3.6, heading: 352, speed: 2.4, inTacking: true },
          { t: 2.0, x: -25.8, y: 5.0, heading: 8, speed: 2.4, inTacking: true },
          { t: 3, x: -23.6, y: 6.5, heading: 45, speed: 3 },
        ],
      },
      toward('O', '驶近船B', 45, { x: 6, y: 0.5 }, 3),
    ],
    marks: [WM()],
    expect: { rule: null, expectClean: true },
  },
  {
    id: 'C057',
    name: '相反舷风驶近上风标且均未换舷，按 RRS10 判左舷船（18 不适用）',
    category: 'RRS18',
    windDir: WIND,
    durationSec: 3,
    // P(45,左舷) 与 S(315,右舷) 在原点汇聚接触；标志远离汇聚点，两船全程在区外
    boats: [
      toward('P', '左舷船A', 45, back(45, 9), 3),
      toward('S', '右舷船B', 315, back(315, 9), 3),
    ],
    marks: [mark('WM', '上风标', 0, -14, 'windward', 7)],
    expect: { rule: '10', foulBoatId: 'P', rightBoatId: 'S', alsoRules: ['14'] },
  },
  // ---------- 干净绕标 ----------
  sameTackApproach('C058', '相联进区外侧船全程留出充足绕标空间，不犯规', 315, WM(), 12, null, {
    contact: false,
    clean: true,
  }),
  sameTackApproach('C059', '下风标外侧船保持距离，内侧船顺利绕标，不犯规', 225, LM(), 12, null, {
    contact: false,
    clean: true,
  }),
  {
    id: 'C060',
    name: '前船先入区并独自绕标，后船在区外等候，不犯规',
    category: 'RRS18',
    windDir: WIND,
    durationSec: 4,
    boats: [
      toward('A', '前船A', 315, { x: 0, y: 6 }, 2, 3),
      toward('B', '后船B', 315, { x: 0, y: -8 }, 4, 2),
    ],
    marks: [WM()],
    expect: { rule: null, expectClean: true },
  },
  {
    id: 'C061',
    name: '两船先后通过标志且均在区外完成相遇，绕标规则不介入',
    category: 'RRS18',
    windDir: WIND,
    durationSec: 3,
    boats: [
      toward('A', '船A', 315, { x: -14, y: -10 }, 3),
      toward('B', '船B', 315, { x: 14, y: -10 }, 3),
    ],
    marks: [mark('WM', '上风标', 0, 10, 'windward', 6)],
    expect: { rule: null, expectClean: true },
  },
  {
    id: 'C062',
    name: '区内换舷但附近无他船，不构成 18.3 犯规',
    category: 'RRS18',
    windDir: WIND,
    durationSec: 3,
    boats: [tackerInZone(true)],
    marks: [WM()],
    expect: { rule: null, expectClean: true },
  },
  {
    id: 'C063',
    name: '小绕标区（半径 6m）相联进区，外侧船未给空间仍判 18.2(b)',
    category: 'RRS18',
    windDir: WIND,
    durationSec: 3,
    boats: [
      toward('A', '内侧船A', 315, { x: -1.4, y: 1 }, 3),
      toward('B', '外侧船B', 315, { x: 1.4, y: 1 }, 3),
    ],
    marks: [mark('WM', '上风标', 0, 8, 'windward', 6)],
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
    id: 'C064',
    name: '绕标完成后两船拉开距离，无后续犯规',
    category: 'RRS18',
    windDir: WIND,
    durationSec: 5,
    boats: [
      {
        id: 'A',
        name: '内侧船A',
        keyframes: [
          { t: 0, x: -6, y: 1, heading: 315, speed: 3 },
          { t: 3, x: -1.4, y: 8, heading: 315, speed: 3 },
          { t: 5, x: -8, y: 14, heading: 250, speed: 3 },
        ],
      },
      {
        id: 'B',
        name: '外侧船B',
        keyframes: [
          { t: 0, x: 2, y: 1, heading: 315, speed: 3 },
          { t: 3, x: 6.6, y: 8, heading: 315, speed: 3 },
          { t: 5, x: 12, y: 14, heading: 250, speed: 3 },
        ],
      },
    ],
    marks: [WM()],
    expect: { rule: null, expectClean: true },
  },
];
