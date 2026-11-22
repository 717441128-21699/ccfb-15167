/**
 * 判罚引擎：逐帧评估船对之间的权利关系并产生犯规事件。
 *
 * 实现的 RRS 条款：
 *   A 节（航行权） 10 相对舷风 / 11 同舷相联 / 12 同舷不相联 / 13 迎风换舷中
 *   B 节（一般限制）14 避免接触（有航行权且无损坏时按 14(b) 免责）
 *   C 节（绕标/障碍）18.2(b)(e) 绕标空间 / 18.3 上风标换舷 / 19.2 障碍物空间 / 20 呼救换舷
 *   D 节（免责）21(a) 在有权获得的空间内航行免责
 *
 * 工程简化（在规则用例页中注明）：
 *   1. 「合理可能避免接触」按几何接近度近似，RRS 14(b) 下权利方无损坏即免责；
 *   2. RRS 18.2(e) 假定外侧船始终有空间可给；
 *   3. 两船同时换舷的先后次序不做区分（测试用例不覆盖该罕见情形）。
 */
import {
  angleDiff,
  contactThreshold,
  dist,
  headingVec,
  isContact,
  isOverlapped,
  inZone,
  norm360,
  windwardBoat,
} from './geometry';
import { ruleTitle } from './rulesMeta';
import type {
  BoatState,
  EngineStepResult,
  Incident,
  Mark,
  PairRelation,
  RaceFrame,
} from './types';

/** 非接触式「未保持避让」判定系数：接近到接触阈值的多少倍即算妨碍 */
const KEEP_CLEAR_FACTOR = 1.6;

interface MarkRuntime {
  markId: string;
  inside: Set<string>;
  /** 第一艘入区的船 */
  firstEntryBoatId?: string;
  /** 第一艘入区时与之相联的船及内外侧（船 id -> 是否内侧） */
  overlapAtEntry: Map<string, boolean>;
  /** 已在区内完成过迎风换舷的船（用于 18.3） */
  tackedInZone: Set<string>;
  /** 已完成绕标的船 */
  passed: Set<string>;
}

interface PairRuntime {
  activeKey?: string;
}

interface BoatPrev {
  heading: number;
  tack: BoatState['tack'];
  inTacking: boolean;
  insideMarks: Set<string>;
}

interface PairVerdict {
  rule: string;
  alsoRules: string[];
  rightBoat: BoatState;
  keepClearBoat: BoatState;
  mark?: Mark;
  exoneratedBoatId?: string;
  reason: string;
}

export class RulesEngine {
  private seq = 0;
  private marks = new Map<string, MarkRuntime>();
  private pairs = new Map<string, PairRuntime>();
  private prev = new Map<string, BoatPrev>();

  /** 评估一帧，返回本帧新产生的犯规事件与全部船对关系（供画布标注） */
  step(frame: RaceFrame): EngineStepResult {
    this.ensureMarks(frame);
    this.updateMarkStates(frame);

    const incidents: Incident[] = [];
    const relations: PairRelation[] = [];
    const boats = frame.boats;

    for (let i = 0; i < boats.length; i++) {
      for (let j = i + 1; j < boats.length; j++) {
        const a = boats[i];
        const b = boats[j];
        const pairKey = pairId(a.id, b.id);
        const rt = this.pairs.get(pairKey) ?? { activeKey: undefined };
        this.pairs.set(pairKey, rt);

        const contact = isContact(a, b);
        const distance = dist(a.x, a.y, b.x, b.y);
        const overlapped = isOverlapped(a, b);
        const verdict = this.judgePair(a, b, frame, contact, distance, overlapped);

        relations.push(this.buildRelation(a, b, frame, contact, distance, overlapped, verdict));

        const breach = verdict && this.isBreach(a, b, verdict, contact, distance);
        if (breach) {
          // 接触/非接触分别建 key：早期非接触事件不会阻止真正接触时产生带 RRS14 的事件
          const key = `${verdict.rule}:${verdict.keepClearBoat.id}|${verdict.rightBoat.id}:${verdict.mark?.id ?? 'open'}:${contact ? 'c' : 'n'}`;
          if (rt.activeKey !== key) {
            rt.activeKey = key;
            incidents.push(this.buildIncident(frame, verdict, key, contact, distance));
          }
        } else {
          rt.activeKey = undefined;
        }
      }
    }

    this.updatePrev(frame);
    return { incidents, relations };
  }

