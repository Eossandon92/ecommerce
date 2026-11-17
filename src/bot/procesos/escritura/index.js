// Procesos de ESCRITURA: hacen cambios en Kastor (generar gasto común, procesar
// sueldos, registrar pagos...). Se venden aparte, por módulo (ver ../../planes.js):
// el bot solo los ejecuta si el cliente tiene contratado su módulo.
//
// Reglas para cada proceso de escritura:
// - Antes de ejecutar, mostrar exactamente lo que se va a hacer y esperar un "sí".
// - Registrar quién lo pidió, cuándo y qué respondió Kastor.
// - Usar credenciales de Kastor propias de escritura, separadas de las de lectura.
//
// Formato: tipo → { modulo, proceso }, ej.
//   generar_gasto_comun: { modulo: 'gasto_comun', proceso: generarGastoComun },
export const PROCESOS_ESCRITURA = {};
