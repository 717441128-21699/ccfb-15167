/**
 * Canvas 赛场渲染器：绘制标志绕标区、船舶（含航向/受风舷）、
 * 来风方向、两船相对位置、接触高亮与权利关系标注。
 */
import type { BoatState, Mark, PairRelation, RaceFrame } from '../engine/types';
import { dist } from '../engine/geometry';

export interface RenderOptions {
  relations: PairRelation[];
  /** 当前高亮的犯规事件帧（用于申诉回放） */
  highlightFrame?: number;
  incidentBoatIds?: Set<string>;
}

const SCALE = 9; // 像素/米
const ORIGIN = { x: 260, y: 300 };

function worldToScreen(x: number, y: number): { sx: number; sy: number } {
  return { sx: ORIGIN.x + x * SCALE, sy: ORIGIN.y - y * SCALE };
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  frame: RaceFrame,
  opts: RenderOptions,
): void {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);

  // 背景网格
  ctx.strokeStyle = '#16202e';
  ctx.lineWidth = 1;
  for (let gx = 0; gx < width; gx += 30) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, height);
    ctx.stroke();
  }
  for (let gy = 0; gy < height; gy += 30) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(width, gy);
    ctx.stroke();
  }

  drawWind(ctx, frame.windDir);
  for (const mark of frame.marks) drawMark(ctx, mark);
  drawRelations(ctx, frame, opts.relations);
  for (const boat of frame.boats) {
    drawBoat(ctx, boat, opts.incidentBoatIds?.has(boat.id) ?? false);
  }
}

function drawWind(ctx: CanvasRenderingContext2D, windDir: number): void {
  const { sx, sy } = worldToScreen(-24, 34);
  ctx.save();
  ctx.translate(sx, sy);
  ctx.fillStyle = '#7dd3fc';
  ctx.font = '12px sans-serif';
  ctx.fillText('来风', -14, -28);
  // 风羽箭头（指向来风方向）
  const r = (windDir * Math.PI) / 180;
  const vx = Math.sin(r);
  const vy = -Math.cos(r); // 屏幕 y 向下
  ctx.strokeStyle = '#7dd3fc';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-vx * 18, -vy * 18);
  ctx.lineTo(vx * 18, vy * 18);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(vx * 18, vy * 18);
  ctx.lineTo(vx * 18 - 6, vy * 18 + 5);
  ctx.moveTo(vx * 18, vy * 18);
  ctx.lineTo(vx * 18 + 5, vy * 18 + 6);
  ctx.stroke();
  ctx.restore();
}

function drawMark(ctx: CanvasRenderingContext2D, mark: Mark): void {
  const { sx, sy } = worldToScreen(mark.x, mark.y);
  // 绕标区
  ctx.beginPath();
  ctx.arc(sx, sy, mark.zoneRadius * SCALE, 0, Math.PI * 2);
  ctx.fillStyle = mark.kind === 'obstruction' ? 'rgba(234,179,8,0.08)' : 'rgba(125,211,252,0.08)';
  ctx.fill();
  ctx.strokeStyle = mark.kind === 'obstruction' ? 'rgba(234,179,8,0.5)' : 'rgba(125,211,252,0.5)';
  ctx.setLineDash([6, 5]);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.setLineDash([]);
  // 标志点
  ctx.beginPath();
  ctx.arc(sx, sy, 5, 0, Math.PI * 2);
  ctx.fillStyle = mark.kind === 'obstruction' ? '#eab308' : '#7dd3fc';
  ctx.fill();
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '11px sans-serif';
  ctx.fillText(mark.name, sx + 8, sy - 6);
  ctx.fillText(`区${mark.zoneRadius}m`, sx + 8, sy + 8);
}

function drawBoat(ctx: CanvasRenderingContext2D, boat: BoatState, isFoul: boolean): void {
  const { sx, sy } = worldToScreen(boat.x, boat.y);
  const len = boat.length * SCALE;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate((boat.heading * Math.PI) / 180);
  // 船体三角形（屏幕坐标系旋转）
  ctx.beginPath();
  ctx.moveTo(0, -len / 2);
  ctx.lineTo(len / 4, len / 2);
  ctx.lineTo(-len / 4, len / 2);
  ctx.closePath();
  ctx.fillStyle = isFoul ? '#ef4444' : boatColor(boat.id);
  ctx.fill();
  ctx.strokeStyle = isFoul ? '#fca5a5' : '#e2e8f0';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // 标签：船名 + 受风舷
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '11px sans-serif';
  ctx.fillText(`${boat.name}`, sx + 10, sy - 8);
  ctx.fillStyle = boat.tack === 'starboard' ? '#7dd3fc' : '#fca5a5';
  ctx.fillText(boat.tack === 'starboard' ? '右舷' : '左舷', sx + 10, sy + 6);
  if (boat.inTacking) {
    ctx.fillStyle = '#f5a524';
    ctx.fillText('换舷中', sx + 10, sy + 20);
  }
}

function boatColor(id: string): string {
  const map: Record<string, string> = {
    S: '#2f7df6', P: '#e5484d', W: '#f5a524', L: '#30a46c',
    A: '#2f7df6', B: '#e5484d', T: '#a78bfa', O: '#14b8a6', H: '#f5a524', R: '#30a46c',
  };
  return map[id] ?? '#64748b';
}

function drawRelations(ctx: CanvasRenderingContext2D, frame: RaceFrame, relations: PairRelation[]): void {
  for (const rel of relations) {
    if (rel.distance > 12) continue; // 只标注接近的船对
    const a = frame.boats.find((b) => b.id === rel.a);
    const b = frame.boats.find((b) => b.id === rel.b);
    if (!a || !b) continue;
    const pa = worldToScreen(a.x, a.y);
    const pb = worldToScreen(b.x, b.y);
    const touching = rel.contact;
    ctx.beginPath();
    ctx.moveTo(pa.sx, pa.sy);
    ctx.lineTo(pb.sx, pb.sy);
    ctx.strokeStyle = touching ? 'rgba(239,68,68,0.9)' : 'rgba(250,204,21,0.5)';
    ctx.lineWidth = touching ? 2.5 : 1;
    ctx.setLineDash(touching ? [] : [4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    if (touching) {
      const mx = (pa.sx + pb.sx) / 2;
      const my = (pa.sy + pb.sy) / 2;
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`接触 RRS${rel.rule}`, mx + 4, my - 4);
    }
  }
}

/** 渲染比例尺与距离读数（供调试/回放） */
export function renderDistanceReadout(
  ctx: CanvasRenderingContext2D,
  frame: RaceFrame,
): void {
  const readings: string[] = [];
  for (let i = 0; i < frame.boats.length; i++) {
    for (let j = i + 1; j < frame.boats.length; j++) {
      const d = dist(
        frame.boats[i].x, frame.boats[i].y,
        frame.boats[j].x, frame.boats[j].y,
      );
      readings.push(`${frame.boats[i].id}-${frame.boats[j].id}: ${d.toFixed(1)}m`);
    }
  }
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px monospace';
  readings.forEach((txt, i) => ctx.fillText(txt, 12, 20 + i * 15));
}