  /**
   * 纯评估：只计算某一帧的船对权利关系（不修改任何运行时状态），
   * 供 UI 渲染/回放使用，避免重复 step 污染事件日志。
   */
  evaluateRelations(frame: RaceFrame): PairRelation[] {
    const relations: PairRelation[] = [];
    const boats = frame.boats;
    for (let i = 0; i < boats.length; i++) {
      for (let j = i + 1; j < boats.length; j++) {
        const a = boats[i];
        const b = boats[j];
        const contact = isContact(a, b);
        const distance = dist(a.x, a.y, b.x, b.y);
        const overlapped = isOverlapped(a, b);
        const verdict = this.judgePair(a, b, frame, contact, distance, overlapped);
        relations.push(this.buildRelation(a, b, frame, contact, distance, overlapped, verdict));
      }
    }
    return relations;
  }

  // ---------------------------------------------------------------- A/B/C 节

  private judgePair(
    a: BoatState,
    b: BoatState,
    frame: RaceFrame,
    contact: boolean,
    distance: number,
    overlapped: boolean,
  ): PairVerdict | null {
    // ---- A 节：航行权归属 ----
    let row: BoatState;
    let keep: BoatState;
    let sectionARule: string;

    if (a.inTacking || b.inTacking) {
      // RRS 13：换舷中的船避让；两船同时换舷的罕见情形不区分
      keep = a.inTacking ? a : b;
      row = keep === a ? b : a;
      sectionARule = '13';
    } else if (a.tack !== b.tack) {
      // RRS 10：左舷让右舷
      row = a.tack === 'starboard' ? a : b;
      keep = row === a ? b : a;
      sectionARule = '10';
    } else if (overlapped) {
      // RRS 11：上风让下风
      const wId = windwardBoat(a, b, frame.windDir);
      keep = wId === a.id ? a : b;
      row = keep === a ? b : a;
      sectionARule = '11';
    } else {
      // RRS 12：后船让前船（投影更靠前的为前船）
      const va = headingVec(a.heading);
      const projB = (b.x - a.x) * va.x + (b.y - a.y) * va.y;
      keep = projB > 0 ? a : b; // b 在 a 前方 => a 是后船
      row = keep === a ? b : a;
      sectionARule = '12';
    }

    const alsoRules: string[] = [];
    if (contact) alsoRules.push('14');

    // ---- C 节：绕标区 / 障碍物 ----
    const markVerdict = this.judgeMarks(a, b, frame, row, keep, sectionARule, contact);
    if (markVerdict) {
      // 合并外层（如接触 14）与标志判定自带的附带条款，去重
      const merged = [...new Set([...alsoRules, ...markVerdict.alsoRules])];
      return { ...markVerdict, alsoRules: merged };
    }

    // ---- RRS 20：呼救换舷（障碍物附近） ----
    const hailVerdict = this.judgeHail(a, b, row, keep, distance);
    if (hailVerdict) return { ...hailVerdict, alsoRules };

    return {
      rule: sectionARule,
      alsoRules,
      rightBoat: row,
      keepClearBoat: keep,
      reason: this.rowReason(sectionARule, keep, row),
    };
  }

