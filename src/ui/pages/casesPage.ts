/** 规则用例页：100 个测试用例分类展示，可单步运行查看引擎判罚结果 */
import { runScenario, type ScenarioCase } from '../../testkit/scenario';
import { CATEGORY_LABEL } from '../../cases';
import { allCases } from '../../cases';
import { evaluateAll, evaluateCase, type CaseResult } from '../../testkit/caseRunner';

export function renderCasesPage(runAll: boolean): HTMLElement {
  const el = document.createElement('div');
  const groups = new Map<string, ScenarioCase[]>();
  for (const c of allCases) {
    const arr = groups.get(c.category) ?? [];
    arr.push(c);
    groups.set(c.category, arr);
  }

  let passCount = 0;
  const results = runAll ? allCases.map((c) => evaluateCase(c)) : [];
  if (runAll) passCount = results.filter((r) => r.passed).length;

  el.innerHTML = `
    <div class="panel">
      <div class="panel-head">
        <h2>规则用例库（${allCases.length} 个常见犯规情形）</h2>
        ${runAll ? `<span class="badge ${passCount === allCases.length ? 'ok' : 'warn'}">判对 ${passCount}/${allCases.length}（${((passCount / allCases.length) * 100).toFixed(0)}%）</span>` : ''}
      </div>
      <p class="muted">每个用例用关键帧 DSL 构造确定性的船位/航向序列，断言引擎判出的条款号、犯规船、权利船与附带条款。</p>
    </div>
    ${[...groups.entries()]
      .map(([cat, cases]) => {
        const catResults = runAll
          ? cases.map((c) => results.find((r) => r.c.id === c.id)!)
          : [];
        const catPass = catResults.filter((r) => r.passed).length;
        return `
        <div class="panel case-group">
          <div class="panel-head">
            <h3>${CATEGORY_LABEL[cat as keyof typeof CATEGORY_LABEL]}</h3>
            ${runAll ? `<span class="muted">${catPass}/${cases.length}</span>` : ''}
          </div>
          <div class="case-list">
            ${cases
              .map((c, i) => {
                const r = runAll ? catResults[i] : null;
                const live = runScenario(c);
                const got = live.incidents[0];
                return `
                <div class="case-item ${r ? (r.passed ? 'pass' : 'fail') : ''}">
                  <div class="case-id">${c.id}</div>
                  <div class="case-name">${c.name}</div>
                  <div class="case-expect muted">期望: ${c.expect.rule ? 'RRS ' + c.expect.rule : '零判罚'} ${c.expect.foulBoatId ? '· 犯规 ' + c.expect.foulBoatId : ''}</div>
                  <div class="case-got ${got ? '' : 'clean'}">实判: ${got ? 'RRS ' + got.rule + ' / ' + got.foulBoatId : '无'}</div>
                  ${r ? `<div class="case-result ${r.passed ? 'pass' : 'fail'}">${r.passed ? '✓' : '✗ ' + r.detail}</div>` : ''}
                </div>`;
              })
              .join('')}
          </div>
        </div>`;
      })
      .join('')}
  `;
  return el;
}
