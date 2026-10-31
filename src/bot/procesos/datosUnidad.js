import { encolar } from '../../cola.js';
import { obtenerDatosUnidad } from '../../consultas.js';
import { juntarDatos, LISTO } from '../comun.js';

// Responsable, propietario y correos de una unidad (Listado de Unidades de Kastor).
export async function manejar(ctx) {
  const { chat, borrar } = ctx;
  const d = await juntarDatos(ctx, ['condominio', 'unidad']);
  if (!d) return;
  borrar();

  const r = await chat.conEspera(`Buscando los datos de la unidad ${d.unidad}`, () =>
    encolar(() => obtenerDatosUnidad({ condominio: d.condominio, unidad: d.unidad })),
  );

  const o = (v) => v || 'sin registrar';
  const lineas = [
    `🏠 Unidad ${r.unidad} · ${r.comunidad}`,
    '',
    `👤 Responsable de la deuda: ${o(r.responsable)}`,
    `✉️ Correo: ${o(r.correoResponsable)}`,
    '',
    `🔑 Propietario: ${o(r.propietario)}`,
    `✉️ Correo: ${o(r.correoPropietario)}`,
  ];
  if (r.elementos && r.elementos !== r.unidad) lineas.push('', `Incluye: ${r.elementos}`);
  if (r.alicuota) lineas.push(`Alícuota: ${r.alicuota}`);
  if (r.fechaEntrega) lineas.push(`Fecha de entrega: ${r.fechaEntrega}`);
  lineas.push('', LISTO);
  await chat.enviar(lineas.join('\n'));
  await chat.reaccionar('👌');
}