  /** C 节绕标/障碍物判定，返回 null 表示不适用 */
  private judgeMarks(
    a: BoatState,
    b: BoatState,
    frame: RaceFrame,
    row: BoatState,
    keep: BoatState,
    sectionARule: string,
    contact: boolean,
  ): PairVerdict | null {
    for (const mark of frame.marks) {
      const ms = this.marks.get(mark.id)!;
      const aIn = ms.inside.has(a.id);
      const bIn = ms.inside.has(b.id);
      if (!aIn && !bIn) continue;
      if (ms.passed.has(a.id) && ms.passed.has(b.id)) continue;

      // 障碍物类型 => RRS 19
      if (mark.kind === 'obstruction') {
        if (a.tack === b.tack && !a.inTacking && !b.inTacking && isOverlapped(a, b)) {
          const inside = this.insideBoat(a, b, mark);
          const outside = inside === a ? b : a;
          return {
            rule: '19.2',
            alsoRules: contact ? [sectionARule, '14'] : [sectionARule],
            rightBoat: inside,
            keepClearBoat: outside,
            mark,
            exoneratedBoatId: inside.id === keep.id ? inside.id : undefined,
            reason: `障碍物旁相联航行，外侧船 ${outside.name} 未给内侧船 ${inside.name} 留出通过空间（RRS 19.2）`,
          };
        }
        continue;
      }

      // 上风标 + 区内换舷 => RRS 18.3（优先于 10/13 的一般适用）
      if (mark.kind === 'windward') {
        const tacker = ms.tackedInZone.has(a.id) && !ms.tackedInZone.has(b.id)
          ? a
          : ms.tackedInZone.has(b.id) && !ms.tackedInZone.has(a.id)
            ? b
            : undefined;
        if (tacker) {
          const other = tacker === a ? b : a;
          if (!other.inTacking) {
            return {
              rule: '18.3',
              alsoRules: contact ? ['14'] : [],
              rightBoat: other,
              keepClearBoat: tacker,
              mark,
              reason: `上风标绕标区内迎风换舷的 ${tacker.name} 应避让驶近标志的 ${other.name}，且不得迫使其高于近迎风航行（RRS 18.3）`,
            };
          }
        }
        // 相反舷风迎风航段：18.2 不适用，回到 RRS 10
        if (a.tack !== b.tack) continue;
      }

      // RRS 18.2：绕标空间权利方
      const entitled = this.markRoomBoat(ms, mark, a, b);
      if (!entitled) continue;
      const giver = entitled === a ? b : a;

      // 权利方在其应得空间内航行却违反 A 节 => 21(a) 免责，外侧船按 18.2(b) 担责
      if (keep.id === entitled.id) {
        return {
          rule: '18.2(b)',
          alsoRules: contact ? ['14', '21(a)'] : ['21(a)'],
          rightBoat: entitled,
          keepClearBoat: giver,
          mark,
          exoneratedBoatId: entitled.id,
          reason: `外侧船 ${giver.name} 未给内侧/在前的 ${entitled.name} 绕标空间；${entitled.name} 在有权获得的空间内航行，依 RRS 21(a) 免责`,
        };
      }

      // 外侧船本就是避让方：A 节判罚继续有效，18.2 同时成立
      if (keep.id === giver.id) {
        return {
          rule: sectionARule,
          alsoRules: contact ? ['14', '18.2(b)'] : ['18.2(b)'],
          rightBoat: row,
          keepClearBoat: keep,
          mark,
          reason: `${this.rowReason(sectionARule, keep, row)}；同时 ${giver.name} 负有给 ${entitled.name} 绕标空间的义务（RRS 18.2(b)）`,
        };
      }
    }
    return null;
  }

  /** 依 18.2(b)/(e) 确定有权获得绕标空间的船；无适用关系时返回 null */
  private markRoomBoat(
    ms: MarkRuntime,
    mark: Mark,
    a: BoatState,
    b: BoatState,
  ): BoatState | null {
    if (ms.firstEntryBoatId === undefined) return null;
    const first = ms.firstEntryBoatId === a.id ? a : b;
    const other = first === a ? b : a;

    // 入区时相联：内侧船有权
    const otherInside = ms.overlapAtEntry.get(other.id);
    if (otherInside !== undefined) {
      return otherInside ? other : first;
    }
    // 入区时清晰在前：前船有权；区内后来建立相联按 18.2(e) 内侧船仍有权
    if (isOverlapped(a, b)) {
      return this.insideBoat(a, b, mark);
    }
    return first;
  }

