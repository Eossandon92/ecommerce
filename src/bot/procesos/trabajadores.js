import { encolar } from '../../cola.js';
import { obtenerTrabajadores } from '../../consultas.js';
import { juntarDatos, LISTO } from '../comun.js';

const fechaCL = (iso) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.split('-').reverse().join('-') : iso);

// Trabajadores con contrato vigente (Remuneraciones → Trabajadores de Kastor).
export async function manejar(ctx) {
  const { chat, borrar } = ctx;
  const d = await juntarDatos(ctx, ['condominio']);
  if (!d) return;
  borrar();

  const r = await chat.conEspera(`Buscando los trabajadores de ${d.condominio}`, () =>
    encolar(() => obtenerTrabajadores({ condominio: d.condominio })),
  );

  if (!r.trabajadores.length) {
    await chat.enviar(`${r.comunidad} no tiene trabajadores con contrato vigente. ${LISTO}`);
    await chat.reaccionar('👌');
    return;
  }
  const lineas = [
    `👷 ${r.trabajadores.length} trabajadores vigentes en ${r.comunidad}`,
    '',
    ...r.trabajadores.map((t) => `• ${t.nombre} — ${t.tipoContrato}, desde ${fechaCL(t.fechaContrato)}`),
    '',
    'Para ver vacaciones o liquidación de alguien, pídemelo por su nombre. ' + LISTO,
  ];
  await chat.enviar(lineas.join('\n'));
  await chat.reaccionar('👌');
}
