/**
 * 抗议/申诉流程（RRS 第 5 章「抗议与补偿」的游戏化简化）：
 * 玩家对判罚提出申诉 -> 裁判组回看犯规前后船位 -> 维持或撤销。
 * 申诉成立 => 撤销对应罚转与扣分。
 */
import type { Incident, Penalty } from './types';

export type ProtestStatus = 'filed' | 'upheld' | 'dismissed';

export interface Protest {
  id: string;
  incidentSeq: number;
  penaltyId: string;
  /** 提起申诉的船 */
  boatId: string;
  reason: string;
  status: ProtestStatus;
  createdAt: number;
  reviewedAt?: number;
  reviewNote?: string;
}

export class ProtestRegistry {
  private list: Protest[] = [];
  private counter = 0;

  /** 针对一条犯规事件提起申诉 */
  file(incident: Incident, boatId: string, reason: string): Protest {
    this.counter += 1;
    const protest: Protest = {
      id: `PR-${String(this.counter).padStart(3, '0')}`,
      incidentSeq: incident.seq,
      penaltyId: `PEN-${incident.seq}`,
      boatId,
      reason,
      status: 'filed',
      createdAt: incident.time,
    };
    this.list.push(protest);
    return protest;
  }

  /**
   * 复核结论。
   * @param upheld true=申诉成立，撤销判罚；false=维持原判
   */
  review(
    id: string,
    upheld: boolean,
    note: string,
    penalties: readonly Penalty[],
    time: number,
  ): Protest {
    const protest = this.list.find((p) => p.id === id);
    if (!protest) throw new Error(`申诉不存在: ${id}`);
    protest.status = upheld ? 'upheld' : 'dismissed';
    protest.reviewedAt = time;
    protest.reviewNote = note;

    if (upheld) {
      const penalty = penalties.find((p) => p.id === protest.penaltyId);
      if (penalty) {
        penalty.voided = true;
        penalty.voidReason = note;
      }
    }
    return protest;
  }

  all(): readonly Protest[] {
    return this.list;
  }

  pending(): readonly Protest[] {
    return this.list.filter((p) => p.status === 'filed');
  }
}