  /**
   * 相联两船中的内侧船。
   * 内侧 = 位于另一船与标志之间的船。用叉积判定 B 相对「A→标志」连线的侧别，
   * 再结合 A 航向判断绕标内侧，纯拓扑判定、与两船到标志的绝对距离无关。
   */
  private insideBoat(a: BoatState, b: BoatState, mark: Mark): BoatState {
    // 向量 A->M 与 A->B 的叉积：>0 表示 B 在 A->M 连线的左侧
    const amx = mark.x - a.x;
    const amy = mark.y - a.y;
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const cross = amx * aby - amy * abx;
    // A 的右正横方向；标志在 A 的哪一侧决定绕标内侧方向
    const va = headingVec(a.heading);
    const markOnRight = va.y * amx - va.x * amy > 0;
    // 实测：A 在内侧时 cross<0 且标志在 A 右侧 => markOnRight 时 cross<0 表示 A 在内
    const aIsInside = markOnRight ? cross < 0 : cross > 0;
    if (Math.abs(cross) < 1e-9) {
      return dist(a.x, a.y, mark.x, mark.y) <= dist(b.x, b.y, mark.x, mark.y) ? a : b;
    }
    return aIsInside ? a : b;
  }

  /** RRS 20 呼喊迎风换舷空间 */
  private judgeHail(
    a: BoatState,
    b: BoatState,
    row: BoatState,
    keep: BoatState,
    distance: number,
  ): PairVerdict | null {
    const hailRange = contactThreshold(a, b) * 4;
    if (distance > hailRange) return null;

    const hailer = a.tackHail === 'tack' ? a : b.tackHail === 'tack' ? b : null;
    if (!hailer) return null;
    const responder = hailer === a ? b : a;

    // 20.2(c)：呼喊船在被呼喊船响应前换舷 => 呼喊船违规
    if (hailer.inTacking && responder.tackHail !== 'youTack') {
      return {
        rule: '20',
        alsoRules: [],
        rightBoat: responder,
        keepClearBoat: hailer,
        reason: `${hailer.name} 呼喊换舷空间后，在 ${responder.name} 响应前即开始换舷（RRS 20.2(c)）`,
      };
    }
    // 被呼喊船未换舷也未回喊「你换舷」=> 违规
    if (!responder.inTacking && responder.tackHail !== 'youTack') {
      return {
        rule: '20',
        alsoRules: [],
        rightBoat: hailer,
        keepClearBoat: responder,
        reason: `${hailer.name} 依 RRS 20 呼喊换舷空间，${responder.name} 未换舷也未回喊响应`,
      };
    }
    return null;
  }

  // ---------------------------------------------------------------- 违规成立

  /**
   * 违规成立条件：
   *  - 发生接触；或
   *  - 接近到安全距离内且两船距离仍在缩短（避让船未能保持避让）。
   */
  private isBreach(
    a: BoatState,
    b: BoatState,
    verdict: PairVerdict,
    contact: boolean,
    distance: number,
  ): boolean {
    if (contact) return true;
    // RRS 20 呼喊违规是程序性违规，不要求两船接近或接触
    if (verdict.rule === '20') return true;
    const limit = contactThreshold(a, b) * KEEP_CLEAR_FACTOR;
    if (distance > limit) return false;
    const k = verdict.keepClearBoat;
    const r = verdict.rightBoat;
    const vk = headingVec(k.heading);
    const vr = headingVec(r.heading);
    // 距离变化率 d(d)/dt = (r-k)·(vr-vk)/d；负值 = 两船在接近（与谁主动无关，覆盖追尾/横压）
    const rvx = r.speed * vr.x - k.speed * vk.x;
    const rvy = r.speed * vr.y - k.speed * vk.y;
    const dx = r.x - k.x;
    const dy = r.y - k.y;
    const distRate = (rvx * dx + rvy * dy) / Math.max(distance, 0.001);
    return distRate < -0.25;
  }

