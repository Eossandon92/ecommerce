import { obtenerLiquidacion } from './kastor.js';

const [, , consulta, mesArg, anioArg] = process.argv;

if (!consulta || !mesArg || !anioArg) {
  console.error('Uso: node src/cli.js "<nombre o rut del trabajador>" <mes> <anio>');
  console.error('Ejemplo: node src/cli.js "Luis Ricardo Casado" septiembre 2026');
  process.exit(1);
}

const mes = Number.isNaN(Number(mesArg)) ? mesArg : Number(mesArg);

obtenerLiquidacion({ consulta, mes, anio: Number(anioArg), headless: false })
  .then((res) => {
    console.log('Encontrado:', res.nombre, '-', res.rut, '-', res.comunidad);
    console.log('PDF guardado en:', res.archivo);
  })
  .catch((err) => {
    console.error('Error:', err.message);
    process.exit(1);
  });
