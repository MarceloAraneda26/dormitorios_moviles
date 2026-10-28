import { useEffect, useRef, type PointerEvent, type KeyboardEvent, type ReactNode } from "react";
import { CATALOG } from "../model/catalog";
import { boxOf, clamp, cm, conflicts, gaps, itemSize, level, m, present, rotate, snapWalls } from "../model/geometry";
import type { Placed, Room } from "../model/types";
import { useNarrow } from "../useNarrow";

interface Props {
  room: Room;
  furniture: Placed[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  onChange: (list: Placed[]) => void;
}

const T = (props: { x: number; y: number; cls?: string; rot?: number; children: ReactNode }) => (
  <text x={props.x} y={props.y} className={"t " + (props.cls ?? "")} transform={props.rot ? `rotate(${props.rot} ${props.x} ${props.y})` : undefined}>
    {props.children}
  </text>
);

function Dim({ x1, y1, x2, y2, label, cls = "", out = false }: { x1: number; y1: number; x2: number; y2: number; label: string; cls?: string; out?: boolean }) {
  const v = Math.abs(x1 - x2) < 0.01;
  const tick = (x: number, y: number) => (v ? <line x1={x - 3} y1={y} x2={x + 3} y2={y} className={"s-dim " + cls} /> : <line x1={x} y1={y - 3} x2={x} y2={y + 3} className={"s-dim " + cls} />);
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} className={"s-dim " + cls} />
      {tick(x1, y1)}
      {tick(x2, y2)}
      <T x={v ? mx - 6 : mx} y={v ? my : my - 6} cls={`b ${cls} ${out ? "out" : ""}`} rot={v ? -90 : 0}>{label}</T>
    </g>
  );
}

// Dibujo de cada tipo de mueble, en coordenadas locales centradas en el origen
function Furniture({ it }: { it: Placed }) {
  const c = CATALOG[it.type];
  const { w, d } = itemSize(it);
  const head = c.head ?? 0;
  const labels: string[] = [];
  let body: ReactNode;
  switch (c.kind) {
    case "bed": {
      const mat = Math.min(d - head, 190 + (c.head ? 10 : 0));
      body = (
        <>
          {d - head > mat && <rect x={-w / 2} y={-d / 2 + head} width={w} height={d - head} className="s-base" rx={3} />}
          {head > 0 && <rect x={-w / 2 - 5} y={-d / 2} width={w + 10} height={head} className="s-head" rx={2} />}
          <rect x={-w / 2} y={-d / 2 + head} width={w} height={c.head ? d - head : 190} className="s-bed" rx={4} />
          {(c.pillows ?? 1) > 1 ? (
            <>
              <rect x={-w / 2 + 10} y={-d / 2 + head + 8} width={w / 2 - 15} height={28} className="s-pillow" rx={6} />
              <rect x={5} y={-d / 2 + head + 8} width={w / 2 - 15} height={28} className="s-pillow" rx={6} />
            </>
          ) : (
            <rect x={-w / 2 + 10} y={-d / 2 + head + 6} width={w - 20} height={26} className="s-pillow" rx={6} />
          )}
        </>
      );
      labels.push(it.name ?? c.name, it.type === "camaKing" ? "180 × 200" : `${w} × 190`);
      break;
    }
    case "nightstand":
      body = (
        <>
          <rect x={-w / 2} y={-d / 2} width={w} height={d} className="s-furn" />
          <circle cx={0} cy={0} r={9} fill="var(--card)" stroke="var(--furnline)" />
        </>
      );
      break;
    case "tvstand":
      body = (
        <>
          <rect x={-w / 2} y={-d / 2} width={w} height={d} className="s-furn" />
          <rect x={-40} y={d / 2 - 9} width={80} height={3} fill="var(--fg)" />
        </>
      );
      labels.push("Aparador TV", `${w} × ${d}`);
      break;
    case "heater":
      body = (
        <>
          <rect x={-w / 2} y={-d / 2} width={w} height={d} className="s-furn" rx={3} />
          {Array.from({ length: Math.floor((w - 4) / 6) }, (_, i) => -w / 2 + 6 + i * 6).map((x) => (
            <line key={x} x1={x} y1={-d / 2 + 3} x2={x} y2={d / 2 - 3} className="s-detail" />
          ))}
        </>
      );
      break;
    case "shelf":
      body = <rect x={-w / 2} y={-d / 2} width={w} height={d} className="s-move" />;
      labels.push("Estante");
      break;
    default:
      body = (
        <>
          <rect x={-w / 2} y={-d / 2} width={w} height={d} className="s-furn" />
          {[-w / 6, w / 6].map((x) => <line key={x} x1={x} y1={-d / 2} x2={x} y2={d / 2} className="s-detail" />)}
        </>
      );
      labels.push(it.name ?? c.name);
  }
  return (
    <>
      {body}
      {labels.map((s, i) => (
        <text key={i} x={0} y={(i - (labels.length - 1) / 2) * 12} className={"t " + (i ? "sm" : "b")} transform={`rotate(${-it.rot})`}>{s}</text>
      ))}
    </>
  );
}

