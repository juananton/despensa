import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { daysLeft, depletionFrom, rescaleToRate, unitsLeft } from './items.js';

// Reloj fijo: todo se deriva de la fecha de agotamiento, así que sin un "ahora"
// estable las pruebas dependerían de la hora a la que se ejecuten.
const NOW = new Date('2026-08-10T12:00:00Z').getTime();
const DIA = 24 * 60 * 60 * 1000;

// `units` unidades en stock al ritmo dado, empezando ahora.
const item = (units, unitsPerCycle, cycleDays) => ({
	unitsPerCycle,
	cycleDays,
	depletesAt: depletionFrom(units, { unitsPerCycle, cycleDays }, NOW)
});

describe('consumo de menos de una unidad al día', () => {
	it('no inventa unidades al redondear los días', () => {
		// 5 yogures a 2 por día son 2,5 días. Redondear los días primero y
		// dividir después daba 6 yogures: el fallo que motivó el cambio.
		const yogures = item(5, 2, 1);

		assert.equal(unitsLeft(yogures, NOW), 5);
		assert.equal(daysLeft(yogures, NOW), 3);
	});

	it('va descontando unidad a unidad a lo largo del día', () => {
		const yogures = item(5, 2, 1);

		assert.equal(unitsLeft(yogures, NOW + DIA / 2), 4);
		assert.equal(unitsLeft(yogures, NOW + DIA), 3);
		assert.equal(unitsLeft(yogures, NOW + 2 * DIA), 1);
	});

	it('admite ritmos que no dan una fracción exacta', () => {
		// 3 unidades cada 2 días: 0,666… días por unidad, imposible de escribir
		// a mano con el modelo anterior.
		const galletas = item(9, 3, 2);

		assert.equal(unitsLeft(galletas, NOW), 9);
		assert.equal(daysLeft(galletas, NOW), 6);
	});
});

describe('consumo de más de un día por unidad', () => {
	it('cuenta como antes cuando una unidad dura varios días', () => {
		const detergente = item(2, 1, 30);

		assert.equal(unitsLeft(detergente, NOW), 2);
		assert.equal(daysLeft(detergente, NOW), 60);
		assert.equal(unitsLeft(detergente, NOW + 31 * DIA), 1);
	});

	it('redondea hacia arriba: media unidad sigue siendo una unidad', () => {
		const cafe = item(2, 1, 10);

		assert.equal(unitsLeft(cafe, NOW + 15 * DIA), 1);
		assert.equal(daysLeft(cafe, NOW + 15 * DIA), 5);
	});
});

describe('agotado', () => {
	it('se queda en cero y no baja de ahí', () => {
		const cafe = item(1, 1, 3);

		assert.equal(unitsLeft(cafe, NOW + 3 * DIA), 0);
		assert.equal(daysLeft(cafe, NOW + 3 * DIA), 0);
		assert.equal(unitsLeft(cafe, NOW + 99 * DIA), 0);
		assert.equal(daysLeft(cafe, NOW + 99 * DIA), 0);
	});
});

describe('cambio de ritmo', () => {
	it('mantiene el stock, no los días', () => {
		// 2 botes a 7 días cada uno. Si pasan a durar 10, siguen siendo 2 botes.
		const bote = item(2, 1, 7);
		const reescalado = {
			unitsPerCycle: 1,
			cycleDays: 10,
			depletesAt: rescaleToRate(bote, { unitsPerCycle: 1, cycleDays: 10 }, NOW)
		};

		assert.equal(unitsLeft(reescalado, NOW), 2);
		assert.equal(daysLeft(reescalado, NOW), 20);
	});

	it('conserva lo ya consumido a mitad de unidad', () => {
		// Quedan 1,5 botes de 7 días; a 10 días por bote son 15 días.
		const bote = item(2, 1, 7);
		const aMitad = NOW + 3.5 * DIA;
		const reescalado = {
			unitsPerCycle: 1,
			cycleDays: 10,
			depletesAt: rescaleToRate(
				bote,
				{ unitsPerCycle: 1, cycleDays: 10 },
				aMitad
			)
		};

		assert.equal(daysLeft(reescalado, aMitad), 15);
	});

	it('vale también para pasar a varias unidades por día', () => {
		// 4 yogures a 1 por día pasan a consumirse de 2 en 2: mismos yogures,
		// la mitad de días.
		const yogures = item(4, 1, 1);
		const reescalado = {
			unitsPerCycle: 2,
			cycleDays: 1,
			depletesAt: rescaleToRate(
				yogures,
				{ unitsPerCycle: 2, cycleDays: 1 },
				NOW
			)
		};

		assert.equal(unitsLeft(reescalado, NOW), 4);
		assert.equal(daysLeft(reescalado, NOW), 2);
	});
});
