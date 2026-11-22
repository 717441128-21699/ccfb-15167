/** 判罚记录页：全部犯规事件与罚转/扣分明细，支持按船筛选 */
import { RULE_META } from '../../engine/rulesMeta';
import type { RaceJudge } from '../../engine/raceJudge';

export function renderPenaltyPage(judge: RaceJudge, boatFilter: string): HTMLElement {
  const incidents = judge.incidents();
  const penalties = judge.penalties.list();
  const boats = [...new Set(incidents.map((i) => i.foulBoatId))].sort();

  const filtered = boatFilter === 'all' ? incidents : incidents.filter((i) => i.foulBoatId === boatFilter);

  const el = document.createElement('div');
  el.innerHTML = `
    <div class="panel">
      <div class="panel-head">
        <h2>判罚记录（${filtered.length} 条）</h2>
        <select id="boat-filter">
          <option value="all" ${boatFilter === 'all' ? 'selected' : ''}>全部船只</option>
          ${boats.map((b) => `<option value="${b}" ${boatFilter === b ? 'selected' : ''}>${b}</option>`).join('')}
        </select>
      </div>
      <table class="data-table">
        <thead>
          <tr><th>时间</th><th>条款</th><th>条款名称</th><th>犯规船</th><th>权利船</th><th>附带条款</th><th>距离</th><th>说明</th></tr>
        </thead>
        <tbody>
          ${filtered
            .map((i) => `
            <tr>
              <td>${i.time.toFixed(1)}s</td>
              <td><span class="rule-tag">${i.rule}</span></td>
              <td>${i.ruleTitle}</td>
              <td class="foul">${i.foulBoatId}</td>
              <td class="right">${i.rightBoatId}</td>
              <td>${i.alsoRules.map((r) => r).join('、') || '—'}</td>
              <td>${i.distance.toFixed(1)}m</td>
              <td class="muted">${i.reason}</td>
            </tr>`)
            .join('')}
        </tbody>
      </table>
    </div>
    <div class="panel" style="margin-top:16px">
      <div class="panel-head"><h2>罚转与记分（RRS 44.2）</h2></div>
      <table class="data-table">
        <thead><tr><th>罚转 ID</th><th>船</th><th>状态</th><th>累计角度</th><th>圈数</th><th>tack</th><th>gybe</th><th>扣分</th></tr></thead>
        <tbody>
          ${penalties
            .map((p) => `
            <tr>
              <td>${p.id}</td><td>${p.boatId}</td>
              <td><span class="badge status-${p.status}">${p.status}</span>${p.voided ? ' <span class="badge void">已撤销</span>' : ''}</td>
              <td>${p.accumulatedDeg.toFixed(0)}°</td><td>${p.turns}</td>
              <td>${p.hasTack ? '✓' : '✗'}</td><td>${p.hasGybe ? '✓' : '✗'}</td>
              <td>${p.status === 'failed' ? `-${p.scoreDeduction}` : '—'}</td>
            </tr>`)
            .join('')}
        </tbody>
      </table>
      <p class="muted" style="margin-top:10px">
        规则：犯规船须尽快做包含一次迎风换舷(tack)和一次顺风换舷(gybe)的 720° 两圈旋转；
        赛后仍未完成则计 ${penalties[0]?.scoreDeduction ?? 20} 分扣罚。申诉成立可撤销罚转。
      </p>
    </div>
    <div class="panel" style="margin-top:16px">
      <div class="panel-head"><h2>条款速查</h2></div>
      <div class="rule-grid">
        ${Object.values(RULE_META)
          .map((m) => `<div class="rule-chip"><b>RRS ${m.rule}</b><span>${m.title}</span><small class="muted">${m.summary}</small></div>`)
          .join('')}
      </div>
    </div>
  `;

  el.querySelector('#boat-filter')!.addEventListener('change', (e) => {
    const v = (e.target as HTMLSelectElement).value;
    globalThis.dispatchEvent(new CustomEvent('filter-boat', { detail: v }));
  });
  return el;
}
