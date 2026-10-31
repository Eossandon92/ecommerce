import { chromium } from 'playwright';
import 'dotenv/config';
import {
  BASE_URL,
  iniciarSesion,
  obtenerComunidades,
  entrarAComunidad,
  encontrarComunidad,
  normalizarTexto,
} from './kastor.js';

// SOLO LECTURA. Replica los mismos dos POST que hace la pestaña
// Remuneraciones → Vacaciones al abrirla y al elegir un trabajador:
//   POST /{slug}/remuneraciones/vacaciones          parametro=YYYY-MM
//   POST /{slug}/remuneraciones/detalle_vacaciones  sueldo_total_id=<id>&fecha_barra=YYYY-MM
// Nunca toca add_vacaciones (Guardar), descontar ni agregar días.

// La pestaña solo muestra la lista de trabajadores en un mes abierto; en uno
// cerrado responde "ya ha sido cerrado". Se prueba desde el mes actual hacia
// adelante porque Kastor suele tener abierto el mes siguiente.
function mesesCandidatos() {
  const ahora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Santiago' }));
  const meses = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() + i, 1);
    meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return meses;
}

function limpiarHtml(texto) {
  return (texto || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&aacute;/g, 'á').replace(/&eacute;/g, 'é').replace(/&iacute;/g, 'í')
    .replace(/&oacute;/g, 'ó').replace(/&uacute;/g, 'ú').replace(/&ntilde;/g, 'ñ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function numero(valor) {
  const n = parseFloat((valor || '').toString().replace(',', '.'));
  return Number.isNaN(n) ? null : n;
}

async function cargarListaTrabajadores(page, slug) {
  for (const mes of mesesCandidatos()) {
    const res = await page.request.post(`${BASE_URL}/${slug}/remuneraciones/vacaciones`, { form: { parametro: mes } });
    const html = await res.text();
    const select = html.match(/<select[^>]*id="cmb_trabajador"[\s\S]*?<\/select>/);
    if (!select) continue; // mes cerrado o sin acceso
    const trabajadores = [];
    for (const m of select[0].matchAll(/<option value='?"?(\d+)'?"?>([^<]*)<\/option>/g)) {
      trabajadores.push({ id: m[1], nombre: m[2].replace(/\s+/g, ' ').trim() });
    }
    return { mes, trabajadores };
  }
  return { mes: null, trabajadores: [] };
}

function buscarTrabajador(trabajadores, consulta) {
  const palabras = normalizarTexto(consulta).split(/\s+/).filter(Boolean);
  if (!palabras.length) return [];
  return trabajadores.filter((t) => {
    const nombreNorm = normalizarTexto(t.nombre);
    return palabras.every((p) => nombreNorm.includes(p));
  });
}

function parsearDetalle(html) {
  const fila = (etiqueta) => {
    const re = new RegExp(`${etiqueta}:\\s*</td>\\s*<td>\\s*(?:<input[^>]*value="([^"]*)"[^>]*>|([^<]*))`, 'i');
    const m = html.match(re);
    return m ? numero(m[1] ?? m[2]) : null;
  };
  const contrato = html.match(/Fecha Inicio Contrato:\s*<\/td>\s*<td>([^<]*)<\/td>/i);

  // Historial: tabla con encabezado "Fecha creacion"; filas de datos con
  // Desde, Hasta, Hábiles, Progresivos, Sábados, Domingos, Festivos, Total, Forma, Periodo, Fecha creación.
  const historial = [];
  const idx = html.search(/Fecha creacion/i);
  if (idx >= 0) {
    const tabla = html.slice(idx, html.indexOf('</table>', idx));
    for (const tr of tabla.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
      const celdas = [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => limpiarHtml(c[1]));
      if (celdas.length >= 9 && /^\d{2}-\d{2}-\d{4}$/.test(celdas[0])) {
        historial.push({
          desde: celdas[0],
          hasta: celdas[1],
          habiles: numero(celdas[2]),
          progresivos: numero(celdas[3]),
          totalDias: numero(celdas[7]),
          forma: celdas[8],
        });
      }
    }
  }

  // Más reciente primero, sin depender del orden en que Kastor arme la tabla.
  const aIso = (f) => f.split('-').reverse().join('-');
  historial.sort((a, b) => aIso(b.desde).localeCompare(aIso(a.desde)));

  return {
    fechaInicioContrato: contrato ? contrato[1].trim() : null,
    habilesAcumulados: fila('D&iacute;as h&aacute;biles acumulados'),
    progresivosAcumulados: fila('D&iacute;as progresivos acumulados'),
    habilesUtilizados: fila('D&iacute;as h&aacute;biles utilizados'),
    progresivosUtilizados: fila('D&iacute;as progresivos utilizados'),
    habilesDisponibles: fila('D&iacute;as h&aacute;biles disponibles'),
    progresivosDisponibles: fila('D&iacute;as progresivos disponibles'),
    historial,
  };
}

export async function obtenerVacaciones({ consulta, condominio, headless = true }) {
  const browser = await chromium.launch({ headless });
  const page = await (await browser.newContext()).newPage();
  try {
    await iniciarSesion(page);
    const comunidades = await obtenerComunidades(page);

    // Igual que en liquidaciones: el condominio indicado va primero, sin
    // sacarlo del resto por si falla algo transitorio.
    let ordenBusqueda = comunidades;
    const pista = condominio ? encontrarComunidad(comunidades, condominio) : null;
    if (pista) ordenBusqueda = [pista, ...comunidades];

    const revisados = new Set();
    for (const comunidad of ordenBusqueda) {
      if (revisados.has(comunidad.slug)) continue;
      console.error(`Vacaciones: revisando "${comunidad.nombre}"...`);
      let lista;
      try {
        await entrarAComunidad(page, comunidad.slug);
        await page.goto(`${BASE_URL}/${comunidad.slug}/remuneraciones/index`);
        lista = await cargarListaTrabajadores(page, comunidad.slug);
      } catch (err) {
        console.warn(`Aviso: no se pudo revisar "${comunidad.nombre}": ${err.message.split('\n')[0]}`);
        continue;
      }
      revisados.add(comunidad.slug);

      const coincidencias = buscarTrabajador(lista.trabajadores, consulta);
      if (coincidencias.length > 1) {
        const nombres = coincidencias.map((t) => t.nombre).join(', ');
        const err = new Error(`En ${comunidad.nombre} hay ${coincidencias.length} personas que calzan con "${consulta}": ${nombres}. Indica el nombre más completo.`);
        // Para que el bot ofrezca un botón por persona.
        err.coincidencias = coincidencias.map((t) => t.nombre);
        err.comunidad = comunidad.nombre;
        throw err;
      }
      if (coincidencias.length === 1) {
        const trabajador = coincidencias[0];
        const res = await page.request.post(`${BASE_URL}/${comunidad.slug}/remuneraciones/detalle_vacaciones`, {
          form: { sueldo_total_id: trabajador.id, fecha_barra: lista.mes },
        });
        const detalle = parsearDetalle(await res.text());
        if (detalle.habilesDisponibles === null) {
          throw new Error(`Encontré a ${trabajador.nombre} en ${comunidad.nombre}, pero Kastor no devolvió sus días de vacaciones.`);
        }
        return { nombre: trabajador.nombre, comunidad: comunidad.nombre, slug: comunidad.slug, ...detalle };
      }
    }
    throw new Error(`No se encontró a "${consulta}" en ninguno de los ${revisados.size} condominios revisados.`);
  } finally {
    await browser.close();
  }
}
