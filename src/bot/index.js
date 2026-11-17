import { crearChat } from './telegram.js';
import { leerEstado, guardarEstado, borrarEstado } from './estado.js';
import { iaDisponible, interpretar, redactar, charlar, anotar } from './ia.js';
import { CANCELAR, esBoton, BOTON_MENU, MENU_PRINCIPAL, SUBMENUS, BOTONES_ACCION, TEXTO_MENU } from './comun.js';
import { PROCESOS_LECTURA } from './procesos/lectura/index.js';
import { PROCESOS_ESCRITURA } from './procesos/escritura/index.js';
import { MODULOS, moduloContratado } from './planes.js';

// Un proceso por cada "tipo" que reconoce Claude: los de lectura vienen en
// todos los planes; los de escritura solo si el cliente tiene su módulo.
const PROCESOS = {
  ...PROCESOS_LECTURA,
  ...Object.fromEntries(Object.entries(PROCESOS_ESCRITURA).map(([tipo, e]) => [tipo, e.proceso])),
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
  // Todo lo que manda el bot queda en la memoria de la conversación.
  const enviarOriginal = chat.enviar;
  chat.enviar = (t, botones) => {
    anotar(chatId, 'assistant', t);
    return enviarOriginal(t, botones);
  };
  // Respuesta final de una consulta: la IA la redacta en lenguaje natural a
  // partir de los datos; si no hay IA (o falla) se manda el texto tal cual.
  chat.responder = async (t, botones) => chat.enviar((await redactar(chatId, t)) || t, botones);
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
      // La IA del servidor interpreta con el historial del chat ("¿y el 1012?").
      // Si no está configurada o falla, se usa lo que mandó Activepieces.
      const ia = iaDisponible() ? await interpretar(chatId, texto || '') : null;
      if (ia && (ia.tipo || !datos.tipo)) datos = ia;
      // Si Claude no reconoce el tipo (respuesta suelta como "Santa Rosa" o un
      // botón), se sigue con lo que se estaba conversando.
      tipo = datos.tipo || (previo && previo.tipo) || '';
      // "Cuánto debe / lo que debe / deuda" es la deuda de la unidad, no el PDF
      // del gasto común (Claude a veces los confunde por la palabra "gasto común").
      if (tipo === 'gasto_comun' && /\b(debe|deben|deuda|adeuda|pag[oó]|al d[ií]a)\b/i.test(texto || '')
        && !/\b(boleta|nota de cobro|pdf|documento|env[ií]a|m[aá]nda)/i.test(texto || '')) {
        tipo = 'deuda_unidad';
        datos = { ...datos, tipo };
      }
    }
    anotar(chatId, 'user', texto);
    const proceso = PROCESOS[tipo];
    if (!proceso && iaDisponible()) {
      const respuesta = await charlar(chatId);
      if (respuesta) {
        await chat.enviar(respuesta, MENU_PRINCIPAL);
        await chat.reaccionar(null);
        return;
      }
    }
    if (!proceso) {
      if (datos.respuesta && !previo) await chat.enviar(datos.respuesta);
      await mostrarMenu(chat);
      return;
    }

    const escritura = PROCESOS_ESCRITURA[tipo];
    if (escritura && !moduloContratado(escritura.modulo)) {
      borrarEstado(chatId);
      await chat.enviar(`Eso es parte del módulo ${MODULOS[escritura.modulo]}, que no está incluido en tu plan. Si te interesa, pídeselo a Gestora.`, MENU_PRINCIPAL);
      await chat.reaccionar(null);
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
