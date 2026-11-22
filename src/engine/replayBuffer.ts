/**
 * 回放环形缓冲：保存最近 N 秒的完整帧，供申诉页回看犯规前后船位。
 * 固定容量、零分配热路径（满了覆盖最旧帧）。
 */
import type { Incident, RaceFrame } from './types';

export interface ReplayWindow {
  frames: RaceFrame[];
  incident: Incident;
  /** incident 在 frames 中的下标 */
  incidentIndex: number;
}

export class ReplayBuffer {
  private buffer: RaceFrame[] = [];
  private head = 0;
  private size = 0;

  constructor(
    private readonly capacityFrames: number,
    private readonly fps: number,
  ) {}

  push(frame: RaceFrame): void {
    if (this.capacityFrames <= 0) return;
    if (this.size < this.capacityFrames) {
      this.buffer[(this.head + this.size) % this.capacityFrames] = frame;
      this.size++;
    } else {
      this.buffer[this.head] = frame;
      this.head = (this.head + 1) % this.capacityFrames;
    }
  }

  /** 按时间从旧到新取出全部缓冲帧 */
  snapshots(): RaceFrame[] {
    const out: RaceFrame[] = [];
    for (let i = 0; i < this.size; i++) {
      out.push(this.buffer[(this.head + i) % this.capacityFrames]);
    }
    return out;
  }

  /**
   * 截取犯规事件前后各 windowSec 秒的帧序列。
   * 缓冲不足时返回实际可用的全部帧。
   */
  windowAround(incident: Incident, windowSec = 3): ReplayWindow {
    const half = Math.round(windowSec * this.fps);
    const all = this.snapshots();
    let center = all.findIndex((f) => f.frameNo === incident.frameNo);
    if (center < 0) {
      // 事件帧已被覆盖：取最接近时间的帧
      let best = 0;
      let bestDiff = Infinity;
      for (let i = 0; i < all.length; i++) {
        const d = Math.abs(all[i].time - incident.time);
        if (d < bestDiff) {
          bestDiff = d;
          best = i;
        }
      }
      center = best;
    }
    const start = Math.max(0, center - half);
    const end = Math.min(all.length, center + half + 1);
    return {
      frames: all.slice(start, end),
      incident,
      incidentIndex: center - start,
    };
  }

  get length(): number {
    return this.size;
  }
}
