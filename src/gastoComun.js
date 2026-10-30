import { chromium } from 'playwright';
import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import {
  BASE_URL,
  normalizarTexto,
  encontrarComunidad,
  etiquetaMes,
  valorMes,
  iniciarSesion,
  obtenerComunidades,
  entrarAComunidad,
} from './kastor.js';

const DOWNLOAD_DIR_DEFAULT = process.env.DOWNLOAD_DIR || './downloads';

// IMPORTANTE: todo lo de este archivo es SOLO LECTURA en Kastor. En la pantalla
// de Cartola por Unidad existen "Enviar certificado de deuda por correo" y
// "Sí, notificar", que mandan correos reales a los propietarios: nunca se
// hace click ahí ni se llama a sus endpoints. Solo se usan:
//   - POST detalle_cartola_unidad (la misma consulta que hace el buscador)
//   - GET  boletas/boletas/{unidad}/{anio}/{mes}/1 (el PDF de la nota de cobro)
//   - GET  unidades/index2 (listado de unidades, para el correo del propietario)

const SINONIMOS_TIPO = {
  casa: 'casa',
  depto: 'depto', dpto: 'depto', departamento: 'depto', depa: 'depto', dto: 'depto',
  of: 'oficina', oficina: 'oficina',
  bodega: 'bodega', bod: 'bodega',
  estacionamiento: 'estacionamiento', est: 'estacionamiento',
  local: 'local',
};

// "Casa 011" -> { numero: "11", tipos: ["casa"] }
function partesUnidad(texto) {
  const norm = normalizarTexto(texto);
  const numeros = norm.match(/\d+[a-z]?\b/g) || [];
  const numero = numeros.length ? numeros[numeros.length - 1].replace(/^0+(?=\d)/, '') : '';
  const tipos = norm
    .replace(/\d+[a-z]?\b/g, ' ')
    .split(/\s+/)
    .map((p) => SINONIMOS_TIPO[p])
    .filter(Boolean);
  return { norm, numero, tipos };
}

// Elige la opción del <select id="unidad"> que corresponde a lo que pidió el
// usuario ("11", "casa 11", "depto 304"). Si hay más de una posible (ej. Casa 11
// y Bodega 11) y no dijo cuál, falla con la lista para que el bot pregunte.
export function encontrarUnidad(opciones, pedido) {
  const buscada = partesUnidad(pedido);
  if (!buscada.numero && !buscada.norm) throw new Error('No se indicó la unidad.');

  const exacta = opciones.find((o) => normalizarTexto(o.texto) === buscada.norm);
  if (exacta) return exacta;

  let candidatas = opciones.filter((o) => partesUnidad(o.texto).numero === buscada.numero);
  if (buscada.tipos.length && candidatas.length > 1) {
    candidatas = candidatas.filter((o) => partesUnidad(o.texto).tipos.some((t) => buscada.tipos.includes(t)));
  }
  if (candidatas.length === 1) return candidatas[0];
  if (candidatas.length === 0) throw new Error(`No existe la unidad "${pedido}" en este condominio.`);
  throw new Error(`Hay varias unidades que coinciden con "${pedido}": ${candidatas.map((c) => c.texto).join(', ')}. Indica cuál.`);
}

function textoConLetras(valor) {
  const t = (valor || '').trim();
  return /[a-záéíóúñ]/i.test(t) ? t : null;
}

async function leerUnidades(page, slug) {
  await page.goto(`${BASE_URL}/${slug}/pagounidad/cartola_unidad`, { waitUntil: 'load' });
  await page.waitForSelector('#unidad', { timeout: 15000 });
  return page.evaluate(() => {
    const sel = document.getElementById('unidad');
    const out = [];
    for (let i = 0; i < sel.options.length; i++) {
      out.push({ id: sel.options[i].value, texto: sel.options[i].text.trim() });
    }
    return out;
  });
}

// Propietario y correo según "Listado de Unidades". Casi siempre vienen vacíos
// ("----" / ". ."), por eso es opcional y no hace fallar nada.
async function leerPropietario(page, slug, textoUnidad) {
  try {
    await page.goto(`${BASE_URL}/${slug}/unidades/index2`, { waitUntil: 'load' });
    await page.waitForSelector('table tbody tr', { timeout: 15000 });
    const fila = await page.evaluate((textoUnidad) => {
      const filas = document.querySelectorAll('table tbody tr');
      for (let i = 0; i < filas.length; i++) {
        const td = filas[i].querySelectorAll('td');
        if (td.length < 10) continue;
        if (td[1].textContent.trim() === textoUnidad) {
          return { nombre: td[8].textContent.trim(), correo: td[9].textContent.trim() };
        }
      }
      return null;
    }, textoUnidad);
    if (!fila) return { propietario: null, correoPropietario: null };
    const correo = (fila.correo.match(/[^\s@]+@[^\s@]+\.[^\s@]+/) || [null])[0];
    return { propietario: textoConLetras(fila.nombre), correoPropietario: correo };
  } catch {
    return { propietario: null, correoPropietario: null };
  }
}

export async function obtenerGastoComun({ condominio, unidad, mes, anio, headless = true, downloadDir = DOWNLOAD_DIR_DEFAULT }) {
  const etiqueta = etiquetaMes(mes, anio);
  const numeroMes = Number(valorMes(mes, anio).slice(5, 7));
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  try {
    await iniciarSesion(page);
    const comunidades = await obtenerComunidades(page);
    const comunidad = encontrarComunidad(comunidades, condominio);
    if (!comunidad) {
      throw new Error(`No encontré el condominio "${condominio}". Disponibles: ${comunidades.map((c) => c.nombre).join(', ')}.`);
    }

    await entrarAComunidad(page, comunidad.slug);
    const opciones = await leerUnidades(page, comunidad.slug);
    const elegida = encontrarUnidad(opciones, unidad);

    const url = `${BASE_URL}/${comunidad.slug}/boletas/boletas/${elegida.id}/${anio}/${numeroMes}/1`;
    const respuesta = await context.request.get(url);
    const cuerpo = await respuesta.body();
    const esPdf = /pdf/i.test(respuesta.headers()['content-type'] || '') && cuerpo.subarray(0, 4).toString() === '%PDF';
    if (!respuesta.ok() || !esPdf) {
      throw new Error(`No hay nota de cobro de ${etiqueta} para ${elegida.texto} en ${comunidad.nombre}.`);
    }

    const { propietario, correoPropietario } = await leerPropietario(page, comunidad.slug, elegida.texto);

    fs.mkdirSync(downloadDir, { recursive: true });
    const nombreArchivo = `Gasto_Comun_${etiqueta}_${elegida.texto}.pdf`.replace(/\s+/g, '_');
    const archivo = path.join(downloadDir, `${Date.now()}_${nombreArchivo}`);
    fs.writeFileSync(archivo, cuerpo);

    return {
      comunidad: comunidad.nombre,
      slug: comunidad.slug,
      unidad: elegida.texto,
      periodo: etiqueta,
      propietario,
      correoPropietario,
      archivo,
      nombreArchivo,
    };
  } finally {
    await browser.close();
  }
}
