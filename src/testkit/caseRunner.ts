/**
 * 规则用例运行器：对单个 ScenarioCase 跑完整裁判流程并比对期望，
 * 供 Vitest 与 UI 规则用例页共用。
 */
import { runScenario, type ScenarioCase } from './scenario';
import { allCases } from '../cases';

export interface CaseResult {
  c: ScenarioCase;
  passed: boolean;
  detail: string;
}

/** 主条款匹配：允许精确（"18.2(b)"）或主号前缀（"18" 命中 "18.2(b)"）匹配 */
function ruleMatches(actual: string, expected: string): boolean {
  if (actual === expected) return true;
  if (!expected.includes('.') && actual.startsWith(`${expected}.`)) return true;
  return false;
}

export function evaluateCase(c: ScenarioCase): CaseResult {
  const { incidents } = runScenario(c);
  const e = c.expect;

  if (e.rule === null || e.expectClean === true) {
    if (incidents.length === 0) return { c, passed: true, detail: '合规场景，零判罚 ✓' };
    return {
      c,
      passed: false,
      detail: `期望零判罚，实际产生 ${incidents.length} 条：${incidents
        .map((i) => `RRS ${i.rule}(${i.foulBoatId})`)
        .join('、')}`,
    };
  }

  const expectedRule = String(e.rule);
  const wants14 = !!e.alsoRules?.includes('14');
  const matches = incidents.filter((i) => ruleMatches(i.rule, expectedRule));
  // 期望接触（附 14）时优先选接触事件；否则取距离最小（最接近接触）的一次
  const hit =
    (wants14 ? matches.find((i) => i.alsoRules.includes('14')) : undefined) ??
    matches.reduce<(typeof matches)[number] | undefined>(
      (best, i) => (best === undefined || i.distance < best.distance ? i : best),
      undefined,
    );
  if (!hit) {
    return {
      c,
      passed: false,
      detail: `期望判 RRS ${expectedRule}，实际判罚：${
        incidents.length ? incidents.map((i) => `RRS ${i.rule}`).join('、') : '无'
      }`,
    };
  }
  if (e.foulBoatId && hit.foulBoatId !== e.foulBoatId) {
    return { c, passed: false, detail: `犯规船期望 ${e.foulBoatId}，实际 ${hit.foulBoatId}` };
  }
  if (e.rightBoatId && hit.rightBoatId !== e.rightBoatId) {
    return { c, passed: false, detail: `权利船期望 ${e.rightBoatId}，实际 ${hit.rightBoatId}` };
  }
  if (e.markId && hit.markId !== e.markId) {
    return { c, passed: false, detail: `涉事标志期望 ${e.markId}，实际 ${hit.markId ?? '无'}` };
  }
  if (e.exoneratedBoatId && hit.exoneratedBoatId !== e.exoneratedBoatId) {
    return {
      c,
      passed: false,
      detail: `免责船期望 ${e.exoneratedBoatId}，实际 ${hit.exoneratedBoatId ?? '无'}`,
    };
  }
  if (e.alsoRules) {
    for (const r of e.alsoRules) {
      if (!hit.alsoRules.includes(r)) {
        return {
          c,
          passed: false,
          detail: `期望附带条款 RRS ${r}，实际附带：${hit.alsoRules.join('、') || '无'}`,
        };
      }
    }
  }
  return { c, passed: true, detail: `RRS ${hit.rule} → 犯规船 ${hit.foulBoatId} ✓` };
}

export function evaluateAll(): CaseResult[] {
  return allCases.map(evaluateCase);
}
