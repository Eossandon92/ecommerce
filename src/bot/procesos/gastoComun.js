import { AYUDA } from '../comun.js';

// Todavía no habilitado: falta conectar el Gmail del condominio en
// Activepieces. La consulta a Kastor ya existe en src/gastoComun.js.
export async function manejar({ chat, borrar }) {
  borrar();
  await chat.enviar(`Todavía no puedo enviar gastos comunes, pronto estará listo 🙂 ${AYUDA}`);
  await chat.reaccionar(null);
}
