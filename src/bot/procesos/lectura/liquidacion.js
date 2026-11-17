import fs from 'node:fs';
import { encolar } from '../../../cola.js';
import { obtenerLiquidacion } from '../../../kastor.js';
import { NO_SE, LISTO, esBoton, condominioDelMensaje, preguntarFaltantes, mesesRecientes } from '../../comun.js';

// Liquidación de sueldo de un trabajador (PDF desde Kastor).
export async function manejar({ chat, datos, previo, texto, guardar, borrar }) {
  const p = previo || {};
  const combinado = {
    nombre: datos.nombre || p.nombre || '',
    mes: datos.mes || p.mes || '',
    anio: datos.anio || p.anio || 2026,
    // Texto suelto como condominio solo si ya se sabe el nombre (si no, "Pedro
    // Soto" podría tomarse por "Pedro de Valdivia").
    condominio: condominioDelMensaje({ texto, datos, previo: p, preguntando: p.condominioPreguntado && !!(p.nombre || datos.nombre) }),
  };
  const condominioYaPreguntado = !!p.condominioPreguntado || esBoton(texto, NO_SE);
  // Sin mes ("la última liquidación"): la más reciente, sin preguntar.
  const faltaNombre = !combinado.nombre;
  const faltaCondominio = !combinado.condominio && !condominioYaPreguntado;

  if (faltaNombre || faltaCondominio) {
    guardar({ ...combinado, condominioPreguntado: faltaCondominio || condominioYaPreguntado });
    const partes = [];
    if (faltaNombre) partes.push('el nombre (o RUT) del trabajador');
    if (faltaCondominio) partes.push('en qué condominio trabaja');
    await preguntarFaltantes(chat, partes, faltaCondominio);
    await chat.reaccionar(null);
    return;
  }

  borrar();
  await chat.enviar(combinado.mes
    ? `Claro, te envío la liquidación de sueldo de ${combinado.nombre} de ${combinado.mes} ${combinado.anio} 👍`
    : `Claro, te busco la última liquidación de sueldo de ${combinado.nombre} 👍`);

  let resultado;
  try {
    resultado = await chat.conEspera('Buscando la liquidación en Kastor, puede tardar unos minutos', () =>
      encolar(() => obtenerLiquidacion({
        consulta: combinado.nombre,
        periodos: combinado.mes ? [{ mes: combinado.mes, anio: combinado.anio }] : mesesRecientes(),
        condominio: combinado.condominio,
        headless: true,
      })),
    );
  } catch (err) {
    await chat.enviar(`No pude obtener la liquidación: ${err.message}`);
    await chat.reaccionar('🤷');
    return;
  }

  try {
    const nombreArchivo = `Liquidacion_${resultado.nombre}_${resultado.mes}_${resultado.anio}.pdf`.replace(/\s+/g, '_');
    await chat.enviarDocumento(resultado.archivo, nombreArchivo, `Liquidación de ${resultado.nombre} · ${resultado.mes} ${resultado.anio} ${LISTO}`);
    await chat.reaccionar('👌');
  } finally {
    fs.unlink(resultado.archivo, () => {});
  }
}
