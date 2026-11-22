/**
 * RRS 20「呼救换舷空间」用例（6 个）：
 * 近迎风航行的船为避让障碍物可呼喊「换舷空间(tack)」，
 * 被呼喊船应换舷或回喊「你换舷(youTack)」并给空间。
 * windDir=0（北风），近迎风右舷航向 315。
 */
import type { ScenarioCase } from '../testkit/scenario';
import { mark, toward } from '../testkit/scenario';

const WIND = 0;
const OB = () => mark('OB', '障碍物', 0, 16, 'obstruction', 8);

export const rrs20Cases: ScenarioCase[] = [
  {
    id: 'C073',
    name: '呼喊船合规呼喊，被呼喊船既不换舷也不回喊，判 20',
    category: 'RRS20',
    windDir: WIND,
    durationSec: 3,
    boats: [
      toward('H', '呼喊船A', 315, { x: -6, y: 1 }, 3, 3, { tackHail: 'tack' }),
      toward('R', '被呼喊船B', 315, { x: 0, y: 1 }, 3),
    ],
    marks: [OB()],
    expect: { rule: '20', foulBoatId: 'R', rightBoatId: 'H' },
  },
  {
    id: 'C074',
    name: '呼喊船在被呼喊船响应前就开始换舷，判呼喊船违规（20.2(c)）',
    category: 'RRS20',
    windDir: WIND,
    durationSec: 3,
    boats: [
      toward('H', '呼喊船A', 315, { x: -6, y: 1 }, 3, 3, { tackHail: 'tack', inTacking: true }),
      toward('R', '被呼喊船B', 315, { x: 0, y: 1 }, 3),
    ],
    marks: [OB()],
    expect: { rule: '20', foulBoatId: 'H', rightBoatId: 'R' },
  },
  {
    id: 'C075',
    name: '接近障碍物的近距离呼喊，被呼喊船未响应，判 20',
    category: 'RRS20',
    windDir: WIND,
    durationSec: 2,
    boats: [
      toward('H', '呼喊船A', 315, { x: -6, y: 6 }, 2, 3, { tackHail: 'tack' }),
      toward('R', '被呼喊船B', 315, { x: 0, y: 6 }, 2),
    ],
    marks: [OB()],
    expect: { rule: '20', foulBoatId: 'R', rightBoatId: 'H' },
  },
  {
    id: 'C076',
    name: '被呼喊船回喊「你换舷」并给空间，不犯规',
    category: 'RRS20',
    windDir: WIND,
    durationSec: 3,
    boats: [
      toward('H', '呼喊船A', 315, { x: -6, y: 1 }, 3, 3, { tackHail: 'tack' }),
      toward('R', '被呼喊船B', 315, { x: 0, y: 1 }, 3, 3, { tackHail: 'youTack' }),
    ],
    marks: [OB()],
    expect: { rule: null, expectClean: true },
  },
  {
    id: 'C077',
    name: '被呼喊船同步开始换舷响应，不犯规',
    category: 'RRS20',
    windDir: WIND,
    durationSec: 3,
    boats: [
      toward('H', '呼喊船A', 315, { x: -6, y: 1 }, 3, 3, { tackHail: 'tack' }),
      toward('R', '被呼喊船B', 315, { x: 0, y: 1 }, 3, 3, { inTacking: true }),
    ],
    marks: [OB()],
    expect: { rule: null, expectClean: true },
  },
  {
    id: 'C078',
    name: '呼喊时两船距离过远，20 条不适用，不判罚',
    category: 'RRS20',
    windDir: WIND,
    durationSec: 3,
    boats: [
      toward('H', '呼喊船A', 315, { x: -20, y: 1 }, 3, 3, { tackHail: 'tack' }),
      toward('R', '被呼喊船B', 315, { x: 0, y: 1 }, 3),
    ],
    marks: [OB()],
    expect: { rule: null, expectClean: true },
  },
];
