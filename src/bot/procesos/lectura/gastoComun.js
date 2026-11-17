import fs from 'node:fs';
import { encolar } from '../../../cola.js';
import { obtenerGastoComun } from '../../../gastoComun.js';
import { juntarDatos, nombreOVacio, mesesRecientes, LISTO } from '../../comun.js';

// Gasto común (nota de cobro) de una unidad: se manda el PDF por Telegram.
// El envío por correo al propietario queda para cuando se conecte el Gmail
// del condominio en Activepieces.
export async function manejar(ctx) {
  const { chat, datos, previo, borrar } = ctx;
  const p = previo || {};
  const mes = (datos.mes || p.mes || '').trim();
  const anio = datos.anio || p.anio || 2026;

  const d = await juntarDatos(ctx, ['condominio', 'unidad'], { mes, anio });
  if (!d) return;
  borrar();

  // Sin mes: la nota de cobro más reciente, sin preguntar.
  const intentos = d.mes ? [{ mes: d.mes, anio: d.anio }] : mesesRecientes();
  await chat.enviar(d.mes
    ? `Claro, te busco el gasto común de la unidad ${d.unidad} de ${d.mes} ${d.anio} 👍`
    : `Claro, te busco el último gasto común de la unidad ${d.unidad} 👍`);

  let r;
  try {
    r = await chat.conEspera('Buscando la nota de cobro en Kastor, puede tardar unos minutos', () =>
      encolar(async () => {
        let ultimoError;
        for (const { mes: m, anio: a } of intentos) {
          try {
            return await obtenerGastoComun({ condominio: d.condominio, unidad: d.unidad, mes: m, anio: a, headless: true });
          } catch (err) {
            ultimoError = err;
            if (!/No hay nota de cobro/i.test(err.message)) throw err;
          }
        }
        throw ultimoError;
      }),
    );
  } catch (err) {
    await chat.enviar(`No pude obtener el gasto común: ${err.message}`);
    await chat.reaccionar('🤷');
    return;
  }

  try {
    const propietario = nombreOVacio(r.propietario);
    const caption = [
      `Gasto común unidad ${r.unidad} · ${r.comunidad} · ${r.periodo}`,
      propietario ? `Propietario: ${propietario}` : '',
      r.correoPropietario ? `Correo: ${r.correoPropietario}` : '',
    ].filter(Boolean).join('\n');
    await chat.enviarDocumento(r.archivo, r.nombreArchivo, `${caption} ${LISTO}`);
    await chat.reaccionar('👌');
  } finally {
    fs.unlink(r.archivo, () => {});
  }
}
