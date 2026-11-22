/**
 * 裁判门面：把规则引擎、罚转追踪、回放缓冲、抗议申诉串成一条逐帧流水线。
 */
import { PenaltyTracker } from './penaltyTracker';
import { ReplayBuffer, type ReplayWindow } from './replayBuffer';
import { RulesEngine } from './rules';
import { ProtestRegistry } from './protest';
import type {
  EngineStepResult,
  Incident,
  Penalty,
  RaceFrame,
} from './types';
export type { ReplayWindow } from './replayBuffer';

export interface JudgeOptions {
  fps: number;
  /** 回放保留秒数 */
  replaySeconds: number;
  scoreDeduction: number;
}

export class RaceJudge {
  readonly engine: RulesEngine;
  readonly penalties: PenaltyTracker;
  readonly replay: ReplayBuffer;
  readonly protests: ProtestRegistry;
  private readonly incidentLog: Incident[] = [];

  constructor(opts: Partial<JudgeOptions> = {}) {
    const fps = opts.fps ?? 10;
    const replaySeconds = opts.replaySeconds ?? 30;
    this.engine = new RulesEngine();
    this.penalties = new PenaltyTracker(opts.scoreDeduction ?? 20);
    this.replay = new ReplayBuffer(Math.ceil(replaySeconds * fps), fps);
    this.protests = new ProtestRegistry();
  }

  /** 处理一帧：判罚 -> 登记罚转 -> 更新罚转进度 -> 写入回放 */
  step(frame: RaceFrame): EngineStepResult & { newPenalties: Penalty[] } {
    const result = this.engine.step(frame);
    const newPenalties: Penalty[] = [];
    for (const inc of result.incidents) {
      this.incidentLog.push(inc);
      newPenalties.push(this.penalties.register(inc));
    }
    this.penalties.update(frame);
    this.replay.push(frame);
    return { ...result, newPenalties };
  }

  incidents(): readonly Incident[] {
    return this.incidentLog;
  }

  /** 比赛结束，未完成罚转转为扣分 */
  finish(endTime: number) {
    return this.penalties.finalize(endTime);
  }

  /** 取犯规前后的回放窗口（默认 ±3 秒） */
  replayFor(incident: Incident, windowSec = 3): ReplayWindow {
    return this.replay.windowAround(incident, windowSec);
  }
}
