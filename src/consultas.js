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
import { encontrarUnidad } from './gastoComun.js';
import { tablas, tablaPrincipal, montoCL, esFecha, textoPlano } from './kastorHtml.js';

// Consultas de SOLO LECTURA a Kastor para el bot. Cada una replica el mismo
// pedido que hace la pantalla de Kastor al consultar (ver el comentario de
// cada función). Nunca se usan los botones de acción de esas pantallas
// (Reversar, Traspasar, Notificar, Eliminar, Desasignar, etc.).

// Abre sesión, entra al condominio pedido y ejecuta la consulta.
async function enCondominio(condominio, consulta) {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  try {
    await iniciarSesion(page);
    const comunidades = await obtenerComunidades(page);
    const comunidad = encontrarComunidad(comunidades, condominio);
    if (!comunidad) {
      throw new Error(`No encontré el condominio "${condominio}".`);
    }
    await entrarAComunidad(page, comunidad.slug);
    const url = (ruta) => `${BASE_URL}/${comunidad.slug}/${ruta}`;
    const resultado = await consulta({ page, url, slug: comunidad.slug });
    return { comunidad: comunidad.nombre, ...resultado };
  } finally {
    await browser.close();
  }
}

// Las unidades del condominio tal como las lista la Cartola por Unidad
// (<select id="unidad">), para reconocer "304", "depto 304", "casa 11"...
async function listaUnidades(page, url) {
  await page.goto(url('pagounidad/cartola_unidad'), { waitUntil: 'load' });
  const html = await page.content();
  const select = html.match(/<select[^>]*id="unidad"[\s\S]*?<\/select>/);
  const opciones = [];
  if (select) {
    for (const m of select[0].matchAll(/<option[^>]*value="([^"]*)"[^>]*>([\s\S]*?)<\/option>/g)) {
      if (m[1] && m[1] !== '0') opciones.push({ id: m[1], texto: textoPlano(m[2]) });
    }
  }
  return opciones;
}

