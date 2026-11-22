import { describe, expect, it } from 'vitest';
import { allCases, CATEGORY_LABEL } from '../cases';
import { evaluateAll, type CaseResult } from '../testkit/caseRunner';

describe('100 个规则用例', () => {
  const results: CaseResult[] = evaluateAll();

  it('用例总数为 100', () => {
    expect(allCases).toHaveLength(100);
  });

  for (const r of results) {
    it(`${r.c.id} [${CATEGORY_LABEL[r.c.category]}] ${r.c.name}`, () => {
      if (!r.passed) throw new Error(r.detail);
    });
  }

  it('判对率不低于 95%', () => {
    const passed = results.filter((r) => r.passed).length;
    const rate = passed / results.length;
    for (const r of results.filter((x) => !x.passed)) {
      console.warn(`✗ ${r.c.id} ${r.c.name} — ${r.detail}`);
    }
    console.log(`判对率: ${passed}/${results.length} = ${(rate * 100).toFixed(1)}%`);
    expect(rate).toBeGreaterThanOrEqual(0.95);
  });
});
