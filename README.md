# Planos de la casa

Sitio en React con las piezas de la casa medidas en terreno. Cada pieza tiene:

- **Plano**: planta a escala con muebles que se pueden mover y girar, distancias en vivo y aviso de choques (muebles que se montan, puertas u hojas de ropero bloqueadas).
- **Vista 3D**: vista isométrica generada desde los mismos datos con el kit de [Anatomy](https://github.com/wheresryan22/anatomy) (licencia MIT, copiado en `src/iso`). Se puede mirar desde las cuatro esquinas.
- **Fotos con medidas**: las láminas de origen, con la lista de medidas de cada una.
- **Medidas**: tabla de medidas con su origen y las que son estimadas.
- **Vista detallada** (opcional): una ilustración hecha a mano, como la de la pieza de Mateo.

## Cómo levantarlo

```bash
npm install
npm run dev
```

Queda en http://localhost:5173.

## Cómo agregar una pieza

1. Guarda las fotos con las medidas en `public/fotos/<pieza>/`.
2. Copia `src/data/rooms/mateo.json` con el nombre de la pieza nueva y cambia sus datos:
   - `size`: ancho (`w`, eje x) y largo (`d`, eje y) interiores, en cm. El origen es la esquina superior izquierda del plano.
   - `ceiling` y `slope`: altura del cielo y, si hay techo inclinado, el muro bajo, su altura y el ancho en planta del tramo inclinado.
   - `doors`: bisagra, ancho, dirección de la hoja cerrada y abierta.
   - `windows`: extremos sobre el muro, alféizar y dintel.
   - `fixed`: elementos que no se mueven (roperos empotrados, muros interiores, convectores).
   - `furniture`: muebles del catálogo con su posición (centro) y giro.
   - `photos`, `measures` y `notes`: fotos, tabla de medidas y supuestos.
3. La pieza aparece sola en la portada.

Los muebles nuevos se agregan en `src/model/catalog.ts`.

## Guardar la distribución

Mientras mueves muebles, los cambios quedan como borrador en el navegador. Con `npm run dev`, el botón **Guardar en el proyecto** los escribe en el JSON de la pieza.
