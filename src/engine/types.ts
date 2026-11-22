/**
 * 自动裁判核心类型定义
 * 对应《帆船竞赛规则(RRS)》第 2 部分「帆船相遇」与第 44 条「犯规时的惩罚」
 */

/** 左舷/右舷受风 */
export type Tack = 'port' | 'starboard';

/** 单船瞬时状态（一帧快照） */
export interface BoatState {
  id: string;
  name: string;
  /** 船首世界坐标 (米) */
  x: number;
  y: number;
  /** 船首向，度，0=北(+y)，顺时针递增，范围 [0,360) */
  heading: number;
  /** 船长（米），绕标区半径以该值为基准 */
  length: number;
  /** 航速（米/秒） */
  speed: number;
  /** 左舷 / 右舷受风（风来自的一舷） */
  tack: Tack;
  /**
   * 是否正在迎风换舷过程中（船首越过正迎风到换舷完成之间）。
   * 该标记为 true 时适用 RRS 13（换舷中应避让他船）。
   */
  inTacking: boolean;
  /**
   * RRS 20 呼喊状态（仅近迎风航段、障碍物附近有意义）：
   * - 'tack'    本船呼喊「换舷空间」
   * - 'youTack' 本船回喊「你换舷」并给空间
   */
  tackHail?: 'tack' | 'youTack';
}

/** 标志（绕标点）类型 */
export interface Mark {
  id: string;
  name: string;
  x: number;
  y: number;
  /** 绕标区半径，RRS 18 定义 = 最先到达区附近的船长的 2 倍 */
  zoneRadius: number;
  /**
   * 标志属性：
   * - windward 上风标（此处可触发 RRS 18.3 迎风换舷限制）
   * - leeward 下风标
   * - obstruction 障碍物（适用 RRS 19 障碍物旁的空间）
   */
  kind: 'windward' | 'leeward' | 'obstruction';
}

/** 一帧比赛状态 */
export interface RaceFrame {
  time: number;
  frameNo: number;
  /** 来风方向（风吹来的方向），度，与 heading 同一参考系，0=北风 */
  windDir: number;
  boats: BoatState[];
  marks: Mark[];
}

/** 犯规事件 */
export interface Incident {
  /** 引擎内自增序号 */
  seq: number;
  /** 稳定去重键（同一对船的同一次持续接触只出一条） */
  key: string;
  time: number;
  frameNo: number;
  /** 犯规船 */
  foulBoatId: string;
  /** 权利方（被避让方） */
  rightBoatId: string;
  /** 主判条款，如 "10"、"11"、"18.2(b)" */
  rule: string;
  /** 同时涉及的条款（如接触即涉及 14） */
  alsoRules: string[];
  /** 规则中文名称 */
  ruleTitle: string;
  /** 判罚说明 */
  reason: string;
  /** 犯规船当时的位置（用于画布标注） */
  foulPos: { x: number; y: number };
  rightPos: { x: number; y: number };
  /** 涉事标志（如有） */
  markId?: string;
  /** 接触点附近两船间距（米） */
  distance: number;
  /** 权利方是否被免责（RRS 21，在有权获得绕标空间时违反应避让规则可免责） */
  exoneratedBoatId?: string;
}

/** 720 度罚转状态 */
export type PenaltyStatus =
  | 'pending' // 待执行
  | 'in_progress' // 正在转
  | 'completed' // 已完成两圈
  | 'failed'; // 赛后仍未完成，按分数处罚

export interface Penalty {
  id: string;
  incidentSeq: number;
  boatId: string;
  rule: string;
  issuedAt: number;
  status: PenaltyStatus;
  /** 累计转向角度（带符号，度） */
  accumulatedDeg: number;
  /** 已完成的整圈数（需 2 圈） */
  turns: number;
  /** 罚转过程中是否包含一次迎风换舷 + 一次顺风换舷（RRS 44.2 要求） */
  hasTack: boolean;
  hasGybe: boolean;
  completedAt?: number;
  /** 赛后未完成时的扣分值 */
  scoreDeduction: number;
  /** 申诉成功后被撤销 */
  voided?: boolean;
  voidReason?: string;
}

/** 两船权利关系（供画布标注与调试） */
export interface PairRelation {
  a: string;
  b: string;
  distance: number;
  contact: boolean;
  /** 当前有航行权的船 */
  rightOfWayBoat: string;
  /** 应避让的船 */
  keepClearBoat: string;
  /** 适用条款 */
  rule: string;
  /** 同舷时是否相联 */
  overlapped: boolean;
  /** 同舷时上风船 id */
  windwardBoat?: string;
  leewardBoat?: string;
  /** 同舷非同联时在前的船 */
  aheadBoat?: string;
  asternBoat?: string;
  /** 标志空间权利方（如在区内） */
  markRoomBoat?: string;
  zoneMarkId?: string;
}

export interface EngineStepResult {
  incidents: Incident[];
  relations: PairRelation[];
}
