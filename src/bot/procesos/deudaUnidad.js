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
  const lineas = [`🏠 Unidad ${r.unidad} · ${r.comunidad}`];
  if (propietario) lineas.push(`Propietario: ${propietario}`);
  lineas.push('');
  lineas.push(r.deuda > 0 ? `💰 Deuda actual: ${pesos(r.deuda)}` : '✅ Está al día, sin deuda.');
  if (r.ultimoPago) {
    lineas.push(`Último pago: ${r.ultimoPago.fecha} · ${pesos(r.ultimoPago.pago)}${r.ultimoPago.detalle ? ` (${r.ultimoPago.detalle})` : ''}`);
  } else {
    lineas.push(`Sin pagos registrados en ${r.anio}.`);
  }
  const ultimos = r.movimientos.slice(-5).reverse();
  if (ultimos.length) {
    lineas.push('', 'Últimos movimientos:');
    for (const m of ultimos) {
      lineas.push(m.pago ? `• ${m.fecha} pago ${pesos(m.pago)}` : `• ${m.fecha} ${m.detalle || 'cobro'} ${pesos(m.cobro)}`);
    }
  }
  lineas.push('', LISTO);
  await chat.enviar(lineas.join('\n'));
  await chat.reaccionar('👌');
}
