// Procesos de SOLO LECTURA: consultan Kastor y responden. Vienen en todos los
// planes. Ninguno puede generar, enviar ni modificar nada en Kastor.
// Para sumar uno nuevo: crear <nombre>.js con manejar(), agregarlo aquí y al
// prompt de interpretación (src/bot/promptInterpretar.js).
import * as vacaciones from './vacaciones.js';
import * as liquidacion from './liquidacion.js';
import * as gastoComun from './gastoComun.js';
import * as morosos from './morosos.js';
import * as deudaUnidad from './deudaUnidad.js';
import * as pagos from './pagos.js';
import * as datosUnidad from './datosUnidad.js';
import * as fondos from './fondos.js';
import * as trabajadores from './trabajadores.js';
import * as contactoTrabajador from './contactoTrabajador.js';

export const PROCESOS_LECTURA = {
  vacaciones,
  liquidacion,
  gasto_comun: gastoComun,
  morosos,
  deuda_unidad: deudaUnidad,
  pagos,
  datos_unidad: datosUnidad,
  fondos,
  trabajadores,
  contacto_trabajador: contactoTrabajador,
};
