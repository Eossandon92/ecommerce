import { crearChat } from './telegram.js';
import { leerEstado, guardarEstado, borrarEstado } from './estado.js';
import { CANCELAR, esBoton, BOTON_MENU, MENU_PRINCIPAL, SUBMENUS, BOTONES_ACCION, TEXTO_MENU } from './comun.js';
import * as vacaciones from './procesos/vacaciones.js';
import * as liquidacion from './procesos/liquidacion.js';
import * as gastoComun from './procesos/gastoComun.js';
import * as morosos from './procesos/morosos.js';
import * as deudaUnidad from './procesos/deudaUnidad.js';
import * as pagos from './procesos/pagos.js';
import * as datosUnidad from './procesos/datosUnidad.js';
import * as fondos from './procesos/fondos.js';
import * as trabajadores from './procesos/trabajadores.js';

// Un proceso por cada "tipo" que reconoce Claude (ver activepieces/prompt-claude.txt).
// Para sumar uno nuevo: crear src/bot/procesos/<nombre>.js con manejar() y
// agregarlo aquí y al prompt.
const PROCESOS = {
  vacaciones,
  liquidacion,
  gasto_comun: gastoComun,
  morosos,
  deuda_unidad: deudaUnidad,
  pagos,
  datos_unidad: datosUnidad,
  fondos,
  trabajadores,
};

const PALABRAS_MENU = ['/start', '/menu', 'menu', 'menú', 'ayuda', 'hola', 'inicio'];

async function mostrarMenu(chat) {
  await chat.enviar(TEXTO_MENU, MENU_PRINCIPAL);
  await chat.reaccionar(null);
}

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

async function atender({ chatId, messageId, texto, datos: datosClaude }) {
  let datos = datosClaude || {};
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

    // Menú: saludo, /start, "menú" o el botón de volver.
    if (esBoton(texto, BOTON_MENU) || PALABRAS_MENU.some((p) => esBoton(texto, p))) {
      borrarEstado(chatId);
      await mostrarMenu(chat);
      return;
    }
    // Botón de un área del menú: muestra sus consultas.
    const area = Object.keys(SUBMENUS).find((a) => esBoton(texto, a));
    if (area) {
      borrarEstado(chatId);
      await chat.enviar(`${area} · ¿Qué necesitas?`, SUBMENUS[area]);
      await chat.reaccionar(null);
      return;
    }

    // Botón de una consulta: arranca ese proceso de cero (pide lo que falte).
    const accion = Object.keys(BOTONES_ACCION).find((b) => esBoton(texto, b));
    let tipo;
    let previoUsable = previo;
    if (accion) {
      tipo = BOTONES_ACCION[accion];
      datos = { tipo };
      previoUsable = null;
      borrarEstado(chatId);
    } else {
      // Si Claude no reconoce el tipo (respuesta suelta como "Santa Rosa" o un
      // botón), se sigue con lo que se estaba conversando.
      tipo = datos.tipo || (previo && previo.tipo) || '';
    }
    const proceso = PROCESOS[tipo];
    if (!proceso) {
      if (datos.respuesta && !previo) await chat.enviar(datos.respuesta);
      await mostrarMenu(chat);
      return;
    }

    await proceso.manejar({
      chat,
      datos,
      texto: texto || '',
      previo: previoUsable && previoUsable.tipo === tipo ? previoUsable : null,
      guardar: (d) => guardarEstado(chatId, { ...d, tipo }),
      borrar: () => borrarEstado(chatId),
    });
  } catch (err) {
    console.error('[bot] Error atendiendo mensaje:', err);
    await chat.enviar(`No pude completar la consulta: ${err.message}`);
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
