import { CATALOG } from "../model/catalog";
import { boxOf, cm, conflicts, FOOT, footprint, gaps, itemName, level, present, resize, rotate, SIDES } from "../model/geometry";
import type { Placed, Room } from "../model/types";

interface Props {
  room: Room;
  furniture: Placed[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  onChange: (list: Placed[]) => void;
}

interface Read { label: string; value: string; state: "ok" | "warn" | "bad"; note: string }

export default function PlanPanel({ room, furniture, selected, onSelect, onChange }: Props) {
  const sel = present(furniture).find((it) => it.id === selected);
  const update = (it: Placed) => onChange(furniture.map((x) => (x.id === it.id ? it : x)));
  const check = conflicts(room, furniture);

  const reads: Read[] = [];
  const bed = present(furniture).find((it) => CATALOG[it.type].kind === "bed");
  if (bed) {
    const g = gaps(room, furniture, bed), fd = FOOT[bed.rot];
    const [ok, warn] = room.footMin ?? [60, 50];
    reads.push({ label: `Pies de la cama (hacia ${room.walls[fd]})`, value: cm(g[fd]), state: level(g[fd], ok, warn), note: `${ok} cm o más es cómodo; entre ${warn} y ${ok} cm, aceptable.` });
    for (const sd of SIDES[bed.rot]) {
      const v = g[sd];
      reads.push({ label: `Costado (hacia ${room.walls[sd]})`, value: cm(v), state: v < 1 ? "ok" : level(v, 60, 45), note: v < 1 ? "Apoyado contra el muro o un mueble." : v >= 60 ? "Paso cómodo." : v >= 45 ? "Paso estrecho." : "Paso muy estrecho." });
    }
    // Ventana sobre la cama: cuando la cama toca el muro de la ventana
    const b = boxOf(bed);
    for (const win of room.windows) {
      const horizontal = win.a[1] === win.b[1];
      const touching = horizontal ? (win.a[1] === 0 ? b.y0 < 10 : b.y1 > room.size.d - 10) : win.a[0] === 0 ? b.x0 < 10 : b.x1 > room.size.w - 10;
      if (!touching) continue;
      const [a0, a1] = horizontal ? [Math.min(win.a[0], win.b[0]), Math.max(win.a[0], win.b[0])] : [Math.min(win.a[1], win.b[1]), Math.max(win.a[1], win.b[1])];
      const over = Math.max(0, Math.min(horizontal ? b.x1 : b.y1, a1) - Math.max(horizontal ? b.x0 : b.y0, a0));
      if (over > 0) reads.push({ label: "Ventana sobre la cama", value: cm(over), state: "warn", note: "Conviene un limitador de apertura y no dejar nada para trepar." });
    }
  }
  reads.push(check.messages.length
    ? { label: "Choques", value: String(check.messages.length), state: "bad", note: check.messages.join(". ") + "." }
    : { label: "Choques", value: "Ninguno", state: "ok", note: "Los muebles no se tocan y las puertas abren libres." });

  const optional = furniture.filter((it) => it.on !== undefined);

  return (
    <div className="side">
      <div className="card">
        <h2>Mueble seleccionado</h2>
        {!sel ? (
          <p className="muted">Toca un mueble en el plano para seleccionarlo.</p>
        ) : (
          <div className="ctrl">
            <div>
              <span className="sel-name">{itemName(sel)}</span>
              <br />
              <span className="muted">{Math.round(footprint(sel).w)} × {Math.round(footprint(sel).h)} cm en planta · giro {sel.rot}°</span>
            </div>
            <div className="row"><button className="primary" onClick={() => update(rotate(room, sel))}>Girar 90°</button></div>
            {CATALOG[sel.type].sizes?.w && (
              <label>Ancho
                <select value={sel.w ?? CATALOG[sel.type].w} onChange={(e) => update(resize(room, sel, "w", +e.target.value))}>
                  {CATALOG[sel.type].sizes!.w!.map((v) => <option key={v} value={v}>{v} cm</option>)}
                </select>
              </label>
            )}
            {CATALOG[sel.type].sizes?.d && (
              <label>{CATALOG[sel.type].kind === "bed" ? "Largo total (colchón + base)" : "Fondo"}
                <select value={sel.d ?? CATALOG[sel.type].d} onChange={(e) => update(resize(room, sel, "d", +e.target.value))}>
                  {CATALOG[sel.type].sizes!.d!.map((v) => <option key={v} value={v}>{v} cm</option>)}
                </select>
              </label>
            )}
            {CATALOG[sel.type].source && <p className="muted small">{CATALOG[sel.type].source}</p>}
          </div>
        )}
      </div>
      <div className="card">
        <h2>Revisión</h2>
        <div className="reads">
          {reads.map((r) => (
            <div key={r.label} className={"read " + r.state}><span>{r.label}</span><b>{r.value}</b><small>{r.note}</small></div>
          ))}
        </div>
      </div>
      {optional.length > 0 && (
        <div className="card">
          <h2>Muebles opcionales</h2>
          <div className="ctrl">
            {optional.map((it) => (
              <label key={it.id} className="check">
                <input type="checkbox" checked={it.on} onChange={(e) => { onChange(furniture.map((x) => (x.id === it.id ? { ...x, on: e.target.checked } : x))); if (e.target.checked) onSelect(it.id); }} />
                {itemName(it)}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
