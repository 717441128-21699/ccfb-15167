/** 全部 100 个规则用例的聚合入口 */
import type { ScenarioCase } from '../testkit/scenario';
import { rrs10Cases } from './cases10';
import { rrs11Cases } from './cases11';
import { rrs12Cases } from './cases12';
import { rrs13Cases } from './cases13';
import { rrs14Cases } from './cases14';
import { rrs18Cases } from './cases18';
import { rrs19Cases } from './cases19';
import { rrs20Cases } from './cases20';
import { cleanCases } from './casesClean';
import { extraCases } from './casesExtra';

export const allCases: ScenarioCase[] = [
  ...rrs10Cases,
  ...rrs11Cases,
  ...rrs12Cases,
  ...rrs13Cases,
  ...rrs14Cases,
  ...rrs18Cases,
  ...rrs19Cases,
  ...rrs20Cases,
  ...cleanCases,
  ...extraCases,
];

export const CATEGORY_LABEL: Record<ScenarioCase['category'], string> = {
  RRS10: 'RRS 10 相对舷风',
  RRS11: 'RRS 11 同舷相联',
  RRS12: 'RRS 12 同舷不相联',
  RRS13: 'RRS 13 迎风换舷',
  RRS14: 'RRS 14 避免接触',
  RRS18: 'RRS 18 绕标区',
  RRS19: 'RRS 19 障碍物空间',
  RRS20: 'RRS 20 呼救换舷',
  clean: '合规场景（零误判）',
};
