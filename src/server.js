import express from 'express';
import 'dotenv/config';
import fs from 'node:fs';
import { obtenerLiquidacion } from './kastor.js';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const API_SECRET = process.env.API_SECRET;

if (!API_SECRET) {
  throw new Error('Falta API_SECRET en las variables de entorno.');
}

// Solo un scraping a la vez: el RAM del free tier no alcanza para dos
// Chromium en paralelo, así que las requests se encolan.
let colaActual = Promise.resolve();
function encolar(tarea) {
  const resultado = colaActual.then(tarea, tarea);
  colaActual = resultado.catch(() => {});
  return resultado;
}

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// Estado conversacional simple (en memoria) para el flujo de "¿en qué condominio
// trabaja?" — se pierde si el servicio se reinicia/duerme, lo cual está bien:
// peor caso, vuelve a preguntar. Expira solo para no quedar pegado si alguien
// no responde nunca.
const pendientes = new Map();
const TTL_PENDIENTE_MS = 10 * 60 * 1000;

function requiereAuth(req, res) {
  if (req.get('X-API-Key') !== API_SECRET) {
    res.status(401).json({ error: 'No autorizado' });
    return false;
  }
  return true;
}

app.get('/estado/:chatId', (req, res) => {
  if (!requiereAuth(req, res)) return;
  const p = pendientes.get(req.params.chatId);
  if (p && p.expira > Date.now()) {
    return res.json({ pendiente: true, datos: p });
  }
  pendientes.delete(req.params.chatId);
  res.json({ pendiente: false });
});

app.post('/estado/:chatId', (req, res) => {
  if (!requiereAuth(req, res)) return;
  const { nombre, mes, anio } = req.body || {};
  pendientes.set(req.params.chatId, { nombre, mes, anio, expira: Date.now() + TTL_PENDIENTE_MS });
  res.json({ ok: true });
});

app.delete('/estado/:chatId', (req, res) => {
  if (!requiereAuth(req, res)) return;
  pendientes.delete(req.params.chatId);
  res.json({ ok: true });
});

app.post('/liquidacion', (req, res) => {
  if (req.get('X-API-Key') !== API_SECRET) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const { consulta, mes, anio, condominio } = req.body || {};
  if (!consulta || !mes || !anio) {
    return res.status(400).json({ error: 'Faltan campos: consulta, mes, anio' });
  }

  encolar(() => obtenerLiquidacion({ consulta, mes, anio, condominio, headless: true }))
    .then((resultado) => {
      res.setHeader('X-Trabajador', encodeURIComponent(resultado.nombre));
      res.setHeader('X-Comunidad', encodeURIComponent(resultado.comunidad));
      res.download(resultado.archivo, (err) => {
        fs.unlink(resultado.archivo, () => {});
        if (err && !res.headersSent) {
          res.status(500).json({ error: 'Error enviando el archivo' });
        }
      });
    })
    .catch((err) => {
      res.status(404).json({ error: err.message });
    });
});

app.listen(PORT, () => {
  console.log(`Kastor API escuchando en puerto ${PORT}`);
});
