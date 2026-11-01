import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

// TELEGRAM_API_URL solo existe para poder probar en local contra un
// Telegram falso; en producción queda el oficial.
const API_URL = process.env.TELEGRAM_API_URL || 'https://api.telegram.org';

function urlMetodo(metodo) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('Falta TELEGRAM_BOT_TOKEN en las variables de entorno.');
  return `${API_URL}/bot${token}/${metodo}`;
}

export async function telegram(metodo, cuerpo) {
  const r = await fetch(urlMetodo(metodo), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });
  const json = await r.json();
  if (!json.ok) console.warn(`[telegram] ${metodo} falló: ${json.description || r.status}`);
  return json;
}

// Funciones de un chat en particular, para que los procesos no tengan que
// andar pasando el chatId en cada llamada.
export function crearChat({ chatId, messageId }) {
  // Con botones: teclado de respuestas rápidas (al tocar uno se envía como
  // mensaje normal, que es lo único que Activepieces recibe del bot).
  // Sin botones: cierra el teclado si había uno abierto.
  // Telegram corta en 4096 caracteres: los mensajes largos se parten por
  // líneas y los botones van en el último pedazo.
  async function enviar(texto, botones) {
    const reply_markup = botones && botones.length
      ? { keyboard: botones.map((b) => [{ text: b }]), one_time_keyboard: true, resize_keyboard: true }
      : { remove_keyboard: true };
    const partes = [];
    let actual = '';
    for (const linea of texto.split('\n')) {
      if (actual && (actual + '\n' + linea).length > 3800) {
        partes.push(actual);
        actual = linea;
      } else {
        actual = actual ? `${actual}\n${linea}` : linea;
      }
    }
    partes.push(actual);
    let ultimo;
    for (let i = 0; i < partes.length; i++) {
      const cuerpo = { chat_id: chatId, text: partes[i] };
      if (i === partes.length - 1) cuerpo.reply_markup = reply_markup;
      ultimo = await telegram('sendMessage', cuerpo).catch((e) => console.warn(e.message));
    }
    return ultimo;
  }

  // Reacción sobre el mensaje de quien escribió. Telegram solo acepta su
  // lista fija de emojis (✅ no está; por eso 👌).
  async function reaccionar(emoji) {
    if (!messageId) return;
    await telegram('setMessageReaction', {
      chat_id: chatId,
      message_id: Number(messageId),
      reaction: emoji ? [{ type: 'emoji', emoji }] : [],
    }).catch(() => {});
  }

  // Mientras corre una tarea larga, deja en el chat un mensaje "⏳ ..." con
  // puntitos que se mueven, más el "escribiendo…" de arriba. Al terminar, se borra.
  async function conEspera(texto, tarea) {
    const enviado = await telegram('sendMessage', { chat_id: chatId, text: `⏳ ${texto} ·` }).catch(() => null);
    const esperaId = enviado && enviado.ok ? enviado.result.message_id : null;
    const puntos = ['·', '· ·', '· · ·'];
    let paso = 0;
    const animar = () => {
      telegram('sendChatAction', { chat_id: chatId, action: 'typing' }).catch(() => {});
      if (esperaId) {
        paso = (paso + 1) % puntos.length;
        telegram('editMessageText', { chat_id: chatId, message_id: esperaId, text: `⏳ ${texto} ${puntos[paso]}` }).catch(() => {});
      }
    };
    animar();
    const intervalo = setInterval(animar, 2000);
    try {
      return await tarea();
    } finally {
      clearInterval(intervalo);
      if (esperaId) await telegram('deleteMessage', { chat_id: chatId, message_id: esperaId }).catch(() => {});
    }
  }

  async function enviarDocumento(archivo, nombreArchivo, caption) {
    telegram('sendChatAction', { chat_id: chatId, action: 'upload_document' }).catch(() => {});
    const form = new FormData();
    form.append('chat_id', String(chatId));
    if (caption) form.append('caption', caption);
    const tipo = /\.csv$/i.test(nombreArchivo || archivo) ? 'text/csv' : 'application/pdf';
    form.append('document', new Blob([fs.readFileSync(archivo)], { type: tipo }), nombreArchivo || path.basename(archivo));
    const r = await fetch(urlMetodo('sendDocument'), { method: 'POST', body: form });
    const json = await r.json();
    if (!json.ok) throw new Error(`Telegram no aceptó el archivo: ${json.description || r.status}`);
    return json;
  }

  // Planilla para abrir en Excel: CSV con ";" y BOM (así Excel en español
  // respeta columnas y tildes). Se borra después de enviarla.
  async function enviarPlanilla(nombreArchivo, encabezados, filas, caption) {
    const celda = (v) => {
      const t = v === null || v === undefined ? '' : String(v);
      return /[";\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
    };
    const csv = '\ufeff' + [encabezados, ...filas].map((f) => f.map(celda).join(';')).join('\r\n');
    const dir = process.env.DOWNLOAD_DIR || './downloads';
    fs.mkdirSync(dir, { recursive: true });
    const archivo = path.join(dir, `${Date.now()}_${nombreArchivo}`);
    fs.writeFileSync(archivo, csv);
    try {
      return await enviarDocumento(archivo, nombreArchivo, caption);
    } finally {
      fs.unlink(archivo, () => {});
    }
  }

  return { chatId, enviar, reaccionar, conEspera, enviarDocumento, enviarPlanilla };
}
