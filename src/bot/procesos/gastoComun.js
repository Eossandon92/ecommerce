import fs from 'node:fs';
import { encolar } from '../../cola.js';
import { obtenerGastoComun } from '../../gastoComun.js';
import { juntarDatos, nombreOVacio, LISTO } from '../comun.js';

// Gasto común (nota de cobro) de una unidad: se manda el PDF por Telegram.
// El envío por correo al propietario queda para cuando se conecte el Gmail
// del condominio en Activepieces.
export async function manejar(ctx) {
  const { chat, datos, previo, texto, guardar, borrar } = ctx;
  const p = previo || {};
  // Si se estaba preguntando el mes, la respuesta suelta ("octubre") vale tal cual.
  const mes = (datos.mes || (p.esperando === 'mes' ? (texto || '').trim().toLowerCase() : '') || p.mes || '').trim();
  const anio = datos.anio || p.anio || 2026;

  const d = await juntarDatos(ctx, ['condominio', 'unidad'], { mes, anio });
  if (!d) return;
  if (!d.mes) {
    guardar({ ...d, esperando: 'mes' });
    await chat.enviar('¿De qué mes? (ej: octubre)');
    await chat.reaccionar(null);
    return;
  }
  borrar();

  await chat.enviar(`Claro, te envío el gasto común de la unidad ${d.unidad} de ${d.mes} ${d.anio} 👍`);

  let r;
  try {
    r = await chat.conEspera('Buscando la nota de cobro en Kastor, puede tardar unos minutos', () =>
      encolar(() => obtenerGastoComun({ condominio: d.condominio, unidad: d.unidad, mes: d.mes, anio: d.anio, headless: true })),
    );
  } catch (err) {
    await chat.enviar(`No pude obtener el gasto común: ${err.message}`);
    await chat.reaccionar('🤷');
    return;
  }

  try {
    const propietario = nombreOVacio(r.propietario);
    const caption = [
      `Gasto común unidad ${r.unidad} · ${r.comunidad} · ${r.periodo || `${d.mes} ${d.anio}`}`,
      propietario ? `Propietario: ${propietario}` : '',
      r.correoPropietario ? `Correo: ${r.correoPropietario}` : '',
    ].filter(Boolean).join('\n');
    await chat.enviarDocumento(r.archivo, r.nombreArchivo, `${caption} ${LISTO}`);
    await chat.reaccionar('👌');
  } finally {
    fs.unlink(r.archivo, () => {});
  }
}