export default function PlanView({ room, furniture, selected, onSelect, onChange }: Props) {
  const svg = useRef<SVGSVGElement>(null);
  const narrow = useNarrow();
  // Al tocar un mueble no se desplaza la página (así se puede arrastrar); fuera de los muebles, sí.
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const stop = (e: TouchEvent) => { if ((e.target as Element).closest?.(".item")) e.preventDefault(); };
    el.addEventListener("touchstart", stop, { passive: false });
    return () => el.removeEventListener("touchstart", stop);
  }, []);
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const W = room.size.w, H = room.size.d, wt = 7;
  const check = conflicts(room, furniture);
  const sel = present(furniture).find((it) => it.id === selected);

  const toPlan = (e: PointerEvent) => {
    const el = svg.current!;
    const pt = el.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    return pt.matrixTransform(el.getScreenCTM()!.inverse());
  };
  const update = (it: Placed) => onChange(furniture.map((x) => (x.id === it.id ? it : x)));

  // Dos toques seguidos sobre el mismo mueble lo giran (el doble clic no es confiable en pantallas táctiles)
  const lastTap = useRef<{ id: string; t: number } | null>(null);
  const down = (e: PointerEvent, it: Placed) => {
    e.stopPropagation();
    onSelect(it.id);
    const now = performance.now();
    if (lastTap.current?.id === it.id && now - lastTap.current.t < 350) {
      lastTap.current = null;
      update(rotate(room, it));
      return;
    }
    lastTap.current = { id: it.id, t: now };
    const p = toPlan(e);
    drag.current = { id: it.id, dx: it.cx - p.x, dy: it.cy - p.y };
    svg.current!.setPointerCapture(e.pointerId);
    svg.current!.focus({ preventScroll: true });
  };
  const move = (e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const it = furniture.find((x) => x.id === d.id)!;
    const p = toPlan(e);
    update(snapWalls(room, clamp(room, { ...it, cx: Math.round(p.x + d.dx), cy: Math.round(p.y + d.dy) })));
  };
  const key = (e: KeyboardEvent) => {
    if (!sel) return;
    const step = e.shiftKey ? 10 : 1;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (moves[e.key]) update(clamp(room, { ...sel, cx: sel.cx + moves[e.key][0], cy: sel.cy + moves[e.key][1] }));
    else if (e.key === "r" || e.key === "R") update(rotate(room, sel));
    else return;
    e.preventDefault();
  };

  // Franja de techo inclinado
  const s = room.slope;
  const slopeRect = s && { N: { x: 0, y: 0, w: W, d: s.run }, S: { x: 0, y: H - s.run, w: W, d: s.run }, W: { x: 0, y: 0, w: s.run, d: H }, E: { x: W - s.run, y: 0, w: s.run, d: H } }[s.side];
  const gradDir = s && { N: [0, 0, 0, 1], S: [0, 1, 0, 0], W: [0, 0, 1, 0], E: [1, 0, 0, 0] }[s.side];

  const g = sel ? gaps(room, furniture, sel) : null;
  const b = sel ? boxOf(sel) : null;
  const th = (v: number) => level(v, 60, 45);

  return (
    <svg
      ref={svg}
      viewBox={narrow ? `-46 -54 ${W + 64} ${H + 112}` : `-62 -54 ${W + 124} ${H + 112}`}
      className={"plan" + (narrow ? " narrow" : "")}
      tabIndex={0}
      role="application"
      aria-label={`Plano de ${room.name} con muebles movibles`}
      onPointerMove={move}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
      onPointerDown={() => onSelect(null)}
      onKeyDown={key}
    >
      <defs>
        {gradDir && (
          <linearGradient id={`slope-${room.id}`} x1={gradDir[0]} y1={gradDir[1]} x2={gradDir[2]} y2={gradDir[3]}>
            <stop offset={0} stopColor="var(--slope)" stopOpacity={0.38} />
            <stop offset={1} stopColor="var(--slope)" stopOpacity={0} />
          </linearGradient>
        )}
      </defs>
      <rect x={-wt} y={-wt} width={W + 2 * wt} height={H + 2 * wt} className="s-wall" />
      <rect x={0} y={0} width={W} height={H} className="s-floor" />
      {slopeRect && <rect {...{ x: slopeRect.x, y: slopeRect.y, width: slopeRect.w, height: slopeRect.d }} fill={`url(#slope-${room.id})`} />}

      {room.windows.map((win, i) => {
        const vertical = win.a[0] === win.b[0];
        const x = vertical ? (win.a[0] === 0 ? -wt : W) : Math.min(win.a[0], win.b[0]);
        const y = vertical ? Math.min(win.a[1], win.b[1]) : win.a[1] === 0 ? -wt : H;
        return <rect key={i} x={x} y={y} width={vertical ? wt : Math.abs(win.b[0] - win.a[0])} height={vertical ? Math.abs(win.b[1] - win.a[1]) : wt} className="s-win" />;
      })}

      {room.fixed.map((f) => (
        <g key={f.id}>
          <rect x={f.rect.x} y={f.rect.y} width={f.rect.w} height={f.rect.d} className={f.kind === "wall" ? "s-wall" : f.kind === "wardrobe" ? "s-ward" : "s-furn"} />
          {f.kind === "wardrobe" && (
            <>
              <line x1={f.rect.x + f.rect.w / 2} y1={f.rect.y} x2={f.rect.x + f.rect.w / 2} y2={f.rect.y + f.rect.d} stroke="var(--furnline)" strokeWidth={0.8} />
              <T x={f.rect.x + f.rect.w / 2} y={f.rect.y + f.rect.d / 2 - 6} cls="b">Ropero</T>
              <T x={f.rect.x + f.rect.w / 2} y={f.rect.y + f.rect.d / 2 + 6} cls="sm">{`${m(f.rect.w)} × ${m(f.rect.d)}`.replace(/ m × /, " × ")}</T>
            </>
          )}
          {(f.leaves ?? []).map((leaf, i) => {
            const mid = f.rect.x + f.rect.w / 2;
            const sweep = leaf.hinge[0] < mid ? 0 : 1;
            return <path key={i} d={`M ${mid} ${leaf.hinge[1]} A ${leaf.r} ${leaf.r} 0 0 ${sweep} ${leaf.hinge[0]} ${leaf.hinge[1] - leaf.r}`} className={"s-arc" + (check.leaves[room.fixed.indexOf(f)]?.[i] ? " bad" : "")} />;
          })}
        </g>
      ))}
      {(room.zones ?? []).map((z, i) => (
        <g key={i}>
          <rect x={z.rect.x} y={z.rect.y} width={z.rect.w} height={z.rect.d} className="s-tbd" />
          <T x={z.rect.x + z.rect.w / 2} y={z.rect.y + z.rect.d / 2} cls="sm mut">{z.name}</T>
        </g>
      ))}

      {room.doors.map((door, i) => {
        const [hx, hy] = door.hinge, r = door.width;
        const c = [hx + door.closed[0] * r, hy + door.closed[1] * r], o = [hx + door.open[0] * r, hy + door.open[1] * r];
        const cross = door.closed[0] * door.open[1] - door.closed[1] * door.open[0];
        const gapX = Math.min(hx, c[0]), gapY = Math.min(hy, c[1]);
        const onEast = hx >= W - 0.5, onWest = hx <= 0.5;
        return (
          <g key={i}>
            <rect x={onEast ? W : onWest ? -wt : gapX} y={onEast || onWest ? gapY : hy >= H - 0.5 ? H : -wt} width={onEast || onWest ? wt : Math.abs(c[0] - hx)} height={onEast || onWest ? Math.abs(c[1] - hy) : wt} className="s-floor" />
            <line x1={hx} y1={hy - 1} x2={o[0]} y2={o[1] - 1} className="s-leaf" />
            <path d={`M ${c[0]} ${c[1]} A ${r} ${r} 0 0 ${cross > 0 ? 1 : 0} ${o[0]} ${o[1]}`} className={"s-arc" + (check.doors[i] ? " bad" : "")} />
          </g>
        );
      })}

      {present(furniture).map((it) => {
        const { w, d } = itemSize(it);
        return (
          <g key={it.id} className="item" transform={`translate(${it.cx} ${it.cy}) rotate(${it.rot})`} onPointerDown={(e) => down(e, it)} onDoubleClick={() => update(rotate(room, it))}>
            <Furniture it={it} />
            {check.bad.has(it.id) && <rect x={-w / 2 - 1} y={-d / 2 - 1} width={w + 2} height={d + 2} className="s-hit" rx={3} />}
            {it.id === selected && <rect x={-w / 2 - 3} y={-d / 2 - 3} width={w + 6} height={d + 6} className="s-sel" rx={4} />}
          </g>
        );
      })}

      {g && b && (
        <g>
          {g.E > 1 && <Dim x1={b.x1} y1={(b.y0 + b.y1) / 2} x2={b.x1 + g.E} y2={(b.y0 + b.y1) / 2} label={cm(g.E)} cls={th(g.E)} />}
          {g.W > 1 && <Dim x1={b.x0 - g.W} y1={(b.y0 + b.y1) / 2} x2={b.x0} y2={(b.y0 + b.y1) / 2} label={cm(g.W)} cls={th(g.W)} />}
          {g.N > 1 && <Dim x1={(b.x0 + b.x1) / 2} y1={b.y0 - g.N} x2={(b.x0 + b.x1) / 2} y2={b.y0} label={cm(g.N)} cls={th(g.N)} />}
          {g.S > 1 && <Dim x1={(b.x0 + b.x1) / 2} y1={b.y1} x2={(b.x0 + b.x1) / 2} y2={b.y1 + g.S} label={cm(g.S)} cls={th(g.S)} />}
        </g>
      )}

      <Dim x1={0} y1={-26} x2={W} y2={-26} label={m(W)} out />
      <Dim x1={-34} y1={0} x2={-34} y2={H} label={m(H)} out />
      {(narrow ? (["N", "S"] as const) : (["N", "S", "E", "W"] as const)).map((side) => {
        const low = s?.side === side;
        const label = room.walls[side] + (low ? ` · techo bajo, ${m(s!.low)} en el muro` : "");
        const pos = { N: { x: W / 2, y: -44, rot: 0 }, S: { x: W / 2, y: H + 24, rot: 0 }, E: { x: W + 18, y: H / 2, rot: 90 }, W: { x: -52, y: H / 2, rot: -90 } }[side];
        return <T key={side} x={pos.x} y={pos.y} rot={pos.rot} cls={`sm out ${low ? "sl" : "mut"}`}>{label}</T>;
      })}
    </svg>
  );
}
