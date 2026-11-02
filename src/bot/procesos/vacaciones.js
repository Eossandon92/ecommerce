import fs from 'node:fs';
import { encolar } from '../../cola.js';
import { obtenerVacaciones } from '../../vacaciones.js';
import { CANCELAR, NO_SE, LISTO, esBoton, condominioDelMensaje, preguntarFaltantes, numeroCL } from '../comun.js';

// Días de vacaciones disponibles de un trabajador (solo lectura en Kastor).
export async function manejar({ chat, datos, previo, texto, guardar, borrar }) {
  const p = previo || {};

  // Tocó uno de los botones con los nombres que coincidían.
  const eligioPersona = p.opciones ? p.opciones.find((o) => esBoton(texto, o)) : null;
  if (p.opciones && !eligioPersona && !datos.nombre) {
    await chat.enviar('Toca uno de los nombres, o "Cancelar".', [...p.opciones, CANCELAR]);
    await chat.reaccionar(null);
    return;
  }

  const combinado = {
    nombre: eligioPersona || datos.nombre || p.nombre || '',
    // Texto suelto como condominio solo si ya se sabe el nombre (si no, "Pedro
    // Soto" podría tomarse por "Pedro de Valdivia").
    condominio: condominioDelMensaje({ texto, datos, previo: p, preguntando: p.condominioPreguntado && !!(p.nombre || datos.nombre) }),
  };
  const condominioYaPreguntado = !!p.condominioPreguntado || esBoton(texto, NO_SE);
  const faltaNombre = !combinado.nombre;
  const faltaCondominio = !combinado.condominio && !condominioYaPreguntado;

  if (faltaNombre || faltaCondominio) {
    guardar({ ...combinado, condominioPreguntado: faltaCondominio || condominioYaPreguntado });
    const partes = [];
    if (faltaNombre) partes.push('el nombre del trabajador');
    if (faltaCondominio) partes.push('en qué condominio trabaja');
    await preguntarFaltantes(chat, partes, faltaCondominio);
    await chat.reaccionar(null);
    return;
  }

  borrar();

  let r;
  try {
    r = await chat.conEspera(`Buscando las vacaciones de ${combinado.nombre}`, () =>
      encolar(() => obtenerVacaciones({ consulta: combinado.nombre, condominio: combinado.condominio, conComprobante: true })),
    );
  } catch (err) {
    if (err.coincidencias) {
      guardar({ condominio: err.comunidad, condominioPreguntado: true, opciones: err.coincidencias });
      await chat.enviar(
        `En ${err.comunidad} hay ${err.coincidencias.length} personas que calzan con "${combinado.nombre}". ¿Cuál es?`,
        [...err.coincidencias, CANCELAR],
      );
      await chat.reaccionar('🤔');
      return;
    }
    await chat.enviar(`No pude obtener las vacaciones: ${err.message}`);
    await chat.reaccionar('🤷');
    return;
  }

  const lineas = [
    `🏖️ Vacaciones de ${r.nombre}`,
    r.comunidad,
    '',
    `Días hábiles disponibles: ${numeroCL(r.habilesDisponibles)}`,
  ];
  if (r.progresivosAcumulados || r.progresivosDisponibles) {
    lineas.push(`Días progresivos disponibles: ${numeroCL(r.progresivosDisponibles)}`);
  }
  lineas.push(`(acumulados ${numeroCL(r.habilesAcumulados)} · usados ${numeroCL(r.habilesUtilizados)})`);
  if (r.fechaInicioContrato) lineas.push(`Inicio de contrato: ${r.fechaInicioContrato}`);
  const ultima = (r.historial || [])[0];
  if (ultima) lineas.push(`Últimas vacaciones: ${ultima.desde} al ${ultima.hasta} (${numeroCL(ultima.habiles)} días hábiles)`);
  else lineas.push('No tiene vacaciones registradas en Kastor, así que no hay comprobante para adjuntar.');

  // El ✔️ va en el último mensaje: el texto del comprobante si hay PDF, si no este.
  if (!r.archivoComprobante) lineas.push('', LISTO);
  await chat.enviar(lineas.join('\n'));

  // Comprobante de las últimas vacaciones (el PDF del ícono de impresora en Kastor).
  if (r.archivoComprobante) {
    try {
      const ult = r.historial[0];
      await chat.enviarDocumento(
        r.archivoComprobante,
        r.nombreComprobante,
        `📎 Te adjunto el último comprobante de vacaciones disponible (${ult.desde} al ${ult.hasta}). ${LISTO}`,
      );
    } catch (err) {
      await chat.enviar(`No pude enviar el comprobante: ${err.message}`);
    } finally {
      fs.unlink(r.archivoComprobante, () => {});
    }
  }
  await chat.reaccionar('👌');
}
