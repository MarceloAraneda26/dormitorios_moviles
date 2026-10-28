import { useEffect, useState } from "react";

const query = typeof window !== "undefined" ? window.matchMedia("(max-width: 640px)") : null;

// true en pantallas angostas (celulares)
export function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(query?.matches ?? false);
  useEffect(() => {
    if (!query) return;
    const on = (e: MediaQueryListEvent) => setNarrow(e.matches);
    query.addEventListener("change", on);
    return () => query.removeEventListener("change", on);
  }, []);
  return narrow;
}
