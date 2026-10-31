import express from 'express';
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { obtenerLiquidacion } from './kastor.js';
import { obtenerGastoComun } from './gastoComun.js';
import { obtenerVacaciones } from './vacaciones.js';

const app = express();
// Render pone un proxy delante: sin esto req.protocol sale "http" y las URLs
// temporales de archivos quedarían mal armadas.
app.set('trust proxy', true);
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
  // Se guarda lo que mande el step de Código (liquidación: nombre/mes/anio/
  // condominio...; gasto común: unidad, archivoUrl, destinatario, esperando
  // confirmación...), así no hay que tocar el servidor por cada campo nuevo.
  const { expira, ...datos } = req.body || {};
  pendientes.set(req.params.chatId, { ...datos, expira: Date.now() + TTL_PENDIENTE_MS });
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

// --- Vacaciones ----------------------------------------------------------
// Solo lectura: días de vacaciones disponibles de un trabajador (pestaña
// Remuneraciones → Vacaciones de Kastor). Responde JSON; el mensaje de
// Telegram lo arma el step de Código en Activepieces.
app.post('/vacaciones', (req, res) => {
  if (!requiereAuth(req, res)) return;
  const { consulta, condominio } = req.body || {};
  if (!consulta) {
    return res.status(400).json({ error: 'Falta el campo: consulta' });
  }

  encolar(() => obtenerVacaciones({ consulta, condominio, headless: true }))
    .then((resultado) => res.json(resultado))
    .catch((err) => {
      if (err.coincidencias) {
        return res.status(409).json({ error: err.message, coincidencias: err.coincidencias, comunidad: err.comunidad });
      }
      res.status(404).json({ error: err.message });
    });
});

// --- Gasto común ---------------------------------------------------------
// POST /gasto-comun descarga la nota de cobro desde Kastor y responde un JSON
// con los datos y una URL temporal del PDF. El correo NO lo manda este
// servidor: lo manda Activepieces (pieza Gmail, cuenta del condominio conectada
// con Google), solo después de que el usuario confirme "sí" en Telegram. La URL
// la usan Telegram (vista previa) y Gmail (adjunto) para bajar el PDF.
const archivosTemporales = new Map();
const TTL_ARCHIVO_MS = 30 * 60 * 1000;

function guardarArchivoTemporal(archivo, nombreArchivo) {
  const token = crypto.randomBytes(24).toString('hex');
  archivosTemporales.set(token, { archivo, nombreArchivo });
  setTimeout(() => {
    archivosTemporales.delete(token);
    fs.unlink(archivo, () => {});
  }, TTL_ARCHIVO_MS).unref();
  return token;
}

app.post('/gasto-comun', (req, res) => {
  if (!requiereAuth(req, res)) return;
  const { condominio, unidad, mes, anio } = req.body || {};
  if (!condominio || !unidad || !mes || !anio) {
    return res.status(400).json({ error: 'Faltan campos: condominio, unidad, mes, anio' });
  }

  encolar(() => obtenerGastoComun({ condominio, unidad, mes, anio, headless: true }))
    .then((resultado) => {
      const token = guardarArchivoTemporal(resultado.archivo, resultado.nombreArchivo);
      const base = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
      res.json({
        comunidad: resultado.comunidad,
        slug: resultado.slug,
        unidad: resultado.unidad,
        periodo: resultado.periodo,
        propietario: resultado.propietario,
        correoPropietario: resultado.correoPropietario,
        nombreArchivo: resultado.nombreArchivo,
        archivoUrl: `${base}/gasto-comun/archivo/${token}/${encodeURIComponent(resultado.nombreArchivo)}`,
      });
    })
    .catch((err) => {
      res.status(404).json({ error: err.message });
    });
});

// Sin X-API-Key a propósito: Telegram y Gmail bajan el archivo directo por URL.
// El token es aleatorio (48 hex) y vence en 30 minutos.
app.get('/gasto-comun/archivo/:token/:nombre', (req, res) => {
  const entrada = archivosTemporales.get(req.params.token);
  if (!entrada || !fs.existsSync(entrada.archivo)) {
    return res.status(404).json({ error: 'Archivo no disponible o vencido' });
  }
  res.type('application/pdf');
  res.sendFile(path.resolve(entrada.archivo));
});

app.listen(PORT, () => {
  console.log(`Kastor API escuchando en puerto ${PORT}`);
});
