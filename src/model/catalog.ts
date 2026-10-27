import type { CatalogItem } from "./types";

// Muebles disponibles. Las medidas en planta salen de las fichas o de terreno;
// las alturas marcadas como estimadas no están medidas.
export const CATALOG: Record<string, CatalogItem> = {
  camaKing: { name: "Cama King", kind: "bed", w: 180, d: 208, h: 69, head: 8, pillows: 2, source: "Ficha CE Super Premium King: 180 × 200 × 69 cm, más respaldo" },
  colchon2p: { name: "Colchón 2 plazas", kind: "bed", w: 150, d: 190, h: 42, pillows: 1, sizes: { w: [90, 105, 120, 135, 150], d: [190, 195, 200] }, source: "Zinus 2 plazas 150 × 190 × 30 cm, sobre tarima de 12 cm (propuesta)" },
  velador: { name: "Velador", kind: "nightstand", w: 45, d: 40, h: 55, heightEstimated: true },
  aparador: { name: "Aparador TV", kind: "tvstand", w: 120, d: 50, h: 80, sizes: { d: [40, 45, 50] }, heightEstimated: true, source: "Medido: 1,20 m de ancho y unos 0,50 m de fondo" },
  calefactor: { name: "Calefactor de aceite", kind: "heater", w: 38, d: 22, h: 62, heightEstimated: true },
  estante: { name: "Estante angosto", kind: "shelf", w: 40, d: 25, h: 110, heightEstimated: true },
  muebleBajo: { name: "Mueble bajo", kind: "cabinet", w: 100, d: 30, h: 50, heightEstimated: true, source: "Medido: unos 1,0 × 0,3 m" },
};