  // ---------------------------------------------------------------- 标志状态

  private ensureMarks(frame: RaceFrame): void {
    for (const mark of frame.marks) {
      if (!this.marks.has(mark.id)) {
        this.marks.set(mark.id, {
          markId: mark.id,
          inside: new Set(),
          overlapAtEntry: new Map(),
          tackedInZone: new Set(),
          passed: new Set(),
        });
      }
    }
  }

  private updateMarkStates(frame: RaceFrame): void {
    for (const mark of frame.marks) {
      const ms = this.marks.get(mark.id)!;
      const nowInside = new Set<string>();
      for (const boat of frame.boats) {
        if (!inZone(boat, mark.x, mark.y, mark.zoneRadius)) continue;
        nowInside.add(boat.id);

        if (!ms.inside.has(boat.id)) {
          // 新入区：记录第一艘入区船，以及入区时与之相联的他船的内外侧
          if (ms.firstEntryBoatId === undefined) {
            ms.firstEntryBoatId = boat.id;
            for (const other of frame.boats) {
              if (other.id === boat.id) continue;
              if (isOverlapped(boat, other)) {
                const inner = this.insideBoat(boat, other, mark);
                ms.overlapAtEntry.set(other.id, inner.id === other.id);
              }
            }
          }
        }

        // 区内发生迎风换舷 => 18.3 追踪
        // 情形1：检测到受风舷切换且经过迎风半圆（容忍大转角漏帧）
        const prev = this.prev.get(boat.id);
        if (prev && ms.inside.has(boat.id) && prev.tack !== boat.tack) {
          const nearEye =
            Math.abs(angleDiff(frame.windDir, prev.heading)) < 110 ||
            Math.abs(angleDiff(frame.windDir, boat.heading)) < 110;
          if (nearEye) ms.tackedInZone.add(boat.id);
        }
        // 情形2：显式 inTacking 标记结束（换舷完成的那一帧）即视为已换舷
        if (prev?.inTacking && !boat.inTacking && ms.inside.has(boat.id)) {
          ms.tackedInZone.add(boat.id);
        }
        // 情形3：在区内进入换舷状态时立即登记（覆盖换舷全程都在区内的情形）
        if (boat.inTacking && ms.inside.has(boat.id)) {
          ms.tackedInZone.add(boat.id);
        }
      }

      // 统一补登区内当前相联关系（18.2(e)：后建立相联的内侧船仍有权）
      if (ms.firstEntryBoatId !== undefined) {
        for (const boat of frame.boats) {
          if (!ms.inside.has(boat.id) || boat.id === ms.firstEntryBoatId) continue;
          const first = frame.boats.find((x) => x.id === ms.firstEntryBoatId);
          if (first && ms.inside.has(first.id) && isOverlapped(first, boat) && !ms.overlapAtEntry.has(boat.id)) {
            const inner = this.insideBoat(first, boat, mark);
            ms.overlapAtEntry.set(boat.id, inner.id === boat.id);
          }
        }
      }

      // 出区且远离 => 视为已绕过
      for (const id of ms.inside) {
        if (!nowInside.has(id)) {
          const boat = frame.boats.find((x) => x.id === id);
          if (boat && dist(boat.x, boat.y, mark.x, mark.y) > mark.zoneRadius * 1.4) {
            ms.passed.add(id);
          }
        }
      }

      // 所有船都远离标志 => 复位该标志的运行时状态
      const allClear = frame.boats.every(
        (boat) => dist(boat.x, boat.y, mark.x, mark.y) > mark.zoneRadius * 1.5,
      );
      if (allClear && nowInside.size === 0) {
        ms.firstEntryBoatId = undefined;
        ms.overlapAtEntry.clear();
        ms.tackedInZone.clear();
        ms.passed.clear();
      }
      ms.inside = nowInside;
    }
  }

