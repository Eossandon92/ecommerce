// Estado conversacional simple (en memoria), por chat de Telegram: qué se
// estaba preguntando ("¿en qué condominio trabaja?", "¿cuál de los Luis?").
// Se pierde si el servicio se reinicia/duerme, lo cual está bien: peor caso,
// vuelve a preguntar. Expira solo para no quedar pegado si alguien no
// responde nunca.
const pendientes = new Map();
const TTL_PENDIENTE_MS = 10 * 60 * 1000;

export function leerEstado(chatId) {
  const p = pendientes.get(String(chatId));
  if (p && p.expira > Date.now()) {
    const { expira, ...datos } = p;
    return datos;
  }
  pendientes.delete(String(chatId));
  return null;
}

export function guardarEstado(chatId, datos) {
  const { expira, ...resto } = datos || {};
  pendientes.set(String(chatId), { ...resto, expira: Date.now() + TTL_PENDIENTE_MS });
}

export function borrarEstado(chatId) {
  pendientes.delete(String(chatId));
}
