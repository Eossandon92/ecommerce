import { chromium } from 'playwright';
import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';

const BASE_URL = 'https://gestionpro.kastor.cl';
const DOWNLOAD_DIR_DEFAULT = process.env.DOWNLOAD_DIR || './downloads';

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function normalizarRut(valor) {
  return (valor || '').toString().toLowerCase().replace(/[.\-\s]/g, '');
}

function normalizarTexto(valor) {
  return (valor || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

// Busca el condominio que mejor matchea la pista que dio el usuario (ej. "Santa Rosa"),
// por inclusión de texto en cualquier dirección. Devuelve null si no hay match claro.
export function encontrarComunidad(comunidades, pista) {
  const pistaNorm = normalizarTexto(pista);
  if (!pistaNorm) return null;
  return (
    comunidades.find((c) => {
      const nombreNorm = normalizarTexto(c.nombre);
      return nombreNorm.includes(pistaNorm) || pistaNorm.includes(nombreNorm);
    }) || null
  );
}

function indiceMes(mes) {
  const idx = typeof mes === 'number' ? mes - 1 : MESES.findIndex((m) => m === mes.toLowerCase());
  if (idx < 0 || idx > 11) throw new Error(`Mes inválido: ${mes}`);
  return idx;
}

export function etiquetaMes(mes, anio) {
  const idx = indiceMes(mes);
  const nombre = MESES[idx][0].toUpperCase() + MESES[idx].slice(1);
  return `${nombre} ${anio}`;
}

// Los <select> de período en Kastor usan como value "YYYY-MM-01" (confirmado
// inspeccionando #select_desde). selectOption por label de texto falla de forma
// consistente en este sitio (motivo desconocido); por value funciona siempre.
export function valorMes(mes, anio) {
  const idx = indiceMes(mes);
  const mm = String(idx + 1).padStart(2, '0');
  return `${anio}-${mm}-01`;
}

export async function iniciarSesion(page) {
  await page.goto(`${BASE_URL}/login/`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('textbox', { name: 'Correo electrónico' }).fill(process.env.KASTOR_EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña' }).fill(process.env.KASTOR_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForSelector('text=Listado de Comunidades', { timeout: 15000 });
}

// La entidad administradora (no un condominio real, no tiene trabajadores con
// liquidaciones de sueldo propias) — se excluye siempre de la búsqueda.
const SLUGS_EXCLUIDOS = new Set(['edificio_gestionpro']);

export async function obtenerComunidades(page) {
  const todas = await page.evaluate(() => {
    const botones = Array.from(document.querySelectorAll('button[data-edificio]'));
    return botones.map((btn) => {
      const fila = btn.closest('tr');
      const celdas = fila ? Array.from(fila.querySelectorAll('td')) : [];
      return {
        slug: btn.getAttribute('data-edificio'),
        rut: celdas[0]?.innerText?.trim() || '',
        nombre: celdas[1]?.innerText?.trim() || '',
      };
    });
  });
  return todas.filter((c) => !SLUGS_EXCLUIDOS.has(c.slug));
}

const DASHBOARD_URL = `${BASE_URL}/login/dashboard/index`;

async function entrarAComunidad(page, slug) {
  // Ir directo por URL a una comunidad sin pasar antes por el botón "Acceder" real
  // redirige a logout: el click dispara algo (AJAX/handshake) que fija el contexto
  // de la comunidad en la sesión del servidor, y un goto frío no lo replica.
  await page.goto(DASHBOARD_URL);
  await page.waitForSelector('button[data-edificio]', { timeout: 15000 });
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'load', timeout: 15000 }),
    page.locator(`button[data-edificio="${slug}"]`).click(),
  ]);
}

async function irAReporteLiquidaciones(page, slug) {
  await entrarAComunidad(page, slug);
  await page.goto(`${BASE_URL}/${slug}/remuneraciones/reporte_liquidaciones`);
  await page.waitForSelector('.tools-menu-btn', { timeout: 15000 });
}

async function seleccionarMesEnFiltro(page, valorMesStr) {
  // El filtro "Mes" de la tabla usa internamente el id select_desde (oculta select_hasta
  // cuando Tipo de consulta = "Mes", porque no hace falta un rango).
  const selectMes = page.locator('#select_desde');
  await page.waitForFunction(
    () => {
      const el = document.getElementById('select_desde');
      return !!el && el.options.length > 1;
    },
    { timeout: 10000 },
  );
  await selectMes.selectOption(valorMesStr);
  await page.getByRole('button', { name: 'Consultar' }).click();
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
}

