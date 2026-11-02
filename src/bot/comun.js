// Utilidades que comparten los procesos del bot.
import { encontrarComunidad } from '../kastor.js';

// Botones de condominio (mismos nombres que en Kastor). Si se agrega un
// condominio nuevo en Kastor, agregarlo aquí también.
export const CONDOMINIOS = [
  'Condominio Santa Rosa',
  'Condominio Pedro de Valdivia',
  'Condominio Plaza San Miguel',
  'Condominio La Capilla de Huechuraba',
  'Comunidad Edificio Centenario I',
  'Edificio Bellavista',
  'Edificio Conecta Teatinos 739',
  'Edificio España 249',
  'EDIFICIO TOCORNAL',
  'FROILAN ROA 5746',
];
export const NO_SE = 'No sé';
export const CANCELAR = 'Cancelar';

export const AYUDA = 'Escribe "menú" para ver todo lo que puedo hacer.';

export const normalizar = (v) =>
  (v || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

export const esBoton = (texto, boton) => normalizar(texto) === normalizar(boton);

export const condominioDeBoton = (texto) => CONDOMINIOS.find((c) => esBoton(texto, c)) || '';

// Nombre completo del condominio a partir de una parte o con errores de tipeo
// ("de la capilla", "froilan", "capikla") — mismo criterio que la búsqueda en
// Kastor. '' si no se parece a ninguno.
export function condominioParecido(pista) {
  const c = encontrarComunidad(CONDOMINIOS.map((nombre) => ({ nombre })), pista || '');
  return c ? c.nombre : '';
}

// El condominio del mensaje: botón, lo que entendió Claude (completado al
// nombre real si se parece a uno) o, si se le estaba preguntando, el texto
// suelto que escribió ("froilan"). Si no, el que ya se tenía.
export function condominioDelMensaje({ texto, datos, previo, preguntando }) {
  const p = previo || {};
  return condominioDeBoton(texto)
    || (datos.condominio && (condominioParecido(datos.condominio) || datos.condominio))
    || (preguntando && condominioParecido(texto))
    || p.condominio
    || '';
}

// "Claro, ¿me dices A, B y C?" — si falta el condominio, con sus botones.
export async function preguntarFaltantes(chat, partes, faltaCondominio) {
  const pregunta = partes.length === 1
    ? `Claro, ¿me dices ${partes[0]}?`
    : `Claro, ¿me dices ${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}?`;
  await chat.enviar(pregunta, faltaCondominio ? [...CONDOMINIOS, NO_SE] : null);
}

export const numeroCL = (v) =>
  v === null || v === undefined ? '-' : Number(v).toLocaleString('es-CL', { maximumFractionDigits: 2 });

// Cierre de una solicitud completada: va al final del mismo mensaje, en tamaño
// normal (no animado: los emojis animados en el texto son de Premium).
export const LISTO = '✅';

// $ 1.358.906 (negativos con signo).
export const pesos = (v) =>
  v === null || v === undefined ? '-' : `${v < 0 ? '-' : ''}$${Math.abs(v).toLocaleString('es-CL')}`;

// Kastor muestra ". ." o "----" cuando no hay nombre registrado.
export const nombreOVacio = (v) => (!v || /^[-\s.]*$/.test(v) ? null : v);

// Junta lo que pidió la persona entre mensajes (Claude, botones y lo que se
// estaba preguntando) y pregunta lo que falte. Devuelve los datos completos,
// o null si tuvo que preguntar algo (el estado queda guardado).
//   campos: 'condominio' (obligatorio, con botones) y/o 'unidad'.
export async function juntarDatos({ chat, datos, previo, texto, guardar }, campos, extra = {}) {
  const p = previo || {};
  const combinado = { ...p, ...extra };
  if (campos.includes('condominio')) {
    combinado.condominio = condominioDelMensaje({ texto, datos, previo: p, preguntando: p.esperando === 'condominio' });
  }
  if (campos.includes('unidad')) {
    // Si se estaba preguntando la unidad, la respuesta suelta ("304") vale tal cual.
    combinado.unidad = datos.unidad || (p.esperando === 'unidad' ? texto : '') || p.unidad || '';
  }

  if (campos.includes('condominio') && !combinado.condominio) {
    const noEncontrado = p.esperando === 'condominio' && texto;
    guardar({ ...combinado, esperando: 'condominio' });
    await chat.enviar(noEncontrado ? `No encontré "${texto}". ¿De qué condominio?` : '¿De qué condominio?', CONDOMINIOS);
    await chat.reaccionar(null);
    return null;
  }
  if (campos.includes('unidad') && !combinado.unidad) {
    guardar({ ...combinado, esperando: 'unidad' });
    await chat.enviar('¿Qué unidad? (ej: 304, casa 11, bodega 38)');
    await chat.reaccionar(null);
    return null;
  }
  delete combinado.esperando;
  return combinado;
}

// ---------- Menú ----------
export const BOTON_MENU = '⬅️ Menú';
export const MENU_PRINCIPAL = ['💰 Cobranza', '🏦 Fondos del condominio', '👷 Trabajadores'];
export const SUBMENUS = {
  '💰 Cobranza': ['Ver morosos', 'Deuda de una unidad', 'Pagos recibidos', 'Datos de una unidad', BOTON_MENU],
  '👷 Trabajadores': ['Trabajadores vigentes', 'Vacaciones de un trabajador', 'Liquidación de sueldo', BOTON_MENU],
};
// Botones que inician una consulta directamente (sin pasar por Claude).
export const BOTONES_ACCION = {
  'Ver morosos': 'morosos',
  'Deuda de una unidad': 'deuda_unidad',
  'Pagos recibidos': 'pagos',
  'Datos de una unidad': 'datos_unidad',
  '🏦 Fondos del condominio': 'fondos',
  'Trabajadores vigentes': 'trabajadores',
  'Vacaciones de un trabajador': 'vacaciones',
  'Liquidación de sueldo': 'liquidacion',
};

export const TEXTO_MENU = [
  '👋 ¡Hola! Soy el asistente de GestionPro. Esto es lo que puedo hacer por ti:',
  '',
  '💰 Cobranza',
  '• Morosos de un condominio',
  '• Deuda y último pago de una unidad',
  '• Pagos recibidos (hoy, esta semana o un mes)',
  '• Responsable y contacto de una unidad',
  '',
  '🏦 Fondos y saldos del condominio',
  '',
  '👷 Trabajadores',
  '• Trabajadores vigentes',
  '• Vacaciones disponibles y último comprobante',
  '• Liquidación de sueldo en PDF',
  '',
  'Escríbeme lo que necesitas, por ejemplo "morosos de Santa Rosa" o "¿cuánto debe el 304 de Santa Rosa?", o toca un botón 👇',
].join('\n');
