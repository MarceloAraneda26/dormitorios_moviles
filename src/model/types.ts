// Modelo de una pieza. Unidades: centímetros. Planta: x hacia la derecha, y hacia abajo,
// con el origen en la esquina superior izquierda del interior de la pieza.
export type Pt = [number, number];
export type Side = "N" | "S" | "E" | "W";
export type Rot = 0 | 90 | 180 | 270;

export interface Rect { x: number; y: number; w: number; d: number }

export interface Door {
  name: string;
  hinge: Pt;            // punto de la bisagra
  width: number;        // ancho de la hoja
  closed: Pt;           // dirección de la hoja cerrada (vector unitario)
  open: Pt;             // dirección de la hoja abierta
  height: number;
  estimated?: boolean;  // sentido de apertura no confirmado
}

export interface Window {
  name: string;
  a: Pt;                // extremos sobre el muro
  b: Pt;
  sill: number;         // alféizar
  head: number;         // dintel
  estimated?: boolean;
}

export interface Fixed {
  id: string;
  name: string;
  kind: "wardrobe" | "wall" | "heater";
  rect: Rect;
  height: number | "ceiling";
  leaves?: { hinge: Pt; r: number }[];   // hojas que abren hacia la pieza
  front?: Side;                          // lado donde están las puertas
}

export interface Zone { name: string; rect: Rect }

export interface Placed {
  id: string;
  type: string;         // clave del catálogo
  name?: string;
  cx: number;
  cy: number;
  rot: Rot;
  w?: number;           // medidas propias cuando difieren del catálogo
  d?: number;
  on?: boolean;         // false: fuera de la pieza
}

export interface Slope {
  side: Side;           // muro bajo
  low: number;          // altura del muro bajo
  run: number;          // ancho en planta del tramo inclinado
  runEstimated?: boolean;
}

// Medidas dibujadas sobre la foto. Coordenadas en fracción de la foto (0 a 1), tomadas de las láminas.
export interface PhotoOverlay {
  lines: { a: Pt; b: Pt }[];
  labels: { at: Pt; value: string; note?: string }[];
}
export interface Photo { src: string; title: string; measures: string[]; overlay?: PhotoOverlay }
export interface Measure { label: string; value: string; source: string; estimated?: boolean }

export interface Room {
  id: string;
  order: number;
  name: string;
  size: { w: number; d: number };
  wallT: number;
  ceiling: number;
  ceilingEstimated?: boolean;
  slope?: Slope;
  walls: Record<Side, string>;           // nombre de cada muro, para los textos
  doors: Door[];
  windows: Window[];
  fixed: Fixed[];
  zones?: Zone[];
  furniture: Placed[];
  photos: Photo[];
  measures: Measure[];
  notes: string[];
  detail?: string;                       // vista isométrica detallada hecha a mano
  footMin?: [number, number];            // holgura a los pies: cómoda, aceptable
}

export interface CatalogItem {
  name: string;
  kind: "bed" | "nightstand" | "tvstand" | "heater" | "shelf" | "cabinet";
  w: number;
  d: number;
  h: number;
  head?: number;                         // respaldo (cama)
  pillows?: number;
  sizes?: { w?: number[]; d?: number[] };
  heightEstimated?: boolean;
  source?: string;
}