const hoyChile = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Santiago' }));
const ddmmyyyy = (d) => `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;

// ---------------------------------------------------------------------------
// Morosos — Cobranza G.C. → Reporte de Morosos.
// POST informes/busca_morosos (meses_mora ≥ 1; Kastor exige algún criterio).
export function obtenerMorosos({ condominio, mesesMinimo = 1 }) {
  return enCondominio(condominio, async ({ page, url }) => {
    await page.goto(url('informes/morosos'), { waitUntil: 'load' });
    const r = await page.request.post(url('informes/busca_morosos'), {
      form: { meses_mora: String(Math.max(1, mesesMinimo)), detalle: '1', monto_mora: '0', btn_moroso: 'Consultar' },
    });
    const filas = tablaPrincipal(await r.text());
    const morosos = [];
    let total = null;
    for (const f of filas) {
      if (f.includes('TOTAL')) total = montoCL(f[f.indexOf('TOTAL') + 1]);
      // Unidad | Nombre | Meses | Períodos | Montos por mes | Total
      if (f.length >= 6 && f[0] && /^\d+$/.test(f[2])) {
        morosos.push({ unidad: f[0], nombre: f[1], meses: Number(f[2]), periodos: f[3], total: montoCL(f[5]) });
      }
    }
    morosos.sort((a, b) => (b.total || 0) - (a.total || 0));
    return { morosos, total: total ?? morosos.reduce((s, m) => s + (m.total || 0), 0), mesesMinimo: Math.max(1, mesesMinimo) };
  });
}

// ---------------------------------------------------------------------------
// Deuda y movimientos de una unidad — Cobranza G.C. → Cartola por Unidad.
// POST pagounidad/detalle_cartola_unidad (unidad_aux, ano).
export function obtenerCartolaUnidad({ condominio, unidad }) {
  return enCondominio(condominio, async ({ page, url }) => {
    const elegida = encontrarUnidad(await listaUnidades(page, url), unidad);
    const anio = hoyChile().getFullYear();
    const r = await page.request.post(url('pagounidad/detalle_cartola_unidad'), {
      form: { unidad_aux: elegida.id, ano: String(anio) },
    });
    const html = await r.text();
    const todas = tablas(html);

    let propietario = null;
    for (const t of todas) for (const f of t) if (/^Propietario/.test(f[0] || '')) propietario = f[1] || null;

    const cartola = todas.find((t) => t.some((f) => f.includes('Monto Boleta') && f.includes('Saldo'))) || [];
    const movimientos = [];
    let deuda = null;
    for (const f of cartola) {
      if (f[0] === 'TOTALES') deuda = montoCL(f[3]);
      else if (esFecha(f[0])) {
        movimientos.push({ fecha: f[0], cobro: montoCL(f[1]), pago: montoCL(f[2]), saldo: montoCL(f[3]), detalle: f[4], folio: f[5] });
      }
    }
    const ultimoPago = [...movimientos].reverse().find((m) => m.pago) || null;
    return { unidad: elegida.texto, propietario, deuda, ultimoPago, movimientos, anio };
  });
}

// ---------------------------------------------------------------------------
// Pagos recibidos — Pagos G.C. → Informe de Ingresos.
// POST pagounidad/ver_ingresos por cada cuenta corriente del condominio.
export function obtenerPagos({ condominio, desde, hasta }) {
  return enCondominio(condominio, async ({ page, url }) => {
    await page.goto(url('pagounidad/ingresos'), { waitUntil: 'load' });
    const html = await page.content();
    const select = html.match(/<select[^>]*name="cuenta_corriente"[\s\S]*?<\/select>/);
    const cuentas = select ? [...select[0].matchAll(/value="(\d+)"/g)].map((m) => m[1]) : [];
    const pagos = [];
    for (const cta of cuentas) {
      const r = await page.request.post(url('pagounidad/ver_ingresos'), {
        form: { fecha_desde: ddmmyyyy(desde), fecha_hasta: ddmmyyyy(hasta), tipo_comp: '1', cta_cte: cta, buscarPor: '1', anio: String(desde.getFullYear()), mes: '' },
      });
      // Fecha | Nº Ingreso | Unidad | Nombre | Forma Pago | Monto | ...
      for (const f of tablaPrincipal(await r.text())) {
        if (esFecha(f[0]) && f.length >= 6) {
          pagos.push({ fecha: f[0], folio: f[1], unidad: f[2], nombre: f[3], forma: f[4], monto: montoCL(f[5]) });
        }
      }
    }
    const aIso = (d) => d.split('-').reverse().join('-');
    pagos.sort((a, b) => aIso(b.fecha).localeCompare(aIso(a.fecha)) || Number(b.folio) - Number(a.folio));
    return { pagos, total: pagos.reduce((s, p) => s + (p.monto || 0), 0), desde: ddmmyyyy(desde), hasta: ddmmyyyy(hasta) };
  });
}

// ---------------------------------------------------------------------------
// Datos de una unidad — Crear Unidades → Listado de Unidades.
// GET unidades/todas2 (lo que carga esa pantalla).
export function obtenerDatosUnidad({ condominio, unidad }) {
  return enCondominio(condominio, async ({ page, url }) => {
    await page.goto(url('unidades/index2'), { waitUntil: 'load' });
    const r = await page.request.get(url('unidades/todas2'));
    // Grupo | Unidad | Elemento | Alícuota | Alícuota total | Fecha entrega | Responsable | Correo resp. | Propietario | Correo prop.
    const filas = tablaPrincipal(await r.text()).filter((f) => f.length >= 10 && f[1] && f[1] !== 'Unidad');
    const opciones = filas.map((f, i) => ({ id: String(i), texto: f[1] }));
    const elegida = encontrarUnidad(opciones, unidad);
    const f = filas[Number(elegida.id)];
    const vacio = (v) => (!v || /^[-\s.]*$/.test(v) ? null : v);
    return {
      unidad: f[1],
      elementos: vacio(f[2]),
      alicuota: vacio(f[4]),
      fechaEntrega: vacio(f[5]),
      responsable: vacio(f[6]),
      correoResponsable: vacio(f[7]),
      propietario: vacio(f[8]),
      correoPropietario: vacio(f[9]),
    };
  });
}

// ---------------------------------------------------------------------------
// Fondos — Banco → Fondos. GET bancos/lista_fondos.
export function obtenerFondos({ condominio }) {
  return enCondominio(condominio, async ({ page, url }) => {
    await page.goto(url('bancos/fondos'), { waitUntil: 'load' });
    const r = await page.request.get(url('bancos/lista_fondos'));
    // Nombre | Descripción | Saldo teórico | Cuenta corriente | Activo/Inactivo | Visible en minuta | Herramientas
    const fondos = [];
    let total = null;
    for (const f of tablaPrincipal(await r.text())) {
      const totalCelda = f.find((c) => /^Total\s*:/.test(c));
      if (totalCelda) total = montoCL(totalCelda);
      else if (f.length >= 6 && f[0] && montoCL(f[2]) !== null) {
        fondos.push({ nombre: f[0], saldo: montoCL(f[2]), cuenta: f[3], activo: /activo/i.test(f[4]) && !/inactivo/i.test(f[4]) });
      }
    }
    return { fondos, total: total ?? fondos.reduce((s, x) => s + x.saldo, 0) };
  });
}

// ---------------------------------------------------------------------------
// Trabajadores — Remuneraciones → Trabajadores.
// POST contratos/todos (parametro 1 = vigentes, igual que el filtro de la pantalla).
export function obtenerTrabajadores({ condominio }) {
  return enCondominio(condominio, async ({ page, url }) => {
    await page.goto(url('contratos/index'), { waitUntil: 'load' });
    const r = await page.request.post(url('contratos/todos'), { form: { parametro: '1' } });
    // Empleado | Rut | Fecha | Tipo contrato | Tipo sueldo | Herramientas
    const trabajadores = tablaPrincipal(await r.text())
      .filter((f) => f.length >= 5 && f[0] && f[0] !== 'Empleado' && /\d/.test(f[1]))
      .map((f) => ({ nombre: f[0], rut: f[1], fechaContrato: f[2], tipoContrato: f[3], tipoSueldo: f[4] }));
    trabajadores.sort((a, b) => normalizarTexto(a.nombre).localeCompare(normalizarTexto(b.nombre)));
    return { trabajadores };
  });
}
