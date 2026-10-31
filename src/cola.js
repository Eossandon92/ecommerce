// Solo un scraping a la vez: el RAM del free tier no alcanza para dos
// Chromium en paralelo, así que las búsquedas en Kastor se encolan.
let colaActual = Promise.resolve();

export function encolar(tarea) {
  const resultado = colaActual.then(tarea, tarea);
  colaActual = resultado.catch(() => {});
  return resultado;
}
