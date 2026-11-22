/**
 * 干净场景用例（9 个）：覆盖各条款下合规航行的典型局面，断言引擎「零误判」。
 * windDir=0（北风）。
 */
import type { ScenarioCase } from '../testkit/scenario';
import { mark, toward } from '../testkit/scenario';

const WIND = 0;

export const cleanCases: ScenarioCase[] = [
  {
    id: 'C079',
    name: '左舷船提前转向从右舷船船尾通过',
    category: 'clean',
    windDir: WIND,
    durationSec: 3,
    boats: [
      toward('P', '左舷船A', 45, { x: -12, y: -14 }, 3),
      toward('S', '右舷船B', 315, { x: 8, y: 16 }, 3),
    ],
    marks: [],
    expect: { rule: null, expectClean: true },
  },
  {
    id: 'C080',
    name: '上风船持续保持横向间距并行',
    category: 'clean',
    windDir: WIND,
    durationSec: 3,
    boats: [
      toward('W', '上风船A', 315, { x: -10, y: 10 }, 3),
      toward('L', '下风船B', 315, { x: 0, y: 2 }, 3),
    ],
    marks: [],
    expect: { rule: null, expectClean: true },
  },
  {
    id: 'C081',
    name: '后船保持安全距离跟随前船绕标',
    category: 'clean',
    windDir: WIND,
    durationSec: 3,
    boats: [
      toward('A', '前船A', 315, { x: 0, y: 6 }, 3),
      toward('B', '后船B', 315, { x: 0, y: -10 }, 3),
    ],
    marks: [mark('WM', '上风标', 0, 12, 'windward')],
    expect: { rule: null, expectClean: true },
  },
  {
    id: 'C082',
    name: '换舷船在空旷水域独立完成迎风换舷',
    category: 'clean',
    windDir: WIND,
    durationSec: 3,
    boats: [
      {
        id: 'T',
        name: '换舷船A',
        keyframes: [
          { t: 0, x: -10, y: 0, heading: 315, speed: 3 },
          { t: 1.2, x: -11.2, y: 3.6, heading: 352, speed: 2.4, inTacking: true },
          { t: 2.0, x: -9.8, y: 5.0, heading: 8, speed: 2.4, inTacking: true },
          { t: 3, x: -7.6, y: 6.5, heading: 45, speed: 3 },
        ],
      },
    ],
    marks: [],
    expect: { rule: null, expectClean: true },
  },
  {
    id: 'C083',
    name: '两艘右舷船交叉相遇但间距充足',
    category: 'clean',
    windDir: WIND,
    durationSec: 3,
    boats: [
      toward('A', '船A', 300, { x: -16, y: -8 }, 3),
      toward('B', '船B', 30, { x: 16, y: -8 }, 3),
    ],
    marks: [],
    expect: { rule: null, expectClean: true },
  },
  {
    id: 'C084',
    name: '绕标区内两船相联且外侧船全程给足空间',
    category: 'clean',
    windDir: WIND,
    durationSec: 3,
    boats: [
      toward('A', '内侧船A', 315, { x: -7, y: 1 }, 3),
      toward('B', '外侧船B', 315, { x: 5, y: 1 }, 3),
    ],
    marks: [mark('WM', '上风标', 0, 10, 'windward')],
    expect: { rule: null, expectClean: true },
  },
  {
    id: 'C085',
    name: '障碍物旁两船各自从两侧通过，互不影响',
    category: 'clean',
    windDir: WIND,
    durationSec: 3,
    boats: [
      toward('A', '船A', 315, { x: -12, y: 1 }, 3),
      toward('B', '船B', 45, { x: 12, y: 1 }, 3),
    ],
    marks: [mark('OB', '障碍物', 0, 10, 'obstruction')],
    expect: { rule: null, expectClean: true },
  },
  {
    id: 'C086',
    name: '整场无交汇：四艘船各自航行始终远离',
    category: 'clean',
    windDir: WIND,
    durationSec: 3,
    boats: [
      toward('A', '船A', 315, { x: -30, y: -30 }, 3),
      toward('B', '船B', 135, { x: 30, y: 30 }, 3),
      toward('C', '船C', 45, { x: -30, y: 30 }, 3),
      toward('D', '船D', 225, { x: 30, y: -30 }, 3),
    ],
    marks: [],
    expect: { rule: null, expectClean: true },
  },
  {
    id: 'C087',
    name: '下风标两船不相联先后绕标，后船在区外避让',
    category: 'clean',
    windDir: WIND,
    durationSec: 4,
    boats: [
      toward('A', '前船A', 225, { x: 0, y: 12 }, 2.5, 3),
      toward('B', '后船B', 225, { x: 0, y: 0 }, 4, 2),
    ],
    marks: [mark('LM', '下风标', 0, 4, 'leeward')],
    expect: { rule: null, expectClean: true },
  },
];