  private updatePrev(frame: RaceFrame): void {
    for (const boat of frame.boats) {
      const inside = new Set<string>();
      for (const mark of frame.marks) {
        if (inZone(boat, mark.x, mark.y, mark.zoneRadius)) inside.add(mark.id);
      }
      this.prev.set(boat.id, {
        heading: boat.heading,
        tack: boat.tack,
        inTacking: boat.inTacking,
        insideMarks: inside,
      });
    }
  }

  // ---------------------------------------------------------------- 构造输出

  private buildIncident(
    frame: RaceFrame,
    verdict: PairVerdict,
    key: string,
    contact: boolean,
    distance: number,
  ): Incident {
    const k = verdict.keepClearBoat;
    const r = verdict.rightBoat;
    this.seq += 1;
    return {
      seq: this.seq,
      key,
      time: frame.time,
      frameNo: frame.frameNo,
      foulBoatId: k.id,
      rightBoatId: r.id,
      rule: verdict.rule,
      alsoRules: [...new Set(verdict.alsoRules)],
      ruleTitle: ruleTitle(verdict.rule),
      reason: `${verdict.reason}${contact ? '两船发生接触。' : '已妨碍权利船航行。'}`,
      foulPos: { x: k.x, y: k.y },
      rightPos: { x: r.x, y: r.y },
      markId: verdict.mark?.id,
      distance,
      exoneratedBoatId: verdict.exoneratedBoatId,
    };
  }

  private buildRelation(
    a: BoatState,
    b: BoatState,
    frame: RaceFrame,
    contact: boolean,
    distance: number,
    overlapped: boolean,
    verdict: PairVerdict | null,
  ): PairRelation {
    const rel: PairRelation = {
      a: a.id,
      b: b.id,
      distance,
      contact,
      rightOfWayBoat: verdict ? verdict.rightBoat.id : '',
      keepClearBoat: verdict ? verdict.keepClearBoat.id : '',
      rule: verdict ? verdict.rule : '',
      overlapped,
    };
    if (a.tack === b.tack && !a.inTacking && !b.inTacking) {
      const wId = windwardBoat(a, b, frame.windDir);
      rel.windwardBoat = wId;
      rel.leewardBoat = wId === a.id ? b.id : a.id;
      if (!overlapped) {
        const va = headingVec(a.heading);
        const projB = (b.x - a.x) * va.x + (b.y - a.y) * va.y;
        rel.aheadBoat = projB > 0 ? b.id : a.id;
        rel.asternBoat = projB > 0 ? a.id : b.id;
      }
    }
    if (verdict?.mark) {
      rel.zoneMarkId = verdict.mark.id;
      rel.markRoomBoat = verdict.rule.startsWith('18') || verdict.rule === '19.2'
        ? verdict.rightBoat.id
        : undefined;
    }
    return rel;
  }

  private rowReason(rule: string, keep: BoatState, row: BoatState): string {
    switch (rule) {
      case '10':
        return `左舷受风的 ${keep.name} 应避让右舷受风的 ${row.name}（RRS 10）`;
      case '11':
        return `同舷相联时上风船 ${keep.name} 应避让下风船 ${row.name}（RRS 11）`;
      case '12':
        return `同舷不相联时后船 ${keep.name} 应避让前船 ${row.name}（RRS 12）`;
      case '13':
        return `迎风换舷中的 ${keep.name} 应避让 ${row.name}（RRS 13）`;
      default:
        return `${keep.name} 应避让 ${row.name}（RRS ${rule}）`;
    }
  }
}

function pairId(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}
