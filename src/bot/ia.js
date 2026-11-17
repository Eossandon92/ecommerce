import { PROMPT_INTERPRETAR } from './promptInterpretar.js';

// IA conversacional del bot (Claude, llamado desde este servidor).
// - interpretar(): entiende el mensaje usando el historial del chat.
// - redactar(): convierte los datos de Kastor en una respuesta natural.
// Sin ANTHROPIC_API_KEY todo sigue funcionando como antes (plantillas fijas).
const MODELO = process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5';
const MAX_HISTORIAL = 12;
const TTL_HISTORIAL_MS = 60 * 60 * 1000;

export const iaDisponible = () => !!process.env.ANTHROPIC_API_KEY;

// ---------- Memoria de la conversación (en memoria, por chat) ----------
const historiales = new Map();

export function anotar(chatId, rol, texto) {
  if (!texto) return;
  const clave = String(chatId);
  const h = historiales.get(clave);
  const mensajes = h && h.expira > Date.now() ? h.mensajes : [];
  mensajes.push({ role: rol, content: String(texto).slice(0, 3000) });
  historiales.set(clave, { mensajes: mensajes.slice(-MAX_HISTORIAL), expira: Date.now() + TTL_HISTORIAL_MS });
}

function historial(chatId) {
  const h = historiales.get(String(chatId));
  return h && h.expira > Date.now() ? h.mensajes : [];
}

// La API exige turnos alternados que empiecen por "user".
function turnosAlternados(mensajes) {
  const out = [];
  for (const m of mensajes) {
    if (out.length && out[out.length - 1].role === m.role) out[out.length - 1].content += `\n${m.content}`;
    else out.push({ ...m });
  }
  while (out.length && out[0].role !== 'user') out.shift();
  return out;
}

async function claude({ system, messages, maxTokens = 600 }) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model: MODELO, max_tokens: maxTokens, system, messages }),
    signal: AbortSignal.timeout(30000),
  });
  const json = await r.json();
  if (!r.ok) throw new Error(json?.error?.message || `Claude respondió ${r.status}`);
  return (json.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
}

// Devuelve el mismo objeto que arma Activepieces ({tipo, unidad, condominio, ...})
// o null si no se pudo (el bot sigue con lo de Activepieces).
export async function interpretar(chatId, texto) {
  if (!iaDisponible()) return null;
  try {
    const previos = historial(chatId);
    const contexto = previos.length
      ? `Conversación hasta ahora:\n${previos.map((m) => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.content}`).join('\n')}\n\nMensaje nuevo del usuario: ${texto}`
      : texto;
    const salida = await claude({ system: PROMPT_INTERPRETAR, messages: [{ role: 'user', content: contexto }], maxTokens: 400 });
    const inicio = salida.indexOf('{');
    const fin = salida.lastIndexOf('}');
    return JSON.parse(salida.slice(inicio, fin + 1));
  } catch (err) {
    console.warn('[ia] interpretar:', err.message);
    return null;
  }
}

const PROMPT_REDACTAR = `Eres Pía, la asistente de GestionPro, una administradora de condominios en Chile. Conversas por Telegram con administradores y su equipo.

Te paso la conversación y, al final, los DATOS que sacamos del sistema Kastor para responder lo último que preguntó el usuario. Escribe la respuesta como lo haría una persona atenta y competente:
- Responde directo a lo que preguntó, en español de Chile, cercano y profesional (tutea).
- Usa SOLO los datos entregados. Nunca inventes montos, fechas, nombres ni unidades. Si algo no está en los datos, no lo afirmes.
- Conserva todos los montos y fechas exactamente como vienen.
- Si hay una lista (meses, morosos, pagos), mantenla con viñetas "•", una por línea. Si es muy larga, conserva la lista completa igual.
- Texto plano para Telegram: sin markdown, sin asteriscos ni #. Puedes usar 1 o 2 emojis si suman.
- Breve: sin saludos largos ni despedidas. Puedes cerrar ofreciendo un siguiente paso útil en una frase corta (ej: "¿Te mando su gasto común?").
- Termina con ✅.`;

// Redacta la respuesta final a partir de los datos (texto ya armado por el
// proceso). Si la IA falla, devuelve null y se manda el texto tal cual.
export async function redactar(chatId, datos) {
  if (!iaDisponible()) return null;
  try {
    const mensajes = turnosAlternados([
      ...historial(chatId),
      { role: 'user', content: `DATOS DE KASTOR (para responder mi último mensaje):\n${datos}` },
    ]);
    return await claude({ system: PROMPT_REDACTAR, messages: mensajes, maxTokens: 1500 });
  } catch (err) {
    console.warn('[ia] redactar:', err.message);
    return null;
  }
}

const PROMPT_CHARLA = `Eres Pía, la asistente de GestionPro (administradora de condominios en Chile) en Telegram. El usuario escribió algo que no es una consulta concreta (agradecimiento, comentario, pregunta general o algo que no entendiste). Responde breve, natural y amable, en español de Chile, tuteando, texto plano sin markdown. Si no entendiste qué necesita, pregúntale de forma concreta. Lo que sabes hacer: morosos, deuda o gasto común de una unidad, pagos recibidos, datos de una unidad (dueño y su correo), fondos del condominio, lista de trabajadores, vacaciones y liquidaciones de sueldo. Si te piden un dato que no está en esa lista (por ejemplo el correo o teléfono de un trabajador), di que eso todavía no lo sabes buscar y ofrece lo más cercano que sí puedes hacer. Nunca digas que no tienes acceso a Kastor o al sistema: sí lo tienes, solo para esas consultas. No inventes datos ni corrijas el nombre que escribió el usuario.`;

export async function charlar(chatId) {
  if (!iaDisponible()) return null;
  try {
    return await claude({ system: PROMPT_CHARLA, messages: turnosAlternados(historial(chatId)), maxTokens: 300 });
  } catch (err) {
    console.warn('[ia] charlar:', err.message);
    return null;
  }
}
