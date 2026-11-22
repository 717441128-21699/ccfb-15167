/**
 * RRS 13「迎风换舷中」用例（8 个）：
 * 船首越过正迎风（来风方向 0°）后、换舷完成前，换舷中的船应避让其他船。
 * windDir=0（北风）：右舷近迎风 315 越过 0° 转到左舷近迎风 45。
 */
import type { BoatSpec, ScenarioCase } from '../testkit/scenario';
import { mark, toward } from '../testkit/scenario';

const WIND = 0;

/** 换舷船 T：从右舷近迎风(315) 经正迎风(0) 转到左舷近迎风(45)，换舷期间 inTacking */
function tackingBoat(id: string, name: string, x: number, y: number, T: number): BoatSpec {
  return {
    id,
    name,
    keyframes: [
      { t: 0, x, y, heading: 315, speed: 3 },
      { t: T * 0.4, x: x - 1.2, y: y + 3.6, heading: 352, speed: 2.4, inTacking: true },
      { t: T * 0.7, x: x + 0.2, y: y + 5.0, heading: 8, speed: 2.4, inTacking: true },
      { t: T, x: x + 2.4, y: y + 6.5, heading: 45, speed: 3 },
    ],
  };
}

export const rrs13Cases: ScenarioCase[] = [
  {
    id: 'C035',
    name: '换舷中与他船接触，换舷船犯规',
    category: 'RRS13',
    windDir: WIND,
    durationSec: 4,
    boats: [
      tackingBoat('T', '换舷船A', -4, 0, 4),
      toward('O', '直航船B', 315, { x: 2, y: -2 }, 4, 3),
    ],
    marks: [],
    expect: { rule: '13', foulBoatId: 'T', rightBoatId: 'O', alsoRules: ['14'] },
  },
  {
    id: 'C036',
    name: '换舷船未接触但逼近直航船至安全距离内',
    category: 'RRS13',
    windDir: WIND,
    durationSec: 4,
    boats: [
      tackingBoat('T', '换舷船A', -6, 0, 4),
      toward('O', '直航船B', 315, { x: 3, y: -2 }, 4, 3),
    ],
    marks: [],
    expect: { rule: '13', foulBoatId: 'T', rightBoatId: 'O' },
  },
  {
    id: 'C037',
    name: '左舷船换舷后在绕标区内仍处换舷状态，负避让义务',
    category: 'RRS13',
    windDir: WIND,
    durationSec: 4,
    // T 在标志区内换舷；O(45) 从 T 的右前方反推起点，4 秒后与 T 接触
    boats: [
      tackingBoat('T', '换舷船A', -2, 4, 4),
      toward('O', '直航船B', 45, {
        x: -2 + 2.4 - Math.sin(Math.PI / 4) * 12,
        y: 4 + 6.5 - Math.cos(Math.PI / 4) * 12,
      }, 4, 3),
    ],
    marks: [mark('M1', '上风标', 0, 12, 'windward', 8)],
    // RRS13 换舷避让义务在逼近阶段即成立（非接触判罚）
    expect: { rule: '13', foulBoatId: 'T', rightBoatId: 'O' },
  },
  {
    id: 'C038',
    name: '换舷船在直航船上风侧完成换舷且保持距离，不犯规',
    category: 'RRS13',
    windDir: WIND,
    durationSec: 4,
    boats: [
      tackingBoat('T', '换舷船A', -14, 0, 4),
      toward('O', '直航船B', 315, { x: 4, y: -2 }, 4, 3),
    ],
    marks: [],
    expect: { rule: null, expectClean: true },
  },
  {
    id: 'C039',
    name: '换舷完成后恢复正常航行，后续按同舷规则不判 RRS13',
    category: 'RRS13',
    windDir: WIND,
    durationSec: 4,
    boats: [
      tackingBoat('T', '换舷船A', -20, 0, 4),
      toward('O', '直航船B', 45, { x: 10, y: -2 }, 4, 3),
    ],
    marks: [],
    expect: { rule: null, expectClean: true },
  },
  {
    id: 'C040',
    name: '他船同时在远处换舷，两船相距充足不犯规',
    category: 'RRS13',
    windDir: WIND,
    durationSec: 4,
    boats: [
      tackingBoat('T', '换舷船A', -16, 0, 4),
      {
        id: 'O',
        name: '换舷船B',
        keyframes: [
          { t: 0, x: 16, y: 0, heading: 45, speed: 3 },
          { t: 1.6, x: 17.2, y: 3.6, heading: 8, speed: 2.4, inTacking: true },
          { t: 2.8, x: 18.4, y: 5.0, heading: 352, speed: 2.4, inTacking: true },
          { t: 4, x: 20, y: 6.5, heading: 315, speed: 3 },
        ],
      },
    ],
    marks: [],
    expect: { rule: null, expectClean: true },
  },
  {
    id: 'C041',
    name: '换舷船转帆后立即压向下风直航船，换舷船犯规',
    category: 'RRS13',
    windDir: WIND,
    durationSec: 4,
    boats: [
      tackingBoat('T', '换舷船A', -2, 0, 4),
      toward('O', '直航船B', 315, { x: 5, y: -2 }, 4, 3),
    ],
    marks: [],
    expect: { rule: '13', foulBoatId: 'T', rightBoatId: 'O', alsoRules: ['14'] },
  },
  {
    id: 'C042',
    name: '换舷中两船航向交叉但距离持续拉大，不犯规',
    category: 'RRS13',
    windDir: WIND,
    durationSec: 4,
    boats: [
      tackingBoat('T', '换舷船A', 0, 0, 4),
      toward('O', '直航船B', 135, { x: 8, y: 8 }, 4, 3),
    ],
    marks: [],
    expect: { rule: null, expectClean: true },
  },
];
