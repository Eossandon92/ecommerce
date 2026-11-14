import { encolar } from '../../cola.js';
import { obtenerCartolaUnidad } from '../../consultas.js';
import { juntarDatos, pesos, nombreOVacio, LISTO } from '../comun.js';

// Deuda, último pago y movimientos de una unidad (Cartola por Unidad de Kastor).
export async function manejar(ctx) {
  const { chat, borrar } = ctx;
  const d = await juntarDatos(ctx, ['condominio', 'unidad']);
  if (!d) return;
  borrar();

  const r = await chat.conEspera(`Revisando la cuenta de la unidad ${d.unidad}`, () =>
    encolar(() => obtenerCartolaUnidad({ condominio: d.condominio, unidad: d.unidad })),
  );

  const propietario = nombreOVacio(r.propietario);
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const mesDe = (fecha) => { const [, mm, aa] = fecha.split('-'); return `${MESES[Number(mm) - 1]} ${aa}`; };

  // Qué meses componen la deuda: los cobros más recientes hasta completar el saldo.
  const pendientes = [];
  let resto = r.deuda || 0;
  for (const m of [...r.movimientos].reverse()) {
    if (resto <= 0) break;
    if (!m.cobro) continue;
    const monto = Math.min(m.cobro, resto);
    pendientes.unshift({ mes: mesDe(m.fecha), monto, parcial: monto < m.cobro });
    resto -= monto;
  }

  const lineas = [];
  if (r.deuda > 0) {
    lineas.push(`La unidad ${r.unidad} de ${r.comunidad} debe ${pesos(r.deuda)} 💰`);
    if (pendientes.length) {
      lineas.push('', pendientes.length === 1 ? 'Corresponde a:' : `Son ${pendientes.length} meses:`);
      for (const x of pendientes) lineas.push(`• ${x.mes[0].toUpperCase()}${x.mes.slice(1)}: ${pesos(x.monto)}${x.parcial ? ' (saldo pendiente)' : ''}`);
      if (resto > 0) lineas.push(`• Deuda de años anteriores: ${pesos(resto)}`);
    }
  } else {
    lineas.push(`La unidad ${r.unidad} de ${r.comunidad} está al día, no debe nada ✅`);
  }
  lineas.push('');
  lineas.push(r.ultimoPago
    ? `Su último pago fue el ${r.ultimoPago.fecha} por ${pesos(r.ultimoPago.pago)}${r.ultimoPago.detalle ? ` (${r.ultimoPago.detalle})` : ''}.`
    : `No tiene pagos registrados en ${r.anio}.`);
  if (propietario) lineas.push(`Propietario: ${propietario}`);
  lineas.push('', LISTO);
  await chat.enviar(lineas.join('\n'));
  await chat.reaccionar('👌');
}
