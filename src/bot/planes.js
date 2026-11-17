// Plan contratado por el cliente de este servidor (un despliegue por
// administradora). Se configura con variables de entorno en Render:
//   CLIENTE_PLAN=basico | premium        (por defecto: basico)
//   CLIENTE_MODULOS=gasto_comun,cobranza (módulos sueltos sobre el básico)
// La lectura viene en todos los planes; la escritura, por módulo.
export const MODULOS = {
  gasto_comun: 'Gasto común',
  remuneraciones: 'Remuneraciones',
  cobranza: 'Cobranza y pagos',
};

const PLAN = (process.env.CLIENTE_PLAN || 'basico').trim().toLowerCase();
const MODULOS_SUELTOS = (process.env.CLIENTE_MODULOS || '')
  .split(',')
  .map((m) => m.trim().toLowerCase())
  .filter((m) => m in MODULOS);

export function moduloContratado(modulo) {
  return PLAN === 'premium' || MODULOS_SUELTOS.includes(modulo);
}
