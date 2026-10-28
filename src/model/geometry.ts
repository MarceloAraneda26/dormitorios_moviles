import { CATALOG } from "./catalog";
import type { Placed, Room, Side, Rot } from "./types";

export interface Box { x0: number; y0: number; x1: number; y1: number }

export const itemSize = (it: Placed) => {
  const c = CATALOG[it.type];
  return { w: it.w ?? c.w, d: it.d ?? c.d, h: c.h };
};
export const itemName = (it: Placed) => it.name ?? CATALOG[it.type].name;
export const present = (list: Placed[]) => list.filter((it) => it.on !== false);

// Medidas en planta según el giro
export function footprint(it: Placed) {
  const { w, d } = itemSize(it);
  return it.rot % 180 ? { w: d, h: w } : { w, h: d };
}
export function boxOf(it: Placed): Box {
  const f = footprint(it);
  return { x0: it.cx - f.w / 2, x1: it.cx + f.w / 2, y0: it.cy - f.h / 2, y1: it.cy + f.h / 2 };
}
export const rectBox = (r: { x: number; y: number; w: number; d: number }): Box => ({ x0: r.x, y0: r.y, x1: r.x + r.w, y1: r.y + r.d });

export function clamp(room: Room, it: Placed): Placed {
  const f = footprint(it);
  return {
    ...it,
    cx: Math.min(room.size.w - f.w / 2, Math.max(f.w / 2, it.cx)),
    cy: Math.min(room.size.d - f.h / 2, Math.max(f.h / 2, it.cy)),
  };
}

// Si un borde queda a menos de 5 cm de un muro, se pega al muro
export function snapWalls(room: Room, it: Placed): Placed {
  const b = boxOf(it), f = footprint(it), m = 5;
  const out = { ...it };
  if (b.x0 < m) out.cx = f.w / 2;
  if (room.size.w - b.x1 < m) out.cx = room.size.w - f.w / 2;
  if (b.y0 < m) out.cy = f.h / 2;
  if (room.size.d - b.y1 < m) out.cy = room.size.d - f.h / 2;
  return out;
}

// Al cambiar una medida o girar, el mueble sigue apoyado en los muros que tocaba
function keepWalls(room: Room, before: Placed, next: Placed): Placed {
  const b = boxOf(before);
  const touch = { W: b.x0 < 0.5, E: b.x1 > room.size.w - 0.5, N: b.y0 < 0.5, S: b.y1 > room.size.d - 0.5 };
  const out = { ...next };
  const f = footprint(out);
  if (touch.W) out.cx = f.w / 2; else if (touch.E) out.cx = room.size.w - f.w / 2;
  if (touch.N) out.cy = f.h / 2; else if (touch.S) out.cy = room.size.d - f.h / 2;
  return clamp(room, out);
}

export const resize = (room: Room, it: Placed, key: "w" | "d", value: number): Placed => keepWalls(room, it, { ...it, [key]: value });

export const rotate = (room: Room, it: Placed): Placed => keepWalls(room, it, { ...it, rot: (((it.rot + 90) % 360) as Rot) });

const overlaps = (a: Box, b: Box, tol = 0.5) => a.x0 < b.x1 - tol && b.x0 < a.x1 - tol && a.y0 < b.y1 - tol && b.y0 < a.y1 - tol;
function circleHits(c: [number, number], r: number, b: Box) {
  const x = Math.min(b.x1, Math.max(b.x0, c[0])), y = Math.min(b.y1, Math.max(b.y0, c[1]));
  return Math.hypot(x - c[0], y - c[1]) < r - 0.5;
}

interface Obstacle extends Box { name: string }
function obstacles(room: Room, list: Placed[], except?: Placed): Obstacle[] {
  return [
    ...room.fixed.map((f) => ({ name: f.name, ...rectBox(f.rect) })),
    ...present(list).filter((o) => o.id !== except?.id).map((o) => ({ name: itemName(o).toLowerCase(), ...boxOf(o) })),
  ];
}

