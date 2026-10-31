import { encolar } from '../../cola.js';
import { obtenerFondos } from '../../consultas.js';
import { juntarDatos, pesos, LISTO } from '../comun.js';

// Saldo de los fondos del condominio (Banco → Fondos de Kastor).
export async function manejar(ctx) {
  const { chat, borrar } = ctx;
  const d = await juntarDatos(ctx, ['condominio']);
  if (!d) return;
  borrar();

  const r = await chat.conEspera(`Revisando los fondos de ${d.condominio}`, () =>
    encolar(() => obtenerFondos({ condominio: d.condominio })),
  );

  const conSaldo = r.fondos.filter((f) => f.saldo !== 0).sort((a, b) => b.saldo - a.saldo);
  const lineas = [
    `🏦 Fondos de ${r.comunidad}`,
    `Total: ${pesos(r.total)}`,
    '',
    ...conSaldo.map((f) => `• ${f.nombre}: ${pesos(f.saldo)}${f.activo ? '' : ' (inactivo)'}`),
  ];
  const enCero = r.fondos.length - conSaldo.length;
  if (enCero) lineas.push('', `${enCero} ${enCero === 1 ? 'fondo' : 'fondos'} en $0 no se muestran.`);
  lineas.push('', LISTO);
  await chat.enviar(lineas.join('\n'));
  await chat.reaccionar('👌');
}