export async function buscarTrabajadorEnCondominio(page, slug, consulta, valorMesStr) {
  await irAReporteLiquidaciones(page, slug);
  await seleccionarMesEnFiltro(page, valorMesStr);

  const consultaNorm = normalizarRut(consulta);
  const consultaTexto = consulta.toString().toLowerCase();

  return page.evaluate(
    ({ consultaNorm, consultaTexto }) => {
      function normalizar(valor) {
        return (valor || '').toString().toLowerCase().replace(/[.\-\s]/g, '');
      }
      const filas = Array.from(document.querySelectorAll('table tbody tr'));
      for (const fila of filas) {
        const celdas = fila.querySelectorAll('td');
        if (celdas.length < 3) continue;
        const nombre = celdas[1]?.querySelector('.kastor-worker-name')?.innerText?.trim() || '';
        const rut = celdas[2]?.innerText?.trim() || '';
        const btn = fila.querySelector('.tools-menu-btn');
        if (!btn) continue;
        const dataId = btn.getAttribute('data-id');
        if (normalizar(rut) === consultaNorm || nombre.toLowerCase().includes(consultaTexto)) {
          return { dataId, nombre, rut };
        }
      }
      return null;
    },
    { consultaNorm, consultaTexto },
  );
}

export async function descargarLiquidacion(page, { dataId, nombre }, { valorDesde, valorHasta, etiquetaArchivo, downloadDir = DOWNLOAD_DIR_DEFAULT }) {
  await page.locator(`.tools-menu-btn[data-id="${dataId}"]`).click();
  await page.locator(`.tools-op-descargar[data-id="${dataId}"]`).click();
  await page.waitForSelector('text=Descarga de Liquidaciones');

  if (valorDesde) {
    await page.locator('#download-desde').selectOption(valorDesde);
  }
  if (valorHasta) {
    await page.locator('#download-hasta').selectOption(valorHasta);
  }

  // El click abre un popup en blanco (efecto del target="_blank"), pero el evento
  // de descarga real dispara en la página principal, no en ese popup.
  page.once('popup', (p) => p.close().catch(() => {}));
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 60000 }),
    page.getByRole('button', { name: 'Descargar PDF(s)' }).click(),
  ]);
  fs.mkdirSync(downloadDir, { recursive: true });
  const sufijo = (etiquetaArchivo || valorHasta || valorDesde || 'liquidacion').replace(/\s+/g, '_');
  const nombreArchivo = `${nombre.replace(/\s+/g, '_')}_${sufijo}.pdf`;
  const destino = path.join(downloadDir, nombreArchivo);
  await download.saveAs(destino);
  return destino;
}

export async function obtenerLiquidacion({ consulta, mes, anio, condominio, headless = true, downloadDir }) {
  const etiqueta = etiquetaMes(mes, anio);
  const valor = valorMes(mes, anio);
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  try {
    await iniciarSesion(page);
    const comunidades = await obtenerComunidades(page);

    // Si el usuario indicó el condominio, lo probamos primero (ahorra tiempo);
    // si no matchea ahí, igual caemos al resto como respaldo.
    let ordenBusqueda = comunidades;
    const pista = condominio ? encontrarComunidad(comunidades, condominio) : null;
    if (pista) {
      console.error(`Condominio indicado por el usuario matcheó: "${pista.nombre}" — probando ahí primero.`);
      ordenBusqueda = [pista, ...comunidades.filter((c) => c.slug !== pista.slug)];
    }

    for (const comunidad of ordenBusqueda) {
      console.error(`Revisando "${comunidad.nombre}"...`);
      let encontrado;
      try {
        encontrado = await buscarTrabajadorEnCondominio(page, comunidad.slug, consulta, valor);
      } catch (err) {
        console.warn(`Aviso: no se pudo revisar "${comunidad.nombre}" (${comunidad.slug}): ${err.message.split('\n')[0]}`);
        continue;
      }
      if (encontrado) {
        const archivo = await descargarLiquidacion(page, encontrado, {
          valorDesde: valor,
          valorHasta: valor,
          etiquetaArchivo: etiqueta,
          downloadDir,
        });
        return { ...encontrado, comunidad: comunidad.nombre, slug: comunidad.slug, archivo };
      }
    }
    throw new Error(
      `No se encontró a "${consulta}" con liquidación de ${etiqueta} en ninguno de los ${comunidades.length} condominios.`,
    );
  } finally {
    await browser.close();
  }
}