// Distancia libre desde cada lado del mueble hasta el muro u obstáculo más cercano.
// Un obstáculo cuenta si cubre al menos un cuarto de ese lado (un velador junto a la cabecera no anula el paso).
export function gaps(room: Room, list: Placed[], it: Placed): Record<Side, number> {
  const r = boxOf(it);
  const g: Record<Side, number> = { E: room.size.w - r.x1, W: r.x0, N: r.y0, S: room.size.d - r.y1 };
  const along = (a0: number, a1: number, b0: number, b1: number) => Math.min(a1, b1) - Math.max(a0, b0);
  for (const o of obstacles(room, list, it)) {
    const ySpan = along(o.y0, o.y1, r.y0, r.y1) >= 0.25 * (r.y1 - r.y0);
    const xSpan = along(o.x0, o.x1, r.x0, r.x1) >= 0.25 * (r.x1 - r.x0);
    if (ySpan && o.x0 >= r.x1 - 0.5) g.E = Math.min(g.E, o.x0 - r.x1);
    if (ySpan && o.x1 <= r.x0 + 0.5) g.W = Math.min(g.W, r.x0 - o.x1);
    if (xSpan && o.y0 >= r.y1 - 0.5) g.S = Math.min(g.S, o.y0 - r.y1);
    if (xSpan && o.y1 <= r.y0 + 0.5) g.N = Math.min(g.N, r.y0 - o.y1);
  }
  return g;
}

// Hacia dónde apuntan los pies de la cama y sus costados, según el giro
export const FOOT: Record<Rot, Side> = { 0: "S", 90: "W", 180: "N", 270: "E" };
export const SIDES: Record<Rot, [Side, Side]> = { 0: ["W", "E"], 90: ["N", "S"], 180: ["E", "W"], 270: ["S", "N"] };

export interface Check { messages: string[]; bad: Set<string>; doors: boolean[]; leaves: boolean[][] }

export function conflicts(room: Room, list: Placed[]): Check {
  const messages: string[] = [], bad = new Set<string>();
  const all = present(list);
  all.forEach((a, i) => {
    const ra = boxOf(a);
    all.slice(i + 1).forEach((b) => {
      if (overlaps(ra, boxOf(b))) { messages.push(`${itemName(a)} se monta sobre ${itemName(b).toLowerCase()}`); bad.add(a.id); bad.add(b.id); }
    });
    for (const f of room.fixed) if (overlaps(ra, rectBox(f.rect))) { messages.push(`${itemName(a)} choca con ${f.name}`); bad.add(a.id); }
  });
  const doors = room.doors.map((door) => {
    let hit = false;
    for (const a of all) if (circleHits(door.hinge, door.width, boxOf(a))) { messages.push(`${itemName(a)} bloquea la apertura de ${door.name.toLowerCase()}`); bad.add(a.id); hit = true; }
    return hit;
  });
  const leaves = room.fixed.map((f) => (f.leaves ?? []).map((leaf, i) => {
    let hit = false;
    for (const a of all) if (circleHits(leaf.hinge, leaf.r, boxOf(a))) { messages.push(`${itemName(a)} bloquea la hoja ${i + 1} de ${f.name}`); bad.add(a.id); hit = true; }
    return hit;
  }));
  return { messages, bad, doors, leaves };
}

// Altura del cielo en un punto de la planta
export function ceilAt(room: Room, x: number, y: number) {
  const s = room.slope;
  if (!s) return room.ceiling;
  const dist = { W: x, E: room.size.w - x, N: y, S: room.size.d - y }[s.side];
  return s.low + (room.ceiling - s.low) * Math.min(1, Math.max(0, dist) / s.run);
}

export const level = (v: number, okMin: number, warnMin: number) => (v >= okMin ? "ok" : v >= warnMin ? "warn" : "bad");
export const cm = (v: number) => `${Math.round(v)} cm`;
export const m = (v: number) => (v / 100).toFixed(2).replace(".", ",") + " m";
