/** 应用入口：hash 路由（比赛/判罚/申诉/规则用例）与全局状态 */
import './styles.css';
import { runSimulation, SIM_DT } from '../simulation/raceSimulation';
import { renderRacePage } from './pages/racePage';
import { renderPenaltyPage } from './pages/penaltyPage';
import { renderProtestPage } from './pages/protestPage';
import { renderCasesPage } from './pages/casesPage';

const sim = runSimulation();

const state = {
  route: location.hash.replace('#/', '') || 'race',
  frameIndex: 0,
  playing: false,
  boatFilter: 'all',
  selectedIncident: null as number | null,
  replayOffset: 0,
  runCases: false,
};

const canvas = document.createElement('canvas');
canvas.width = 560;
canvas.height = 520;
const ctx = canvas.getContext('2d')!;

const navItems: { key: string; label: string }[] = [
  { key: 'race', label: '比赛页' },
  { key: 'penalty', label: '判罚记录' },
  { key: 'protest', label: '申诉回放' },
  { key: 'cases', label: '规则用例' },
];

function mount(): void {
  const app = document.querySelector('#app')!;
  app.innerHTML = `
    <header class="topbar">
      <h1>⛵ 帆船赛自动裁判系统</h1>
      <nav>
        ${navItems
          .map((n) => `<a href="#/${n.key}" class="${state.route === n.key ? 'active' : ''}">${n.label}</a>`)
          .join('')}
      </nav>
    </header>
    <main id="view"></main>
  `;
  const view = app.querySelector('#view')!;

  if (state.route === 'race') {
    view.appendChild(
      renderRacePage(
        ctx,
        { judge: sim.judge, frames: sim.frames, frameIndex: state.frameIndex, playing: state.playing },
        togglePlay,
        scrub,
      ),
    );
  } else if (state.route === 'penalty') {
    view.appendChild(renderPenaltyPage(sim.judge, state.boatFilter));
  } else if (state.route === 'protest') {
    view.appendChild(
      renderProtestPage(
        ctx,
        sim.judge,
        state.selectedIncident,
        state.replayOffset,
        selectIncident,
        review,
      ),
    );
  } else if (state.route === 'cases') {
    view.appendChild(renderCasesPage(state.runCases));
  }
}

function togglePlay(): void {
  state.playing = !state.playing;
  mount();
}

function scrub(i: number): void {
  state.frameIndex = i;
  state.playing = false;
  mount();
}

function selectIncident(seq: number): void {
  state.selectedIncident = seq;
  state.replayOffset = 0;
  mount();
}

function review(upheld: boolean): void {
  if (state.selectedIncident === null) return;
  const incident = sim.judge.incidents().find((i) => i.seq === state.selectedIncident);
  if (!incident) return;
  const protest = sim.judge.protests.file(incident, incident.foulBoatId, '玩家基于回放提起申诉');
  sim.judge.protests.review(
    protest.id,
    upheld,
    upheld ? '回放显示权利方在应有空间内被波及，依 RRS 21(a) 撤销' : '回放确认避让船未保持避让，维持原判',
    sim.judge.penalties.list(),
    incident.time,
  );
  mount();
}

// 播放循环
setInterval(() => {
  if (state.playing && state.route === 'race') {
    state.frameIndex = Math.min(state.frameIndex + 1, sim.frames.length - 1);
    if (state.frameIndex >= sim.frames.length - 1) state.playing = false;
    mount();
  }
}, SIM_DT * 1000);

window.addEventListener('hashchange', () => {
  state.route = location.hash.replace('#/', '') || 'race';
  mount();
});

window.addEventListener('filter-boat', ((e: CustomEvent) => {
  state.boatFilter = e.detail;
  mount();
}) as EventListener);

window.addEventListener('replay-scrub', ((e: CustomEvent) => {
  state.replayOffset = e.detail;
  mount();
}) as EventListener);

mount();
