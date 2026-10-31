// Utilidades que comparten los procesos del bot.

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

export const AYUDA =
  'Puedo enviarte una liquidación de sueldo o decirte los días de vacaciones disponibles de un trabajador.';

export const normalizar = (v) =>
  (v || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

export const esBoton = (texto, boton) => normalizar(texto) === normalizar(boton);

export const condominioDeBoton = (texto) => CONDOMINIOS.find((c) => esBoton(texto, c)) || '';

// "Claro, ¿me dices A, B y C?" — si falta el condominio, con sus botones.
export async function preguntarFaltantes(chat, partes, faltaCondominio) {
  const pregunta = partes.length === 1
    ? `Claro, ¿me dices ${partes[0]}?`
    : `Claro, ¿me dices ${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}?`;
  await chat.enviar(pregunta, faltaCondominio ? [...CONDOMINIOS, NO_SE] : null);
}

export const numeroCL = (v) =>
  v === null || v === undefined ? '-' : Number(v).toLocaleString('es-CL', { maximumFractionDigits: 2 });

// Cierre de una solicitud completada: va al final del mismo mensaje (en
// Telegram los emojis nuevos se ven animados dentro del texto).
export const LISTO = '✔️';
