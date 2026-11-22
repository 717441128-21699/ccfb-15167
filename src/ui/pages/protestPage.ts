/** 申诉页：对犯规提起抗议，回看犯规前后 ±3 秒船位，并做出维持/撤销裁决 */
import { renderFrame } from '../canvasRenderer';
import type { RaceJudge } from '../../engine/raceJudge';

export function renderProtestPage(
  ctx: CanvasRenderingContext2D,
  judge: RaceJudge,
  selectedIncidentSeq: number | null,
  replayFrameOffset: number,
  onSelect: (seq: number) => void,
  onReview: (upheld: boolean) => void,
): HTMLElement {
  const incidents = judge.incidents();
  const protests = judge.protests.all();
  const protestMap = new Map(protests.map((p) => [p.incidentSeq, p]));

  const el = document.createElement('div');
  el.innerHTML = `
    <div class="protest-grid">
      <div class="panel">
        <div class="panel-head"><h2>可申诉犯规（${incidents.length}）</h2></div>
        <div class="incident-select">
          ${incidents
            .map((i) => {
              const pr = protestMap.get(i.seq);
              return `
              <div class="card incident selectable ${selectedIncidentSeq === i.seq ? 'selected' : ''}" data-seq="${i.seq}">
                <div class="card-row">
                  <span class="rule-tag">RRS ${i.rule}</span>
                  <span class="muted">t=${i.time.toFixed(1)}s</span>
                  ${pr ? `<span class="badge status-${pr.status === 'upheld' ? 'completed' : 'failed'}">${pr.status === 'upheld' ? '已撤销判罚' : '维持原判'}</span>` : ''}
                </div>
                <div class="card-desc">${i.reason}</div>
              </div>`;
            })
            .join('')}
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><h2>回放（犯规前后 ±3 秒）</h2></div>
        <div id="replay-canvas-slot"></div>
        <div id="replay-controls"></div>
        <div id="review-actions"></div>
      </div>
    </div>
  `;

  el.querySelectorAll('.incident-select .card').forEach((card) => {
    card.addEventListener('click', () => onSelect(Number((card as HTMLElement).dataset.seq)));
  });

  // 回放画布
  const slot = el.querySelector('#replay-canvas-slot')!;
  if (selectedIncidentSeq !== null) {
    const incident = incidents.find((i) => i.seq === selectedIncidentSeq);
    if (incident) {
      const window = judge.replayFor(incident);
      const idx = Math.max(0, Math.min(replayFrameOffset, window.frames.length - 1));
      const frame = window.frames[idx];
      const relations = judge.engine.evaluateRelations(frame);
      renderFrame(ctx, frame, {
        relations,
        highlightFrame: incident.frameNo,
        incidentBoatIds: new Set([incident.foulBoatId, incident.rightBoatId]),
      });
      slot.innerHTML = '';
      slot.appendChild(ctx.canvas);

      const ctrls = el.querySelector('#replay-controls')!;
      ctrls.innerHTML = `
        <div class="controls">
          <span class="muted">窗口帧 ${idx + 1}/${window.frames.length}（事件位于第 ${window.incidentIndex + 1} 帧）</span>
          <input id="replay-scrub" type="range" min="0" max="${window.frames.length - 1}" value="${idx}" />
        </div>
        <p class="muted">事件: RRS ${incident.rule} · ${incident.reason}</p>
      `;
      ctrls.querySelector('#replay-scrub')!.addEventListener('input', (e) => {
        globalThis.dispatchEvent(new CustomEvent('replay-scrub', { detail: Number((e.target as HTMLInputElement).value) }));
      });

      const existing = protestMap.get(incident.seq);
      const actions = el.querySelector('#review-actions')!;
      actions.innerHTML = existing
        ? `<p class="muted">已复核：${existing.reviewNote ?? ''}（${existing.status === 'upheld' ? '申诉成立，判罚撤销' : '申诉驳回，维持原判'}）</p>`
        : `
        <div class="review-btns">
          <button id="uphold" class="btn-primary">申诉成立 · 撤销判罚</button>
          <button id="dismiss" class="btn-secondary">驳回 · 维持原判</button>
        </div>
        <p class="muted">复核依据 RRS 21(a) 免责与回放船位：若权利方在应有绕标空间内被波及，可撤销。</p>`;
      actions.querySelector('#uphold')?.addEventListener('click', () => onReview(true));
      actions.querySelector('#dismiss')?.addEventListener('click', () => onReview(false));
    }
  } else {
    slot.innerHTML = '<p class="muted">← 从左侧选择一条犯规查看回放并申诉</p>';
  }

  return el;
}
