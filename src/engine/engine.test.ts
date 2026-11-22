import { describe, expect, it } from 'vitest';
import { RaceJudge } from './raceJudge';
import { PenaltyTracker } from './penaltyTracker';
import { ReplayBuffer } from './replayBuffer';
import { ProtestRegistry } from './protest';
import type { Incident, RaceFrame } from './types';

function frame(no: number, boats: RaceFrame['boats'], windDir = 180): RaceFrame {
  return { time: no * 0.1, frameNo: no, windDir, boats, marks: [] };
}

function boat(id: string, heading: number, x = 0, y = 0, extra: { inTacking?: boolean } = {}) {
  return {
    id,
    name: id,
    x,
    y,
    heading,
    length: 4,
    speed: 3,
    tack: 'starboard' as const,
    inTacking: extra.inTacking ?? false,
  };
}

const incident = (seq: number, boatId: string): Incident => ({
  seq,
  key: `k${seq}`,
  time: seq,
  frameNo: seq * 10,
  foulBoatId: boatId,
  rightBoatId: 'B',
  rule: '10',
  alsoRules: ['14'],
  ruleTitle: '相对舷风',
  reason: '测试',
  foulPos: { x: 0, y: 0 },
  rightPos: { x: 3, y: 0 },
  distance: 2,
});

describe('PenaltyTracker 720° 罚转', () => {
  it('累计两圈且包含一次 tack + 一次 gybe 后完成解脱', () => {
    const tracker = new PenaltyTracker();
    const p = tracker.register(incident(1, 'A'));
    expect(p.status).toBe('pending');

    // 模拟连续右转：350 -> 10 (tack)，继续转到 190 (gybe)，转满 720°
    const headings = [350];
    let h = 350;
    for (let i = 0; i < 47; i++) {
      h = (h + 16) % 360; // 48 帧 × 16° ≈ 768°
      headings.push(h);
    }
    headings.forEach((hd, i) => {
      tracker.update(frame(i, [boat('A', hd), boat('B', 0, 20)]));
    });
    const done = tracker.list().find((x) => x.id === p.id)!;
    expect(done.status).toBe('completed');
    expect(done.turns).toBeGreaterThanOrEqual(2);
    expect(done.hasTack).toBe(true);
    expect(done.hasGybe).toBe(true);
  });

  it('只转一圈不满足两圈要求，赛后判 failed 并扣分', () => {
    const tracker = new PenaltyTracker(20);
    tracker.register(incident(2, 'A'));
    let h = 350;
    for (let i = 1; i <= 24; i++) {
      h = (h + 16) % 360; // 约 384°，不足两圈
      tracker.update(frame(i, [boat('A', h), boat('B', 0, 20)]));
    }
    tracker.finalize(10);
    const p = tracker.list()[0];
    expect(p.status).toBe('failed');
    expect(tracker.scoreDeductions().get('A')).toBe(20);
  });

  it('已完成的罚转不产生扣分', () => {
    const tracker = new PenaltyTracker();
    tracker.register(incident(3, 'A'));
    let h = 350;
    for (let i = 1; i <= 48; i++) {
      h = (h + 16) % 360;
      tracker.update(frame(i, [boat('A', h), boat('B', 0, 20)]));
    }
    tracker.finalize(10);
    expect(tracker.scoreDeductions().get('A')).toBeUndefined();
  });
});

describe('ReplayBuffer 回放', () => {
  it('容量满后覆盖最旧帧，并按事件时间截取 ±3s 窗口', () => {
    const buf = new ReplayBuffer(50, 10);
    for (let i = 0; i < 60; i++) buf.push(frame(i, [boat('A', 0)]));
    expect(buf.length).toBe(50);
    const win = buf.windowAround({ ...incident(1, 'A'), frameNo: 40, time: 4 }, 3);
    expect(win.frames.length).toBeLessThanOrEqual(61);
    expect(win.frames.length).toBeGreaterThan(0);
    expect(win.frames[win.incidentIndex].frameNo).toBe(40);
  });
});

describe('ProtestRegistry 申诉流程', () => {
  it('申诉成立撤销罚转，驳回维持原判', () => {
    const judge = new RaceJudge({ fps: 10 });
    const inc = incident(1, 'A');
    const penalty = judge.penalties.register(inc);
    const registry = new ProtestRegistry();

    const protest = registry.file(inc, 'A', '我认为当时已保持避让');
    expect(protest.status).toBe('filed');
    expect(registry.pending()).toHaveLength(1);

    registry.review(protest.id, true, '回放显示两船未接触且间距充足', judge.penalties.list(), 10);
    expect(penalty.voided).toBe(true);

    const inc2 = incident(2, 'A');
    const p2 = judge.penalties.register(inc2);
    const pr2 = registry.file(inc2, 'A', '再次申诉');
    registry.review(pr2.id, false, '回放确认左舷船未避让', judge.penalties.list(), 12);
    expect(p2.voided).toBeUndefined();
    expect(registry.all()).toHaveLength(2);
  });
});
