import fs from 'node:fs';
import { encolar } from '../../cola.js';
import { obtenerLiquidacion } from '../../kastor.js';
import { NO_SE, esBoton, condominioDeBoton, preguntarFaltantes } from '../comun.js';

// Liquidación de sueldo de un trabajador (PDF desde Kastor).
export async function manejar({ chat, datos, previo, texto, guardar, borrar }) {
  const p = previo || {};
  const combinado = {
    nombre: datos.nombre || p.nombre || '',
    mes: datos.mes || p.mes || '',
    anio: datos.anio || p.anio || 2026,
    condominio: condominioDeBoton(texto) || datos.condominio || p.condominio || '',
  };
  const condominioYaPreguntado = !!p.condominioPreguntado || esBoton(texto, NO_SE);
  const faltaNombre = !combinado.nombre;
  const faltaMes = !combinado.mes;
  const faltaCondominio = !combinado.condominio && !condominioYaPreguntado;

  if (faltaNombre || faltaMes || faltaCondominio) {
    guardar({ ...combinado, condominioPreguntado: faltaCondominio || condominioYaPreguntado });
    const partes = [];
    if (faltaNombre) partes.push('el nombre (o RUT) del trabajador');
    if (faltaMes) partes.push('de qué mes');
    if (faltaCondominio) partes.push('en qué condominio trabaja');
    await preguntarFaltantes(chat, partes, faltaCondominio);
    await chat.reaccionar(null);
    return;
  }

  borrar();
  await chat.enviar(`Claro, te envío la liquidación de sueldo de ${combinado.nombre} de ${combinado.mes} ${combinado.anio} 👍`);

  let resultado;
  try {
    resultado = await chat.conEspera('Buscando la liquidación en Kastor, puede tardar unos minutos', () =>
      encolar(() => obtenerLiquidacion({
        consulta: combinado.nombre,
        mes: combinado.mes,
        anio: combinado.anio,
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
    const nombreArchivo = `Liquidacion_${resultado.nombre}_${combinado.mes}_${combinado.anio}.pdf`.replace(/\s+/g, '_');
    await chat.enviarDocumento(resultado.archivo, nombreArchivo);
    await chat.reaccionar('👌');
    await chat.celebrar();
  } finally {
    fs.unlink(resultado.archivo, () => {});
  }
}
