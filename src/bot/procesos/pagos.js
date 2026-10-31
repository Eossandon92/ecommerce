import { encolar } from '../../cola.js';
import { obtenerPagos } from '../../consultas.js';
import { juntarDatos, pesos, nombreOVacio, LISTO } from '../comun.js';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// Rango de fechas según lo pedido: hoy, ayer, semana (últimos 7 días), un mes,
// o por defecto el mes en curso hasta hoy.
function rangoFechas(d) {
  const hoy = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Santiago' }));
  hoy.setHours(0, 0, 0, 0);
  const dias = (n) => new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + n);
  if (d.rango === 'hoy') return { desde: hoy, hasta: hoy, texto: 'hoy' };
  if (d.rango === 'ayer') return { desde: dias(-1), hasta: dias(-1), texto: 'ayer' };
  if (d.rango === 'semana') return { desde: dias(-6), hasta: hoy, texto: 'los últimos 7 días' };
  const idxMes = MESES.indexOf((d.mes || '').toLowerCase());
  if (idxMes >= 0) {
    const anio = Number(d.anio) || hoy.getFullYear();
    return { desde: new Date(anio, idxMes, 1), hasta: new Date(anio, idxMes + 1, 0), texto: `${MESES[idxMes]} ${anio}` };
  }
  return { desde: new Date(hoy.getFullYear(), hoy.getMonth(), 1), hasta: hoy, texto: `${MESES[hoy.getMonth()]} (hasta hoy)` };
}

// Pagos de gasto común recibidos (Informe de Ingresos de Kastor).
export async function manejar(ctx) {
  const { chat, datos, borrar } = ctx;
  const p = ctx.previo || {};
  const d = await juntarDatos(ctx, ['condominio'], {
    rango: datos.rango || p.rango || '',
    mes: datos.mes || p.mes || '',
    anio: datos.anio || p.anio || '',
  });
  if (!d) return;
  borrar();

  const { desde, hasta, texto } = rangoFechas(d);
  const r = await chat.conEspera(`Buscando los pagos de ${texto} en ${d.condominio}`, () =>
    encolar(() => obtenerPagos({ condominio: d.condominio, desde, hasta })),
  );

  if (!r.pagos.length) {
    await chat.enviar(`No hay pagos registrados en ${r.comunidad} para ${texto}. ${LISTO}`);
    await chat.reaccionar('👌');
    return;
  }

  const lineas = [
    `💵 Pagos recibidos en ${r.comunidad} · ${texto}`,
    `${r.pagos.length} pagos · total ${pesos(r.total)}`,
    '',
    'Más recientes:',
    ...r.pagos.slice(0, 12).map((x) => {
      const nombre = nombreOVacio(x.nombre);
      return `• ${x.fecha.slice(0, 5)} · ${x.unidad}${nombre ? ` · ${nombre}` : ''} — ${pesos(x.monto)}`;
    }),
  ];
  if (r.pagos.length > 12) lineas.push(`… y ${r.pagos.length - 12} más en la planilla.`);
  await chat.enviar(lineas.join('\n'));

  await chat.enviarPlanilla(
    `Pagos_${r.comunidad.replace(/\s+/g, '_')}_${r.desde}_al_${r.hasta}.csv`,
    ['Fecha', 'N° ingreso', 'Unidad', 'Nombre', 'Forma de pago', 'Monto'],
    r.pagos.map((x) => [x.fecha, x.folio, x.unidad, nombreOVacio(x.nombre) || '', x.forma, x.monto]),
    `📎 Todos los pagos para abrir en Excel. ${LISTO}`,
  );
  await chat.reaccionar('👌');
}
