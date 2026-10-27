import { useEffect, useState } from "react";

const query = typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)") : null;

// Tema claro u oscuro según la preferencia del sistema
export function useTheme(): "light" | "dark" {
  const [dark, setDark] = useState(query?.matches ?? false);
  useEffect(() => {
    if (!query) return;
    const on = (e: MediaQueryListEvent) => setDark(e.matches);
    query.addEventListener("change", on);
    return () => query.removeEventListener("change", on);
  }, []);
  return dark ? "dark" : "light";
}
