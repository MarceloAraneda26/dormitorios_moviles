import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

// En modo desarrollo, el botón "Guardar" del editor escribe la distribución de muebles
// directo en src/data/rooms/<id>.json, para que quede en el proyecto.
function saveRooms(): Plugin {
  return {
    name: "guardar-piezas",
    configureServer(server) {
      server.middlewares.use("/api/rooms", (req, res) => {
        const id = (req.url || "").replace(/^\//, "").replace(/[^a-z0-9-]/gi, "");
        const file = resolve(HERE, "src/data/rooms", `${id}.json`);
        if (req.method !== "PUT" || !id || !existsSync(file)) {
          res.statusCode = 400;
          res.end("solicitud no válida");
          return;
        }
        let body = "";
        req.on("data", (chunk: Buffer) => (body += chunk));
        req.on("end", () => {
          try {
            const { furniture } = JSON.parse(body);
            const room = JSON.parse(readFileSync(file, "utf8"));
            room.furniture = furniture;
            writeFileSync(file, JSON.stringify(room, null, 2) + "\n");
            res.end("ok");
          } catch (error) {
            res.statusCode = 500;
            res.end(String(error));
          }
        });
      });
    },
  };
}

// En GitHub Pages el sitio vive en /dormitorios_moviles/; en desarrollo, en la raíz.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/dormitorios_moviles/" : "/",
  plugins: [react(), saveRooms()],
  server: { port: 5173 },
}));
