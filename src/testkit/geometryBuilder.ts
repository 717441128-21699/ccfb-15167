/**
 * 程序化相遇几何构造器：
 * 在「局部坐标系」里定义两船关系（下风船 L 朝局部 +y，上风 = 局部 +x），
 * 再整体旋转到世界航向 base。从数学上保证相联（纵向投影差恒为 0）与正横闭合。
 */
import type { BoatSpec } from './scenario';

export interface Pt {
  x: number;
  y: number;
}

/** 世界坐标：航向角（北顺时针）转单位向量 */
function hv(headingDeg: number): Pt {
  const r = (headingDeg * Math.PI) / 180;
  return { x: Math.sin(r), y: Math.cos(r) };
}

/** 把局部坐标（forward=沿base, right=base右正横）旋转平移到世界坐标 */
function toWorld(localForward: number, localRight: number, base: number, origin: Pt): Pt {
  const f = hv(base);
  const right = { x: f.y, y: -f.x }; // base 右正横
  return {
    x: origin.x + f.x * localForward + right.x * localRight,
    y: origin.y + f.y * localForward + right.y * localRight,
  };
}

/**
 * 构造一对在标志绕标区内相联汇聚的船（RRS18 用）。
 * 两船同舷、沿 base 驶向 mark，内侧船 inside 更靠近标志，外侧船 outside 逐步挤压，
 * T 秒后在标志来向一侧接触。保证入区时已相联，firstEntry 记录到内侧权利。
 */
export function buildMarkRoomPair(opts: {
  base: number;
  mark: { x: number; y: number };
  T: number;
  threshold: number;
  contact: boolean;
  clean?: boolean;
}): { inside: BoatSpec; outside: BoatSpec } {
  const { base, mark, T, threshold } = opts;
  const f = hv(base);
  const beamClose = 1.4;
  // contact：闭合到阈值下 0.2m；non-contact：阈值上 1m；clean：阈值上 4m（远超安全距离，零判罚）
  const tail = opts.clean ? 4.0 : opts.contact ? -0.2 : 1.0;
  const gap = beamClose * T + threshold + tail;

  // 相遇点：标志来向一侧 3m（给入区留出距离，保证接触发生在区内）
  const meet = { x: mark.x - f.x * 3, y: mark.y - f.y * 3 };
  // 局部坐标转世界：forward 沿 base，right 为 base 右正横
  const toWorld = (lf: number, lr: number): Pt => ({
    x: meet.x + f.x * lf + f.y * lr,
    y: meet.y + f.y * lf - f.x * lr,
  });

  // 内侧 A 纵向靠前 0.8m 保证先入区；A 在下风内侧、B 在上风外侧，
  // B 同时是 RRS11 避让方与绕标空间给与方 => 18.2(b) + 21(a) 免责
  const aStart = toWorld(-3 * T + 0.8, gap / 2);
  const bStart = toWorld(-3 * T, -gap / 2);
  // 外侧 B 朝内侧 A 闭合（B 在左正横，顺时针 +δ 偏转），纵向分量补偿到 3
  const delta = (Math.atan(beamClose / 3) * 180) / Math.PI;
  const bHeading = base + delta;
  const speedB = 3 / Math.cos((delta * Math.PI) / 180);

  return {
    inside: {
      id: 'A',
      name: '内侧船A',
      keyframes: [
        { t: 0, x: aStart.x, y: aStart.y, heading: base, speed: 3 },
        { t: T, x: aStart.x + f.x * 3 * T, y: aStart.y + f.y * 3 * T, heading: base, speed: 3 },
      ],
    },
    outside: {
      id: 'B',
      name: '外侧船B',
      keyframes: [
        { t: 0, x: bStart.x, y: bStart.y, heading: bHeading, speed: speedB },
        {
          t: T,
          x: bStart.x + hv(bHeading).x * speedB * T,
          y: bStart.y + hv(bHeading).y * speedB * T,
          heading: bHeading,
          speed: speedB,
        },
      ],
    },
  };
}

export function buildOverlapPair(
  base: number,
  T: number,
  threshold: number,
  nonContact: boolean,
): { w: BoatSpec; l: BoatSpec } {
  const beamClose = 1.6;
  // 目标闭合到阈值之下 0.2m，确保 isContact（<=）稳定成立；非接触场景停在阈值之上 1m（仍在安全距离内）
  const gap = beamClose * T + threshold - 0.2 + (nonContact ? 1.2 : 0);

  // 求来风方向（windDir=0 => 朝北 (0,1)）在 base 的哪一侧正横。
  const f = hv(base);
  const right = { x: f.y, y: -f.x };
  const wind = { x: 0, y: 1 };
  const windOnRight = wind.x * right.x + wind.y * right.y > 0;
  // 上风船 W 放在来风所在的正横侧
  const windRight = windOnRight ? gap : -gap;

  // L 起点局部坐标 forward=-3T, right=0；世界原点取 (0,0) 为相遇点
  const lStartLocal = { f: -3 * T, r: 0 };
  const wStartLocal = { f: -3 * T, r: windRight };
  const lStart = toWorld(lStartLocal.f, lStartLocal.r, base, { x: 0, y: 0 });
  const wStart = toWorld(wStartLocal.f, wStartLocal.r, base, { x: 0, y: 0 });

  // W 朝下风（来风的反方向正横侧）偏转。
  // 要求：纵向分量 speedW·cosδ = 3（纵向不分离），正横分量 speedW·sinδ = beamClose
  // 两式相除 => tanδ = beamClose/3
  const delta = (Math.atan(beamClose / 3) * 180) / Math.PI;
  // 来风在右正横 => 下风在左 => W 逆时针(-)；来风在左 => W 顺时针(+)
  const wHeading = windOnRight ? base - delta : base + delta;
  // 补偿 W 航速，使其沿 base 的纵向分量仍为 3，纵向投影差恒为 0
  const speedW = 3 / Math.cos((delta * Math.PI) / 180);

  return {
    w: {
      id: 'W',
      name: '上风船A',
      keyframes: [
        { t: 0, x: wStart.x, y: wStart.y, heading: wHeading, speed: speedW },
        { t: T, x: wStart.x + hv(wHeading).x * speedW * T, y: wStart.y + hv(wHeading).y * speedW * T, heading: wHeading, speed: speedW },
      ],
    },
    l: {
      id: 'L',
      name: '下风船B',
      keyframes: [
        { t: 0, x: lStart.x, y: lStart.y, heading: base, speed: 3 },
        { t: T, x: lStart.x + hv(base).x * 3 * T, y: lStart.y + hv(base).y * 3 * T, heading: base, speed: 3 },
      ],
    },
  };
}
