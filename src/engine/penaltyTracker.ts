/**
 * RRS 44.2 两圈解脱（720°）罚转追踪与赛后记分。
 *
 * 要求：犯规船尽快脱离他船后，做两圈旋转，
 * 且每圈包含一次迎风换舷(tack)与一次顺风换舷(gybe)。
 * 比赛结束仍未完成 => 成绩扣分（默认 20 分，可配置）。
 */
import { angleDiff, deriveTack, norm360 } from './geometry';
import type { BoatState, Incident, Penalty, RaceFrame, Tack } from './types';

export const DEFAULT_SCORE_DEDUCTION = 20;

export class PenaltyTracker {
  private penalties: Penalty[] = [];
  private lastHeading = new Map<string, number>();
  private lastTack = new Map<string, Tack>();
  private lastInEye = new Map<string, boolean>();
  private pendingByIncident = new Map<number, string>();

  constructor(private readonly scoreDeduction: number = DEFAULT_SCORE_DEDUCTION) {}

  /** 引擎产生犯规事件后登记一条待执行罚转 */
  register(incident: Incident): Penalty {
    const existing = this.pendingByIncident.get(incident.seq);
    if (existing) return this.penalties.find((p) => p.id === existing)!;

    const penalty: Penalty = {
      id: `PEN-${incident.seq}`,
      incidentSeq: incident.seq,
      boatId: incident.foulBoatId,
      rule: incident.rule,
      issuedAt: incident.time,
      status: 'pending',
      accumulatedDeg: 0,
      turns: 0,
      hasTack: false,
      hasGybe: false,
      scoreDeduction: this.scoreDeduction,
    };
    this.penalties.push(penalty);
    this.pendingByIncident.set(incident.seq, penalty.id);
    return penalty;
  }

  /** 逐帧更新各船罚转进度 */
  update(frame: RaceFrame): void {
    for (const boat of frame.boats) {
      const prevHeading = this.lastHeading.get(boat.id);
      if (prevHeading === undefined) {
        this.lastHeading.set(boat.id, boat.heading);
        this.lastTack.set(boat.id, deriveTack(boat.heading, frame.windDir));
        this.lastInEye.set(boat.id, this.inEyeOfWind(boat, frame.windDir));
        continue;
      }
      const delta = angleDiff(boat.heading, prevHeading); // 带符号的本帧转角
      this.lastHeading.set(boat.id, boat.heading);

      // 换舷事件状态机：受风舷切换 => tack（经过正迎风）或 gybe（经过顺风）
      const prevTack = this.lastTack.get(boat.id)!;
      const newTack = deriveTack(boat.heading, frame.windDir);
      const wasInEye = this.lastInEye.get(boat.id)!;
      const inEye = this.inEyeOfWind(boat, frame.windDir);
      this.lastTack.set(boat.id, newTack);
      this.lastInEye.set(boat.id, inEye);
      const tacked = newTack !== prevTack && (wasInEye || inEye);
      const gybed = newTack !== prevTack && !wasInEye && !inEye;

      const active = this.penalties.filter(
        (p) => p.boatId === boat.id && (p.status === 'pending' || p.status === 'in_progress'),
      );
      if (active.length === 0) continue;

      for (const p of active) {
        if (p.status === 'pending') {
          // 开始旋转的第一帧
          if (Math.abs(delta) > 0.05) p.status = 'in_progress';
          else continue;
        }
        // 累计实际旋转角度（不模 360，否则永远无法达到 720°）
        p.accumulatedDeg += Math.abs(delta);
        if (tacked) p.hasTack = true;
        if (gybed) p.hasGybe = true;

        const fullTurns = Math.floor(p.accumulatedDeg / 360);
        if (fullTurns > p.turns) {
          p.turns = fullTurns;
          // 两圈且包含一次迎风换舷 + 一次顺风换舷 => 有效解脱
          if (p.hasTack && p.hasGybe && p.turns >= 2) {
            p.status = 'completed';
            p.completedAt = frame.time;
          }
        }
      }
    }
  }

  /** 船首是否在正迎风 ±90° 的迎风半圆内（用于区分 tack / gybe） */
  private inEyeOfWind(boat: BoatState, windDir: number): boolean {
    return Math.abs(angleDiff(windDir, boat.heading)) < 90;
  }

  /** 比赛结束：未完成的罚转转为 failed 并生成扣分明细 */
  finalize(endTime: number): Penalty[] {
    for (const p of this.penalties) {
      if (p.status !== 'completed') {
        p.status = 'failed';
        p.completedAt = endTime;
      }
    }
    return this.penalties;
  }

  list(): readonly Penalty[] {
    return this.penalties;
  }

  /** 每船当前应扣分（仅统计未完成的罚转） */
  scoreDeductions(): Map<string, number> {
    const out = new Map<string, number>();
    for (const p of this.penalties) {
      if (p.status === 'failed') {
        out.set(p.boatId, (out.get(p.boatId) ?? 0) + p.scoreDeduction);
      }
    }
    return out;
  }

  pendingCount(boatId: string): number {
    return this.penalties.filter(
      (p) => p.boatId === boatId && (p.status === 'pending' || p.status === 'in_progress'),
    ).length;
  }

  /** 找到某船最近一条未完成罚转（UI 高亮用） */
  activePenalty(boatId: string): Penalty | undefined {
    return this.penalties.find(
      (p) => p.boatId === boatId && (p.status === 'pending' || p.status === 'in_progress'),
    );
  }
}
