/**
 * RRS 规则元数据：条款号、中文名称与条文要点
 * 编号与《帆船竞赛规则 2021–2024》第 2 部分一致。
 */
export interface RuleMeta {
  rule: string;
  title: string;
  summary: string;
  part: 'A' | 'B' | 'C' | 'D' | 'penalty';
}

export const RULE_META: Record<string, RuleMeta> = {
  '10': {
    rule: '10',
    title: '相对舷风',
    summary: '左舷受风的船应避让右舷受风的船。',
    part: 'A',
  },
  '11': {
    rule: '11',
    title: '同舷风相联',
    summary: '两船同舷受风且相联时，上风船应避让下风船。',
    part: 'A',
  },
  '12': {
    rule: '12',
    title: '同舷风不相联',
    summary: '两船同舷受风且不相联时，后船应避让前船。',
    part: 'A',
  },
  '13': {
    rule: '13',
    title: '迎风换舷中',
    summary: '船在船首越过正迎风后、换舷完成前，应避让其他船；后越过正迎风的船应避让先越过的船。',
    part: 'A',
  },
  '14': {
    rule: '14',
    title: '避免接触',
    summary: '即使享有航行权，船舶仍应在合理可能的情况下避免接触；享有权利的船在不可能合理预见时可免责。',
    part: 'B',
  },
  '18.1': {
    rule: '18.1',
    title: '绕标区通则',
    summary: '本条在船舶需要绕过某标志、且其中至少一船在该标志的绕标区内时适用。',
    part: 'C',
  },
  '18.2(b)': {
    rule: '18.2(b)',
    title: '给予绕标空间',
    summary: '相联时外侧船应给内侧船绕标空间；第一艘入区的船清晰在前时，后船应给前船绕标空间。',
    part: 'C',
  },
  '18.2(e)': {
    rule: '18.2(e)',
    title: '后建立相联的内侧船',
    summary: '在内侧建立相联的船有权获得绕标空间，除非相联建立时外侧船已无空间可给。',
    part: 'C',
  },
  '18.3': {
    rule: '18.3',
    title: '上风标处换舷',
    summary: '在上风标绕标区内迎风换舷的船，应避让正在驶近标志的他船，且不得迫使他船高于近迎风航行。',
    part: 'C',
  },
  '19.2': {
    rule: '19.2',
    title: '障碍物旁的空间',
    summary: '相联两船在障碍物旁时，外侧船应给内侧船通过空间。',
    part: 'C',
  },
  '20': {
    rule: '20',
    title: '呼救换舷空间',
    summary: '近迎风航行的船为避让障碍物需换舷时，可呼喊要求他船换舷并给其空间；被呼喊船应响应。',
    part: 'C',
  },
  '21(a)': {
    rule: '21(a)',
    title: '免责',
    summary: '在有权获得绕标空间或通过空间的范围内航行的船，若因此违反 A 节规则，应予免责。',
    part: 'D',
  },
  '44.2': {
    rule: '44.2',
    title: '两圈解脱',
    summary: '犯规船应尽快脱离其他船舶后，做包含一次迎风换舷和一次顺风换舷的两圈旋转（720°）解脱。',
    part: 'penalty',
  },
};

export function ruleTitle(rule: string): string {
  return RULE_META[rule]?.title ?? rule;
}
