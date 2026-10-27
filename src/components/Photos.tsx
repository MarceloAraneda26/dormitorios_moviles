import { useEffect, useState } from "react";
import type { Photo, Room } from "../model/types";

const url = (src: string) => import.meta.env.BASE_URL + src;
const VW = 1600, VH = 900;   // las fotos son 16:9

// Medidas sobre la foto: flechas con punta en ambos extremos y etiquetas con el valor
function Overlay({ photo, id }: { photo: Photo; id: string }) {
  const o = photo.overlay;
  if (!o) return null;
  const P = ([x, y]: [number, number]) => [x * VW, y * VH];
  return (
    <svg className="photo-overlay" viewBox={`0 0 ${VW} ${VH}`} aria-hidden="true">
      <defs>
        <marker id={`tip-${id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4.2" markerHeight="4.2" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" className="ov-tip" />
        </marker>
      </defs>
      {o.lines.map((l, i) => {
        const [x1, y1] = P(l.a), [x2, y2] = P(l.b);
        return (
          <g key={i}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} className="ov-halo" />
            <line x1={x1} y1={y1} x2={x2} y2={y2} className="ov-line" markerStart={`url(#tip-${id})`} markerEnd={`url(#tip-${id})`} />
          </g>
        );
      })}
      {o.labels.map((l, i) => {
        const [x, y] = P(l.at);
        const w = Math.max(l.value.length * 26 + 36, l.note ? l.note.length * 15 + 30 : 0);
        const h = l.note ? 92 : 62;
        const bx = Math.min(VW - w - 6, Math.max(6, x - w / 2)), by = Math.min(VH - h - 6, Math.max(6, y - h / 2));
        return (
          <g key={i}>
            <rect x={bx} y={by} width={w} height={h} rx={12} className="ov-box" />
            <text x={bx + w / 2} y={by + 42} className="ov-value">{l.value}</text>
            {l.note && <text x={bx + w / 2} y={by + 74} className="ov-note">{l.note}</text>}
          </g>
        );
      })}
    </svg>
  );
}

export default function Photos({ room }: { room: Room }) {
  const [open, setOpen] = useState<number | null>(null);
  const [show, setShow] = useState(true);
  const count = room.photos.length;
  useEffect(() => {
    if (open === null) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((open + 1) % count);
      if (e.key === "ArrowLeft") setOpen((open + count - 1) % count);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open, count]);

  return (
    <>
      <div className="row photos-bar">
        <p className="muted">Fotos de origen con las medidas tomadas en terreno. Toca una foto para verla en grande.</p>
        <label className="check"><input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Mostrar medidas</label>
      </div>
      <div className="photos">
        {room.photos.map((p, i) => (
          <figure key={p.src} className="card photo">
            <button className="photo-btn" onClick={() => setOpen(i)} aria-label={`Ampliar: ${p.title}`}>
              <img src={url(p.src)} alt={`${p.title}, con medidas`} loading="lazy" />
              {show && <Overlay photo={p} id={`${room.id}-${i}`} />}
            </button>
            <figcaption>
              <strong>{p.title}</strong>
              <ul>{p.measures.map((mm) => <li key={mm}>{mm}</li>)}</ul>
            </figcaption>
          </figure>
        ))}
      </div>
      {open !== null && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={room.photos[open].title} onClick={() => setOpen(null)}>
          <div className="lightbox-inner" onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-photo">
              <img src={url(room.photos[open].src)} alt={room.photos[open].title} />
              {show && <Overlay photo={room.photos[open]} id={`${room.id}-big`} />}
            </div>
            <div className="lightbox-bar">
              <button onClick={() => setOpen((open + count - 1) % count)}>‹ Anterior</button>
              <span><strong>{room.photos[open].title}</strong> · {room.photos[open].measures.join(" · ")}</span>
              <label className="check"><input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Medidas</label>
              <button onClick={() => setOpen((open + 1) % count)}>Siguiente ›</button>
              <button onClick={() => setOpen(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
