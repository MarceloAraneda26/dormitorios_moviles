import type { Measure, Room } from "../model/types";

const ORDER = { alta: 0, media: 1, baja: 2 } as const;

export const toMeasure = (room: Room) =>
  room.measures.filter((m) => m.precise).sort((a, b) => ORDER[a.precise!.priority] - ORDER[b.precise!.priority]);

function Status({ m }: { m: Measure }) {
  return (
    <span className="badges">
      {m.estimated ? <span className="badge est">estimada</span> : <span className="badge ok">medida</span>}
      {m.precise && <span className={"badge " + m.precise.priority}>precisar · {m.precise.priority}</span>}
    </span>
  );
}

export default function Measures({ room }: { room: Room }) {
  const pending = toMeasure(room);
  const estimated = room.measures.filter((m) => m.estimated).length;
  return (
    <div className="side">
      <div className="card">
        <h2>Por medir con más precisión</h2>
        <p className="muted small">
          {pending.length} de {room.measures.length} medidas conviene medirlas mejor, ordenadas por cuánto cambian la distribución. {estimated} son estimadas: no se midieron.
        </p>
        <ol className="todo">
          {pending.map((m) => (
            <li key={m.label} className={"todo-item " + m.precise!.priority}>
              <div className="todo-head">
                <strong>{m.label}</strong>
                <span className="muted">{m.value}</span>
                <Status m={m} />
              </div>
              <p><b>Por qué:</b> {m.precise!.why}</p>
              <p><b>Cómo medirla:</b> {m.precise!.how}</p>
            </li>
          ))}
        </ol>
      </div>
      <div className="grid">
        <div className="card">
          <h2>Todas las medidas</h2>
          <div className="legend">
            <span className="badge ok">medida</span> tomada en terreno o de una ficha
            <span className="badge est">estimada</span> supuesta o calculada
            <span className="badge alta">precisar</span> conviene medirla mejor
          </div>
          <div className="table-scroll">
            <table className="measures">
              <thead><tr><th>Medida</th><th>Valor</th><th>Estado</th><th>Origen</th></tr></thead>
              <tbody>
                {room.measures.map((m) => (
                  <tr key={m.label}><td>{m.label}</td><td>{m.value}</td><td><Status m={m} /></td><td className="muted">{m.source}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card"><h2>Supuestos y datos por confirmar</h2><ul className="notes">{room.notes.map((n) => <li key={n}>{n}</li>)}</ul></div>
      </div>
    </div>
  );
}
