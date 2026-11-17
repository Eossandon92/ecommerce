import { encolar } from '../../../cola.js';
import { obtenerContactoTrabajador } from '../../../consultas.js';
import { CANCELAR, NO_SE, LISTO, esBoton, condominioDelMensaje, preguntarFaltantes } from '../../comun.js';

// Correo, teléfono y celular de un trabajador (ficha en Kastor, solo lectura).
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
    condominio: condominioDelMensaje({ texto, datos, previo: p, preguntando: p.condominioPreguntado && !!(p.nombre || datos.nombre) }),
  };
  const faltaNombre = !combinado.nombre;
  // A diferencia de vacaciones, aquí el condominio es obligatorio: la ficha
  // se busca dentro de un condominio.
  const faltaCondominio = !combinado.condominio;

  if (faltaNombre || faltaCondominio) {
    guardar({ ...combinado, condominioPreguntado: faltaCondominio || !!p.condominioPreguntado || esBoton(texto, NO_SE) });
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
    r = await chat.conEspera(`Buscando el contacto de ${combinado.nombre}`, () =>
      encolar(() => obtenerContactoTrabajador({ condominio: combinado.condominio, consulta: combinado.nombre })),
    );
  } catch (err) {
    if (err.coincidencias) {
      guardar({ condominio: combinado.condominio, condominioPreguntado: true, opciones: err.coincidencias });
      await chat.enviar(`${err.message} ¿Cuál es?`, [...err.coincidencias, CANCELAR]);
      await chat.reaccionar('🤔');
      return;
    }
    await chat.enviar(`No pude obtener el contacto: ${err.message}`);
    await chat.reaccionar('🤷');
    return;
  }

  const datosContacto = [
    r.correo ? `📧 Correo: ${r.correo}` : '',
    r.telefono ? `📞 Teléfono: ${r.telefono}` : '',
    r.celular ? `📱 Celular: ${r.celular}` : '',
  ].filter(Boolean);
  await chat.responder(datosContacto.length
    ? [`Contacto de ${r.nombre} (${r.comunidad}):`, ...datosContacto, LISTO].join('\n')
    : `${r.nombre} no tiene correo ni teléfono registrados en su ficha de Kastor (${r.comunidad}). ${LISTO}`);
  await chat.reaccionar('👌');
}
