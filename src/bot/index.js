import { crearChat } from './telegram.js';
import { leerEstado, guardarEstado, borrarEstado } from './estado.js';
import { AYUDA, CANCELAR, esBoton } from './comun.js';
import * as vacaciones from './procesos/vacaciones.js';
import * as liquidacion from './procesos/liquidacion.js';
import * as gastoComun from './procesos/gastoComun.js';

// Un proceso por cada "tipo" que reconoce Claude (ver activepieces/prompt-claude.txt).
// Para sumar uno nuevo: crear src/bot/procesos/<nombre>.js con manejar() y
// agregarlo aquí y al prompt.
const PROCESOS = {
  vacaciones,
  liquidacion,
  gasto_comun: gastoComun,
};

// Los mensajes de un mismo chat se atienden en orden, uno a la vez, para que
// dos mensajes seguidos no se pisen el estado de la conversación.
const colasPorChat = new Map();

export function recibirMensaje(mensaje) {
  const clave = String(mensaje.chatId);
  const anterior = colasPorChat.get(clave) || Promise.resolve();
  const actual = anterior.then(() => atender(mensaje)).catch((err) => console.error('[bot]', err));
  colasPorChat.set(clave, actual);
  actual.finally(() => {
    if (colasPorChat.get(clave) === actual) colasPorChat.delete(clave);
  });
  return actual;
}

async function atender({ chatId, messageId, texto, datos }) {
  const chat = crearChat({ chatId, messageId });
  await chat.reaccionar('👀');

  try {
    const previo = leerEstado(chatId);

    if (previo && esBoton(texto, CANCELAR)) {
      borrarEstado(chatId);
      await chat.enviar('Listo, cancelado 👍');
      await chat.reaccionar('👌');
      return;
    }

    // Si Claude no reconoce el tipo (respuesta suelta como "Santa Rosa" o un
    // botón), se sigue con lo que se estaba conversando.
    const tipo = datos.tipo || (previo && previo.tipo) || '';
    const proceso = PROCESOS[tipo];
    if (!proceso) {
      await chat.enviar(datos.respuesta || `No entendí tu pedido 🤔 ${AYUDA}`);
      await chat.reaccionar(null);
      return;
    }

    await proceso.manejar({
      chat,
      datos,
      texto: texto || '',
      previo: previo && previo.tipo === tipo ? previo : null,
      guardar: (d) => guardarEstado(chatId, { ...d, tipo }),
      borrar: () => borrarEstado(chatId),
    });
  } catch (err) {
    console.error('[bot] Error atendiendo mensaje:', err);
    await chat.enviar(`Ups, algo falló: ${err.message}`);
    await chat.reaccionar('🤷');
  }
}

// La salida de "Preguntar a Claude" a veces viene envuelta en ```json ... ```.
export function interpretarClaude(respuesta) {
  if (respuesta && typeof respuesta === 'object') return respuesta;
  const texto = (respuesta || '').toString().trim()
    .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
  return JSON.parse(texto);
}
