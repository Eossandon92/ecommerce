// Lectura de las tablas HTML que devuelve Kastor, en Node (sin pasar por el
// DOM de la página: Kastor pisa los métodos de Array en sus pantallas).

const ENTIDADES = { aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Ntilde: 'Ñ', nbsp: ' ', amp: '&', quot: '"', lt: '<', gt: '>' };

export function textoPlano(html) {
  return (html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(\w+);/g, (m, e) => ENTIDADES[e] ?? m)
    .replace(/&#(\d+);/g, (m, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();
}

// Quita comentarios, scripts y estilos: Kastor deja columnas comentadas
// (<!--<td>$ 0</td>-->) que descuadran las filas.
function limpiarHtml(html) {
  return (html || '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');
}

// Todas las tablas del HTML como arreglos de filas de texto (tablas anidadas
// incluidas por separado). Cada fila es un arreglo de celdas (th o td).
export function tablas(html) {
  const limpio = limpiarHtml(html);
  const resultado = [];
  for (const m of limpio.matchAll(/<table[\s\S]*?<\/table>/gi)) {
    const filas = [];
    for (const tr of m[0].matchAll(/<tr[\s\S]*?<\/tr>/gi)) {
      filas.push([...tr[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((c) => textoPlano(c[1])));
    }
    resultado.push(filas);
  }
  return resultado;
}

// La tabla más grande (la que trae los datos, no la de filtros).
export function tablaPrincipal(html) {
  return tablas(html).sort((a, b) => b.length - a.length)[0] || [];
}

// "$ 1.196.416" → 1196416 · "-3.476.767" → -3476767 · "$ 46,681,858" → 46681858
export function montoCL(texto) {
  const t = (texto || '').replace(/[^\d,.-]/g, '');
  if (!t || !/\d/.test(t)) return null;
  const negativo = t.startsWith('-');
  const soloDigitos = t.replace(/[^\d]/g, '');
  const n = Number(soloDigitos);
  return negativo ? -n : n;
}

export const esFecha = (t) => /^\d{2}-\d{2}-\d{4}$/.test((t || '').trim());
