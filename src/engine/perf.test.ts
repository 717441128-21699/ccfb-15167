import { describe, expect, it } from 'vitest';
import { RulesEngine } from './rules';
import type { BoatState, RaceFrame } from './types';

function makeBoat(id: string, x: number, y: number, heading: number, tack: BoatState['tack']): BoatState {
  return { id, name: id, x, y, heading, length: 4, speed: 3, tack, inTacking: false };
}

/** 生成 N 艘船在随机位置汇聚的一帧（确定性伪随机，避免 flaky） */
function crowdedFrame(n: number, frameNo: number): RaceFrame {
  const boats: BoatState[] = [];
  for (let i = 0; i < n; i++) {
    const seed = (i * 97 + frameNo * 31) % 200;
    const x = (seed % 40) - 20;
    const y = ((seed * 7) % 40) - 20;
    const heading = (seed * 13) % 360;
    boats.push(makeBoat(`B${i}`, x, y, heading, i % 2 ? 'port' : 'starboard'));
  }
  return { time: frameNo * 0.1, frameNo, windDir: 180, boats, marks: [] };
}

describe('判罚引擎性能', () => {
  it('单帧判定耗时不超过 1ms（8 船规模，连续 1000 帧）', () => {
    const engine = new RulesEngine();
    // 预热（JIT）
    for (let f = 0; f < 50; f++) engine.step(crowdedFrame(8, f));

    const N = 1000;
    const samples: number[] = [];
    for (let f = 0; f < N; f++) {
      const fr = crowdedFrame(8, f + 100);
      const t0 = performance.now();
      engine.step(fr);
      samples.push(performance.now() - t0);
    }
    const avg = samples.reduce((s, x) => s + x, 0) / N;
    const p95 = [...samples].sort((a, b) => a - b)[Math.floor(N * 0.95)];
    const max = Math.max(...samples);
    console.log(`单帧耗时 avg=${avg.toFixed(4)}ms p95=${p95.toFixed(4)}ms max=${max.toFixed(4)}ms`);
    expect(avg).toBeLessThan(1);
    expect(p95).toBeLessThan(1);
  });

  it('两船常规局面单帧耗时远低于 1ms', () => {
    const engine = new RulesEngine();
    const fr: RaceFrame = {
      time: 0,
      frameNo: 0,
      windDir: 180,
      boats: [makeBoat('A', -3, -3, 350, 'port'), makeBoat('B', 3, 3, 190, 'starboard')],
      marks: [
        { id: 'M1', name: '上风标', x: 0, y: 10, zoneRadius: 8, kind: 'windward' },
        { id: 'M2', name: '障碍物', x: 10, y: 0, zoneRadius: 8, kind: 'obstruction' },
      ],
    };
    for (let f = 0; f < 20; f++) engine.step({ ...fr, frameNo: f, time: f * 0.1 });
    const t0 = performance.now();
    for (let f = 0; f < 1000; f++) engine.step({ ...fr, frameNo: f + 100, time: f * 0.1 });
    const avg = (performance.now() - t0) / 1000;
    console.log(`两船单帧平均耗时=${avg.toFixed(4)}ms`);
    expect(avg).toBeLessThan(1);
  });
});
