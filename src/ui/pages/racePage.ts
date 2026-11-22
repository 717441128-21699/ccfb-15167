/** 比赛页：Canvas 实时赛场 + 播放控制 + 当前判罚/罚转状态 */
import { renderFrame, renderDistanceReadout } from '../canvasRenderer';
import type { RaceJudge } from '../../engine/raceJudge';
import type { Incident, Penalty, RaceFrame } from '../../engine/types';

export interface RacePageState {
  judge: RaceJudge;
  frames: RaceFrame[];
  frameIndex: number;
  playing: boolean;
}

export function renderRacePage(
  ctx: CanvasRenderingContext2D,
  state: RacePageState,
  onTogglePlay: () => void,
  onScrub: (i: number) => void,
): HTMLElement {
  const { judge, frames, frameIndex } = state;
  const frame = frames[frameIndex];
  const relations = judge.engine.evaluateRelations(frame);
  const recentIncidents = judge.incidents().filter((i) => i.frameNo <= frameIndex).slice(-6);
  const activePenalties = judge.penalties.list().filter((p) => !p.voided);
  const foulBoats = new Set(recentIncidents.map((i) => i.foulBoatId));

  renderFrame(ctx, frame, { relations, incidentBoatIds: foulBoats });
  renderDistanceReadout(ctx, frame);

  const el = document.createElement('div');
  el.innerHTML = `
    <div class="race-grid">
      <div class="panel canvas-panel">
        <div class="panel-head">
          <h2>实时赛场</h2>
          <span class="badge">t=${frame.time.toFixed(1)}s · 帧 ${frame.frameNo}</span>
        </div>
        <div class="hud">
          <div>来风方向: <b>${frame.windDir}°</b>（北风）</div>
          <div>船只: <b>${frame.boats.length}</b> · 标志: <b>${frame.marks.length}</b></div>
        </div>
      </div>
      <div class="panel side-panel">
        <div class="panel-head"><h2>权利与判罚</h2></div>
        <div class="incident-list">
          ${recentIncidents.length === 0 ? '<p class="muted">暂无判罚</p>' : recentIncidents.map(incidentCard).join('')}
        </div>
        <div class="panel-head" style="margin-top:14px"><h2>720° 罚转状态</h2></div>
        <div class="penalty-list">
          ${activePenalties.length === 0 ? '<p class="muted">无待执行罚转</p>' : activePenalties.map(penaltyCard).join('')}
        </div>
      </div>
    </div>
    <div class="controls panel">
      <button id="play-btn">${state.playing ? '⏸ 暂停' : '▶ 播放'}</button>
      <input id="scrub" type="range" min="0" max="${frames.length - 1}" value="${frameIndex}" />
      <span class="muted">${frameIndex}/${frames.length - 1}</span>
    </div>
  `;

  el.querySelector('#play-btn')!.addEventListener('click', onTogglePlay);
  el.querySelector('#scrub')!.addEventListener('input', (e) => {
    onScrub(Number((e.target as HTMLInputElement).value));
  });
  return el;
}

function incidentCard(i: Incident): string {
  return `
    <div class="card incident ${i.alsoRules.includes('14') ? 'contact' : ''}">
      <div class="card-row">
        <span class="rule-tag">RRS ${i.rule}</span>
        <span class="muted">t=${i.time.toFixed(1)}s</span>
      </div>
      <div class="card-desc">${i.reason}</div>
      <div class="card-row">
        <span>犯规: <b class="foul">${i.foulBoatId}</b></span>
        <span>权利: <b class="right">${i.rightBoatId}</b></span>
        <span class="muted">${i.alsoRules.map((r) => 'RRS ' + r).join('、') || '非接触妨碍'}</span>
      </div>
    </div>`;
}

function penaltyCard(p: Penalty): string {
  const pct = Math.min(100, (p.accumulatedDeg / 720) * 100);
  const statusMap: Record<string, string> = {
    pending: '待执行', in_progress: '旋转中', completed: '✓ 已解脱', failed: '✗ 未完成扣分',
  };
  return `
    <div class="card penalty status-${p.status}">
      <div class="card-row"><b>${p.boatId}</b><span class="badge">${statusMap[p.status]}</span></div>
      <div class="progress"><div class="progress-bar" style="width:${pct}%"></div></div>
      <div class="card-row muted">
        ${p.accumulatedDeg.toFixed(0)}°/720° · ${p.turns} 圈 ·
        tack ${p.hasTack ? '✓' : '✗'} · gybe ${p.hasGybe ? '✓' : '✗'}
        ${p.status === 'failed' ? ` · 扣 ${p.scoreDeduction} 分` : ''}
      </div>
    </div>`;
}
