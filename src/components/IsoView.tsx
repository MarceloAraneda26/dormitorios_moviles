import { useMemo, useState } from "react";
import { buildIso, VIEWS } from "../iso/scene";
import type { Placed, Room } from "../model/types";
import { useTheme } from "../theme";

export default function IsoView({ room, furniture, compact = false }: { room: Room; furniture: Placed[]; compact?: boolean }) {
  const [view, setView] = useState(0);
  const theme = useTheme();
  const svg = useMemo(() => buildIso(room, furniture, view), [room, furniture, view]);
  return (
    <div className="iso-wrap">
      {!compact && (
        <div className="row">
          <button onClick={() => setView((view + 3) % 4)} aria-label="Girar a la izquierda">⟲ Girar</button>
          <span className="muted">{VIEWS[view].label}</span>
          <button onClick={() => setView((view + 1) % 4)} aria-label="Girar a la derecha">Girar ⟳</button>
        </div>
      )}
      <div className="iso iso-box" data-theme={theme} dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
}
