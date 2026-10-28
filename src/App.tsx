import { useEffect, useState } from "react";
import IsoView from "./components/IsoView";
import Measures, { toMeasure } from "./components/Measures";
import Photos from "./components/Photos";
import PlanPanel from "./components/PlanPanel";
import PlanView from "./components/PlanView";
import { itemName, m, present, rotate } from "./model/geometry";
import type { Placed, Room } from "./model/types";

// Cada archivo de src/data/rooms es una pieza. Para agregar una pieza nueva basta con crear su JSON.
const ROOMS: Room[] = Object.values(import.meta.glob<{ default: Room }>("./data/rooms/*.json", { eager: true }))
  .map((mod) => mod.default)
  .sort((a, b) => a.order - b.order);

type Tab = "plano" | "3d" | "fotos" | "medidas" | "detalle";
const TABS: { id: Tab; label: string }[] = [
  { id: "plano", label: "Plano" },
  { id: "3d", label: "Vista 3D" },
  { id: "fotos", label: "Fotos con medidas" },
  { id: "medidas", label: "Medidas" },
  { id: "detalle", label: "Vista detallada" },
];

function useRoute() {
  const read = () => {
    const [, kind, id, tab] = window.location.hash.split("/");
    return kind === "pieza" ? { id, tab: (tab as Tab) || "plano" } : null;
  };
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => setRoute(read());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

const DRAFT = "planos-casa-borrador";
function loadDrafts(): Record<string, Placed[]> {
  try { return JSON.parse(localStorage.getItem(DRAFT) || "{}"); } catch { return {}; }
}

export default function App() {
  const route = useRoute();
  const [drafts, setDrafts] = useState<Record<string, Placed[]>>(loadDrafts);
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    try { localStorage.setItem(DRAFT, JSON.stringify(drafts)); } catch { /* sin almacenamiento: el borrador no se recuerda */ }
  }, [drafts]);
  useEffect(() => { setSelected(null); setStatus(""); }, [route?.id]);

  const furnitureOf = (room: Room) => drafts[room.id] ?? room.furniture;
  const room = route && ROOMS.find((r) => r.id === route.id);

  if (!room) {
    return (
      <div className="wrap">
        <header className="top"><h1>Planos de la casa</h1><p className="muted">Piezas medidas en terreno, con su plano editable, vista 3D y fotos de origen.</p></header>
        <div className="rooms">
          {ROOMS.map((r) => (
            <a key={r.id} className="card room-card" href={`#/pieza/${r.id}/plano`}>
              <IsoView room={r} furniture={furnitureOf(r)} compact />
              <h2>{r.name}</h2>
              <p className="muted">{m(r.size.w)} × {m(r.size.d)} · {r.photos.length} fotos · {r.furniture.filter((f) => f.on !== false).length} muebles</p>
            </a>
          ))}
        </div>
        <div className="card how">
          <h2>Pendientes de medición</h2>
          <p className="muted small">Medidas que conviene tomar de nuevo con más precisión, por pieza.</p>
          <ul className="pending">
            {ROOMS.map((r) => {
              const list = toMeasure(r);
              const count = (p: string) => list.filter((m) => m.precise!.priority === p).length;
              return (
                <li key={r.id}>
                  <a href={`#/pieza/${r.id}/medidas`}>{r.name}</a>:{" "}
                  <span className="badge alta">{count("alta")} alta</span> <span className="badge media">{count("media")} media</span> <span className="badge baja">{count("baja")} baja</span>
                  <span className="muted"> · {r.measures.filter((m) => m.estimated).length} estimadas</span>
                  <div className="muted small">Prioridad alta: {list.filter((m) => m.precise!.priority === "alta").map((m) => m.label).join(" · ") || "ninguna"}.</div>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="card how">
          <h2>Cómo agregar una pieza</h2>
          <ol>
            <li>Toma las fotos con las medidas, como las de estas piezas, y guárdalas en <code>public/fotos/&lt;pieza&gt;/</code>.</li>
            <li>Copia <code>src/data/rooms/mateo.json</code> con otro nombre y cambia medidas, puertas, ventanas, elementos fijos y muebles.</li>
            <li>La pieza aparece sola en esta portada. Los muebles nuevos se agregan en <code>src/model/catalog.ts</code>.</li>
          </ol>
        </div>
      </div>
    );
  }

  const furniture = furnitureOf(room);
  const tab = route!.tab;
  const dirty = drafts[room.id] !== undefined;
  const setFurniture = (list: Placed[]) => setDrafts((d) => ({ ...d, [room.id]: list }));
  const save = async () => {
    setStatus("Guardando…");
    try {
      const res = await fetch(`/api/rooms/${room.id}`, { method: "PUT", body: JSON.stringify({ furniture }) });
      if (!res.ok) throw new Error(await res.text());
      // El archivo ya tiene la distribución: se borra el borrador antes de que Vite recargue los datos
      const rest = { ...drafts };
      delete rest[room.id];
      try { localStorage.setItem(DRAFT, JSON.stringify(rest)); } catch { /* sin almacenamiento */ }
      setDrafts(rest);
      setStatus("Guardado en el proyecto.");
    } catch (error) {
      setStatus("No se pudo guardar: " + String(error));
    }
  };
  const discard = () => setDrafts((d) => { const next = { ...d }; delete next[room.id]; return next; });
  const tabs = TABS.filter((t) => t.id !== "detalle" || room.detail);
  const selectedItem = present(furniture).find((x) => x.id === selected);

  return (
    <div className="wrap">
      <header className="top">
        <a href="#/" className="back">‹ Todas las piezas</a>
        <h1>{room.name}</h1>
        <p className="muted">{m(room.size.w)} × {m(room.size.d)}{room.slope ? ` · techo inclinado desde ${m(room.slope.low)} en el ${room.walls[room.slope.side]}` : ""}</p>
      </header>
      <nav className="tabs" role="tablist">
        {tabs.map((t) => (
          <a key={t.id} role="tab" aria-selected={tab === t.id} href={`#/pieza/${room.id}/${t.id}`}>{t.label}</a>
        ))}
      </nav>

      {(tab === "plano" || tab === "3d") && (
        <div className="savebar">
          <span className="muted">
            {!import.meta.env.DEV
              ? dirty ? "Tus cambios quedan guardados solo en este navegador." : "Puedes mover y girar muebles: los cambios quedan solo en este navegador."
              : dirty ? "Hay cambios sin guardar en el proyecto (quedan guardados en este navegador)." : "Distribución guardada en el proyecto."}{" "}
            {status}
          </span>
          {dirty && import.meta.env.DEV && <button className="primary" onClick={save}>Guardar en el proyecto</button>}
          {dirty && <button onClick={discard}>Volver a lo guardado</button>}
        </div>
      )}

      {tab === "plano" && (
        <div className="grid">
          <div className="card">
            <p className="muted small">Arrastra un mueble para moverlo. Para girarlo 90°, tócalo dos veces o usa el botón Girar. En computador, también con la tecla R y las flechas.</p>
            <div className="plan-bar">
              {selectedItem ? (
                <>
                  <span className="sel-name">{itemName(selectedItem)}</span>
                  <button className="primary" onClick={() => setFurniture(furniture.map((x) => (x.id === selectedItem.id ? rotate(room, x) : x)))}>Girar 90°</button>
                  <button onClick={() => setSelected(null)}>Listo</button>
                </>
              ) : (
                <span className="muted small">Toca un mueble para seleccionarlo.</span>
              )}
            </div>
            <PlanView room={room} furniture={furniture} selected={selected} onSelect={setSelected} onChange={setFurniture} />
          </div>
          <PlanPanel room={room} furniture={furniture} selected={selected} onSelect={setSelected} onChange={setFurniture} />
        </div>
      )}

      {tab === "3d" && (
        <div className="card">
          <IsoView room={room} furniture={furniture} />
          <p className="muted small">Se genera a partir del plano: si mueves un mueble en el plano, aquí cambia. Los muros cercanos van cortados a ras de suelo para ver el interior. Las alturas de los muebles y de los marcos de ventana son estimadas.</p>
        </div>
      )}

      {tab === "fotos" && <Photos room={room} />}

      {tab === "medidas" && <Measures room={room} />}

      {tab === "detalle" && room.detail && (
        <div className="card">
          <p className="muted small">Ilustración hecha a mano con Anatomy. Es fija: no sigue los cambios del plano.</p>
          <iframe className="detail" src={import.meta.env.BASE_URL + room.detail} title={`Vista detallada de ${room.name}`} />
        </div>
      )}
    </div>
  );
}
