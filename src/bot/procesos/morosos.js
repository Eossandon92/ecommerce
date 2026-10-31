import { encolar } from '../../cola.js';
import { obtenerMorosos } from '../../consultas.js';
import { juntarDatos, pesos, nombreOVacio, LISTO } from '../comun.js';

// Morosos de un condominio (Reporte de Morosos de Kastor).
export async function manejar(ctx) {
  const { chat, datos, borrar } = ctx;
  const d = await juntarDatos(ctx, ['condominio'], { meses: datos.meses || (ctx.previo && ctx.previo.meses) || 1 });
  if (!d) return;
  borrar();

  const r = await chat.conEspera(`Revisando los morosos de ${d.condominio}`, () =>
    encolar(() => obtenerMorosos({ condominio: d.condominio, mesesMinimo: Number(d.meses) || 1 })),
  );

  const desde = r.mesesMinimo > 1 ? ` con ${r.mesesMinimo} meses o más` : '';
  if (!r.morosos.length) {
    await chat.enviar(`🎉 ${r.comunidad} no tiene unidades morosas${desde}. ${LISTO}`);
    await chat.reaccionar('👌');
    return;
  }

  const lineas = [
    `🔴 Morosos de ${r.comunidad}${desde}`,
    `${r.morosos.length} unidades · deuda total ${pesos(r.total)}`,
    '',
    'Mayores deudas:',
    ...r.morosos.slice(0, 15).map((m) => {
      const nombre = nombreOVacio(m.nombre);
      return `• ${m.unidad}${nombre ? ` · ${nombre}` : ''} — ${pesos(m.total)} (${m.meses} ${m.meses === 1 ? 'mes' : 'meses'})`;
    }),
  ];
  if (r.morosos.length > 15) lineas.push(`… y ${r.morosos.length - 15} más en la planilla.`);
  await chat.enviar(lineas.join('\n'));

  await chat.enviarPlanilla(
    `Morosos_${r.comunidad.replace(/\s+/g, '_')}.csv`,
    ['Unidad', 'Nombre', 'Meses en mora', 'Períodos', 'Deuda'],
    r.morosos.map((m) => [m.unidad, nombreOVacio(m.nombre) || '', m.meses, m.periodos, m.total]),
    `📎 Lista completa de morosos para abrir en Excel. ${LISTO}`,
  );
  await chat.reaccionar('👌');
}
