/**
 * Regenera data.json desde el catálogo base.
 *
 *   node scripts/seed-data.mjs          -> un "día" dura un minuto (demo)
 *   node scripts/seed-data.mjs --real   -> un día dura un día
 *
 * La escala tiene que coincidir con DEMO_MODE en src/lib/constants.js, porque
 * las fechas de agotamiento se guardan ya convertidas. Ojo: esto sobrescribe
 * data.json, así que se lleva por delante los artículos que hayas añadido.
 */
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CATALOGUE = [
	{ name: 'Queso', category: 'Comida', daysPerUnit: 7, units: 1, id: 1 },
	{ name: 'Aceite', category: 'Comida', daysPerUnit: 7, units: 2, id: 2 },
	{ name: 'Lentejas', category: 'Comida', daysPerUnit: 5, units: 1, id: 4 },
	{ name: 'Leche', category: 'Comida', daysPerUnit: 8, units: 3, id: 5 },
	{
		name: 'Lavavajillas',
		category: 'Limpieza',
		daysPerUnit: 30,
		units: 1,
		id: 6
	},
	{
		name: 'Papel higiénico',
		category: 'Baño',
		daysPerUnit: 7,
		units: 6,
		id: 7
	},
	{
		name: 'Pasta de dientes',
		category: 'Baño',
		daysPerUnit: 15,
		units: 2,
		id: 8
	},
	{
		name: 'Detergente lavadora',
		category: 'Limpieza',
		daysPerUnit: 30,
		units: 1,
		id: 9
	}
];

const real = process.argv.includes('--real');
const msPerDay = real ? 24 * 60 * 60 * 1000 : 60 * 1000;
const now = Date.now();

const data = CATALOGUE.map(({ units, ...item }) => ({
	...item,
	depletesAt: new Date(now + units * item.daysPerUnit * msPerDay).toISOString()
}));

const target = resolve(dirname(fileURLToPath(import.meta.url)), '../data.json');
writeFileSync(target, `${JSON.stringify({ data }, null, 2)}\n`);

console.log(
	`data.json regenerado con ${data.length} artículos (1 día = ${
		real ? '24 h' : '1 min'
	}).`
);
