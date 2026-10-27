// Vista isométrica generada a partir de los datos de la pieza, con el kit de Anatomy.
// Muros lejanos completos (con el perfil del techo), muros cercanos cortados a 14 cm.
import * as kitModule from "./iso-kit.mjs";
import * as latheModule from "./lathe.mjs";
import { CATALOG } from "../model/catalog";
import { boxOf, ceilAt, itemSize, present, type Box } from "../model/geometry";
import type { Placed, Room, Side } from "../model/types";

// El kit es JavaScript sin tipos: se usa tal cual.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const k: any = kitModule;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const G: any = latheModule;

const CUT = 14;
type P3 = [number, number, number];

export const VIEWS = [
  { azimuth: 315, label: "Desde la esquina superior derecha" },
  { azimuth: 45, label: "Desde la esquina inferior derecha" },
  { azimuth: 135, label: "Desde la esquina inferior izquierda" },
  { azimuth: 225, label: "Desde la esquina superior izquierda" },
];

const NORMAL: Record<Side, [number, number]> = { N: [0, 1], S: [0, -1], W: [1, 0], E: [-1, 0] };

interface Part { box: Box; z: number; svg: string }

export function buildIso(room: Room, furniture: Placed[], view: number, width = 640, height = 520) {
  const W = room.size.w, D = room.size.d, T = room.wallT;
  const top = room.ceiling + 8;
  const P = k.fitProjection(k.boxCorners({ x: -T, y: -T, w: W + 2 * T, d: D + 2 * T, r: 0 }, -5, top), width, height, {
    pad: 24,
    azimuth: VIEWS[view].azimuth,
    elevation: 34,
  });
  const V: [number, number] = k.towardViewer(P);
  const at = (p: P3) => k.iso(p, P);
  const S = (paths: unknown, style: Record<string, unknown> = {}) => k.solidSvg(paths, style);
  const L = (d: string, style: Record<string, unknown> = {}) => k.lineSvg(d, style);
  const slab = (x: number, y: number, w: number, d: number, z: number, h: number, r = 0, bevel = 0) => k.slabOf({ x, y, w, d, r }, z, h, P, r ? 4 : 2, bevel);
  const facing = (n: [number, number]) => n[0] * V[0] + n[1] * V[1] > 1e-6;
  const ceil = (x: number, y: number) => ceilAt(room, Math.min(W, Math.max(0, x)), Math.min(D, Math.max(0, y)));
  const poly = (pts: P3[], style: string) => `<path d="M${pts.map((p) => at(p).join(" ")).join("L")}Z" style="${style}"/>`;

  const back: string[] = [], front: string[] = [];

  // Piso
  const floor = { x: -T, y: -T, w: W + 2 * T, d: D + 2 * T, r: 0 };
  back.push(`<path class="iso-halo" d="${k.haloOf(floor, -5, 5, P)}"/>`, S(k.slabOf(floor, -5, 5, P, 2), { tone: "lo" }));

  // Muros
  const wallGeom = {
    N: { o: [-T, 0, 0] as P3, a: [0, -1, 0] as P3, u: [1, 0, 0] as P3, L: W + 2 * T, pt: (s: number): [number, number] => [-T + s, 0] },
    S: { o: [-T, D, 0] as P3, a: [0, 1, 0] as P3, u: [1, 0, 0] as P3, L: W + 2 * T, pt: (s: number): [number, number] => [-T + s, D] },
    W: { o: [0, -T, 0] as P3, a: [-1, 0, 0] as P3, u: [0, 1, 0] as P3, L: D + 2 * T, pt: (s: number): [number, number] => [0, -T + s] },
    E: { o: [W, -T, 0] as P3, a: [1, 0, 0] as P3, u: [0, 1, 0] as P3, L: D + 2 * T, pt: (s: number): [number, number] => [W, -T + s] },
  };
  const sides: Side[] = ["N", "S", "W", "E"];
  const far = sides.filter((s) => facing(NORMAL[s]));
  const near = sides.filter((s) => !facing(NORMAL[s]));
  const onSide = (p: [number, number], s: Side) => ({ N: p[1] <= 0.5, S: p[1] >= D - 0.5, W: p[0] <= 0.5, E: p[0] >= W - 0.5 })[s];

  for (const s of far) {
    const g = wallGeom[s];
    const marks = new Set([0, g.L]);
    if (room.slope) {
      const r = room.slope.run, br = { W: r, E: W - r, N: r, S: D - r }[room.slope.side];
      const horizontal = s === "N" || s === "S";
      const across = (room.slope.side === "W" || room.slope.side === "E") === horizontal;
      if (across) marks.add(br + T);
    }
    const us = [...marks].sort((a, b) => a - b);
    const profile: [number, number][] = [[0, 0], [g.L, 0], ...us.slice().reverse().map((u) => [u, ceil(...g.pt(u))] as [number, number])];
    const F = G.frameOf(g.o, g.a, g.u, [0, 0, 1]);
    back.push(S(G.prismOf(F, profile, 0, T, P), { tone: "mid" }));
  }

  // Arranque del techo inclinado sobre el muro bajo, cuando ese muro queda al fondo
  if (room.slope && far.includes(room.slope.side)) {
    const sl = room.slope, rise = (room.ceiling - sl.low) / sl.run, depth = 24;
    const g = wallGeom[sl.side];
    const inward: P3 = [NORMAL[sl.side][0], NORMAL[sl.side][1], 0];
    const F = G.frameOf(g.o, g.u, inward, [0, 0, 1]);
    const section: [number, number][] = [[-T, sl.low - T * rise], [depth, sl.low + depth * rise], [depth, sl.low + depth * rise + 8], [-T, sl.low - T * rise + 8]];
    back.push(S(G.prismOf(F, section, 0, g.L, P), { tone: "lo" }));
    const a = g.pt(0), b = g.pt(g.L);
    back.push(L(k.segment([a[0] + inward[0] * 0.2, a[1] + inward[1] * 0.2, sl.low - 4], [b[0] + inward[0] * 0.2, b[1] + inward[1] * 0.2, sl.low - 4], P), { tone: "faint" }));
  }

  // Ventanas y puertas sobre muros del fondo: dibujadas en la cara interior
  for (const win of room.windows) {
    const side = sides.find((s) => onSide(win.a, s) && onSide(win.b, s))!;
    const n = NORMAL[side];
    const off = (p: [number, number], z: number): P3 => [p[0] + n[0] * 0.4, p[1] + n[1] * 0.4, z];
    if (far.includes(side)) {
      back.push(poly([off(win.a, win.sill), off(win.b, win.sill), off(win.b, win.head), off(win.a, win.head)], "fill:#7fb6d9;fill-opacity:.35;stroke:var(--anatomy-mid, #888);stroke-width:1"));
      const mid: [number, number] = [(win.a[0] + win.b[0]) / 2, (win.a[1] + win.b[1]) / 2];
      back.push(L(k.segment(off(mid, win.sill), off(mid, win.head), P), { tone: "mid" }));
    } else {
      // Muro cercano cortado: la ventana se dibuja sola, con vidrio, para no tapar la pieza
      const x0 = Math.min(win.a[0], win.b[0]), x1 = Math.max(win.a[0], win.b[0]), y0 = Math.min(win.a[1], win.b[1]), y1 = Math.max(win.a[1], win.b[1]);
      const horizontal = y0 === y1;
      const cx = horizontal ? 0 : (side === "W" ? -T : W), cy = horizontal ? (side === "N" ? -T : D) : 0;
      const box = (u0: number, u1: number, z0: number, h: number) => (horizontal ? slab(u0, cy, u1 - u0, T, z0, h) : slab(cx, u0, T, u1 - u0, z0, h));
      const pane = (u0: number, u1: number) => {
        const pts: P3[] = horizontal
          ? [[u0, cy + T / 2, win.sill], [u1, cy + T / 2, win.sill], [u1, cy + T / 2, win.head], [u0, cy + T / 2, win.head]]
          : [[cx + T / 2, u0, win.sill], [cx + T / 2, u1, win.sill], [cx + T / 2, u1, win.head], [cx + T / 2, u0, win.head]];
        return poly(pts, "fill:#7fb6d9;fill-opacity:.22;stroke:none");
      };
      const a0 = horizontal ? x0 : y0, a1 = horizontal ? x1 : y1, mid = (a0 + a1) / 2;
      front.push(S(box(a0 - 2, a1 + 2, win.sill - 4, 4), { tone: "mid" }));
      front.push(pane(a0 + 5, mid - 2), pane(mid + 2, a1 - 5));
      front.push(S(box(mid - 2, mid + 2, win.sill, win.head - win.sill), { tone: "mid", crease: "none" }));
      front.push(S(box(a0, a0 + 5, win.sill, win.head - win.sill), { tone: "mid" }), S(box(a1 - 5, a1, win.sill, win.head - win.sill), { tone: "mid" }));
      front.push(S(box(a0, a1, win.head, 6), { tone: "mid" }));
    }
  }

  // Muros cercanos: cortados a 14 cm, con el vano de las puertas
  for (const s of near) {
    const horizontal = s === "N" || s === "S";
    const L0 = -T, L1 = (horizontal ? W : D) + T;
    const gaps: [number, number][] = room.doors
      .filter((dr) => onSide(dr.hinge, s))
      .map((dr) => {
        const c = [dr.hinge[0] + dr.closed[0] * dr.width, dr.hinge[1] + dr.closed[1] * dr.width];
        const u0 = horizontal ? Math.min(dr.hinge[0], c[0]) : Math.min(dr.hinge[1], c[1]);
        return [u0, u0 + dr.width] as [number, number];
      })
      .sort((a, b) => a[0] - b[0]);
    let from = L0;
    const pieces: [number, number][] = [];
    for (const [g0, g1] of gaps) { if (g0 - 3 > from) pieces.push([from, g0 - 3]); from = g1 + 3; }
    if (L1 > from) pieces.push([from, L1]);
    for (const [u0, u1] of pieces) {
      const sl = horizontal ? slab(u0, s === "N" ? -T : D, u1 - u0, T, 0, CUT) : slab(s === "W" ? -T : W, u0, T, u1 - u0, 0, CUT);
      front.push(S(sl, { tone: "mid" }));
    }
    for (const dr of room.doors.filter((x) => onSide(x.hinge, s))) {
      const c = [dr.hinge[0] + dr.closed[0] * dr.width, dr.hinge[1] + dr.closed[1] * dr.width];
      const u0 = horizontal ? Math.min(dr.hinge[0], c[0]) : Math.min(dr.hinge[1], c[1]), u1 = u0 + dr.width;
      const w0 = horizontal ? (s === "N" ? -T : D) : s === "W" ? -T : W;
      const jamb = (u: number, h: number, z = 0) => (horizontal ? slab(u, w0, 3, T, z, h) : slab(w0, u, T, 3, z, h));
      front.push(S(jamb(u0 - 3, dr.height + 3), { tone: "mid" }), S(jamb(u1, dr.height + 3), { tone: "mid" }));
      front.push(S(horizontal ? slab(u0 - 3, w0, dr.width + 6, T, dr.height + 3, 8) : slab(w0, u0 - 3, T, dr.width + 6, dr.height + 3, 8), { tone: "mid" }));
    }
  }
  // Puertas en muros del fondo: la hoja cerrada sobre la cara interior
  for (const dr of room.doors) {
    const side = sides.find((s) => onSide(dr.hinge, s))!;
    if (!far.includes(side)) continue;
    const n = NORMAL[side];
    const c: [number, number] = [dr.hinge[0] + dr.closed[0] * dr.width, dr.hinge[1] + dr.closed[1] * dr.width];
    const off = (p: [number, number], z: number): P3 => [p[0] + n[0] * 0.4, p[1] + n[1] * 0.4, z];
    back.push(poly([off(dr.hinge, 0), off(c, 0), off(c, dr.height), off(dr.hinge, dr.height)], "fill:var(--anatomy-paper, #fff);stroke:var(--anatomy-mid, #888);stroke-width:1"));
    const kn: [number, number] = [dr.hinge[0] + dr.closed[0] * (dr.width - 7), dr.hinge[1] + dr.closed[1] * (dr.width - 7)];
    back.push(k.dotsSvg([at(off(kn, 95))], { size: 1.6, tone: "mid" }));
  }

  // Elementos fijos y muebles, ordenados de atrás hacia adelante
  const parts: Part[] = [];
  for (const f of room.fixed) {
    const b: Box = { x0: f.rect.x, y0: f.rect.y, x1: f.rect.x + f.rect.w, y1: f.rect.y + f.rect.d };
    const h = f.height === "ceiling" ? ceil((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2) : f.height;
    let svg = S(slab(f.rect.x, f.rect.y, f.rect.w, f.rect.d, 0, h, 0, f.kind === "wardrobe" ? 0.6 : 0), { tone: "mid" });
    if (f.kind === "wardrobe" && f.front) {
      const n: [number, number] = { N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0] }[f.front] as [number, number];
      if (facing(n)) {
        const horizontal = f.front === "N" || f.front === "S";
        const fy = f.front === "N" ? b.y0 : b.y1, fx = f.front === "W" ? b.x0 : b.x1;
        const mid = horizontal ? (b.x0 + b.x1) / 2 : (b.y0 + b.y1) / 2;
        const p = (u: number, z: number): P3 => (horizontal ? [u, fy, z] : [fx, u, z]);
        svg += L(k.segment(p(mid, 0), p(mid, h), P), { tone: "lo" });
        svg += k.dotsSvg([at(p(mid - 5, h * 0.55)), at(p(mid + 5, h * 0.55))], { size: 0.9, tone: "lo" });
      }
    }
    parts.push({ box: b, z: h, svg });
  }
  for (const it of present(furniture)) parts.push({ box: boxOf(it), z: itemSize(it).h, svg: furnitureSvg(it) });

  // Orden: si dos cajas están separadas en x o en y, va adelante la que queda hacia el observador
  const before = (a: Part, b: Part) => {
    if (a.box.x1 <= b.box.x0 + 0.5) return V[0] > 0;
    if (b.box.x1 <= a.box.x0 + 0.5) return V[0] < 0;
    if (a.box.y1 <= b.box.y0 + 0.5) return V[1] > 0;
    if (b.box.y1 <= a.box.y0 + 0.5) return V[1] < 0;
    const ca = k.depthOf([(a.box.x0 + a.box.x1) / 2, (a.box.y0 + a.box.y1) / 2, 0], P), cb = k.depthOf([(b.box.x0 + b.box.x1) / 2, (b.box.y0 + b.box.y1) / 2, 0], P);
    return ca < cb;
  };
  const ordered: Part[] = [];
  for (const p of parts) {
    let i = ordered.length;
    while (i > 0 && !before(ordered[i - 1], p)) i--;
    ordered.splice(i, 0, p);
  }

  function furnitureSvg(it: Placed): string {
    const c = CATALOG[it.type];
    const { w, d, h } = itemSize(it);
    // Rectángulo local (centrado en el mueble, sin girar) llevado a la planta
    const local = (lx0: number, ly0: number, lx1: number, ly1: number): Box => {
      const pts = [[lx0, ly0], [lx1, ly1]].map(([x, y]) => {
        const r = (it.rot * Math.PI) / 180;
        return [it.cx + x * Math.cos(r) - y * Math.sin(r), it.cy + x * Math.sin(r) + y * Math.cos(r)];
      });
      return { x0: Math.min(pts[0][0], pts[1][0]), x1: Math.max(pts[0][0], pts[1][0]), y0: Math.min(pts[0][1], pts[1][1]), y1: Math.max(pts[0][1], pts[1][1]) };
    };
    const box = (b: Box, z: number, hh: number, r = 0, bevel = 0) => slab(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0, z, hh, r, bevel);
    const out: string[] = [];
    if (c.kind === "bed") {
      const head = c.head ?? 0;
      const matH = it.type === "camaKing" ? 34 : 30;
      const baseH = h - matH;
      const headDir: [number, number] = [Math.round(Math.sin((it.rot * Math.PI) / 180)), -Math.round(Math.cos((it.rot * Math.PI) / 180))];
      const headBack = !facing(headDir);
      const headSvg = head ? S(box(local(-w / 2 - 5, -d / 2, w / 2 + 5, -d / 2 + head), 0, 115), { tone: "lo" }) : "";
      if (headBack) out.push(headSvg);
      const bed = local(-w / 2, -d / 2 + head, w / 2, d / 2);
      out.push(S(box(bed, 0, baseH, 1, 0.4), { tone: "mid" }));
      out.push(S(box(bed, baseH, matH, 5, 1.2), { tone: "hi" }));
      const pillows = (c.pillows ?? 1) > 1
        ? [local(-w / 2 + 10, -d / 2 + head + 8, -5, -d / 2 + head + 38), local(5, -d / 2 + head + 8, w / 2 - 10, -d / 2 + head + 38)]
        : [local(-w / 2 + 10, -d / 2 + head + 6, w / 2 - 10, -d / 2 + head + 34)];
      for (const p of pillows) out.push(S(box(p, h, 10, 8, 0.6), { tone: "hi" }));
      out.push(S(box(local(-w / 2 + 4, d / 2 - 44, w / 2 - 4, d / 2 - 10), h, 4, 3, 0.4), { tone: "mid" }));
      if (!headBack) out.push(headSvg);
    } else if (c.kind === "nightstand") {
      out.push(S(box(local(-w / 2, -d / 2, w / 2, d / 2), 0, h, 1, 0.5), { tone: "mid" }));
      out.push(S(k.cylinder(it.cx, it.cy, 6, h, 2, P, 16), { tone: "lo" }), S(k.cylinder(it.cx, it.cy, 1, h + 2, 18, P, 8), { tone: "lo" }));
      out.push(S(k.cylinder(it.cx, it.cy, 11, h + 20, 16, P, 24), { tone: "hi" }));
    } else if (c.kind === "tvstand") {
      out.push(S(box(local(-w / 2, -d / 2, w / 2, d / 2), 0, h, 1, 0.5), { tone: "mid" }));
      out.push(S(box(local(-8, d / 2 - 14, 8, d / 2 - 6), h, 2), { tone: "lo" }));
      out.push(S(box(local(-50, d / 2 - 11, 50, d / 2 - 8), h + 2, 58), { tone: "lo" }));
    } else if (c.kind === "heater") {
      out.push(S(box(local(-w / 2, -d / 2, w / 2, d / 2), 0, h, 3, 0.4), { tone: "mid" }));
    } else {
      out.push(S(box(local(-w / 2, -d / 2, w / 2, d / 2), 0, h, 1, 0.5), { tone: "mid" }));
    }
    return out.join("");
  }

  const body = [...back, ...ordered.map((p) => p.svg), ...front];
  return k.figureSvg({ width, height, label: `Vista isométrica de ${room.name}`, body });
}
