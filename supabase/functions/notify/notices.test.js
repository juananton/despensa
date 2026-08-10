import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { plan } from './notices.js';

// Reloj fijo: los días se derivan de la fecha de agotamiento, así que sin un
// "ahora" estable las pruebas dependerían de la hora a la que se ejecuten.
const NOW = new Date('2026-08-10T07:00:00Z').getTime();

const item = (name, days, flags = {}) => ({
	id: name.toLowerCase().replace(/ /g, '-'),
	name,
	// Mediodía del día que toca, para no quedarse en el filo del redondeo.
	depletes_at: new Date(NOW + days * 24 * 60 * 60 * 1000 - 3600 * 1000),
	warning_notified_at: flags.warned ? '2026-08-01T07:00:00Z' : null,
	depleted_notified_at: flags.depleted ? '2026-08-01T07:00:00Z' : null
});

describe('avisos del día', () => {
	it('no dice nada cuando todo tiene margen de sobra', () => {
		const { notices, markWarned, markDepleted } = plan(
			[item('Café', 30), item('Arroz', 12)],
			NOW,
			false
		);

		assert.deepEqual(notices, []);
		assert.deepEqual(markWarned, []);
		assert.deepEqual(markDepleted, []);
	});

	it('avisa al bajar del umbral, con el texto en singular', () => {
		const { notices, markWarned } = plan([item('Yogur griego', 4)], NOW, false);

		assert.equal(notices.length, 1);
		assert.equal(notices[0].title, 'Yogur griego se está agotando');
		assert.equal(notices[0].tag, 'warning');
		assert.deepEqual(markWarned, ['yogur-griego']);
	});

	it('agrupa cuando coinciden varios el mismo día', () => {
		const { notices } = plan(
			[item('Yogur griego', 3), item('Café', 2), item('Arroz', 1)],
			NOW,
			false
		);

		assert.equal(notices.length, 1);
		assert.equal(notices[0].title, '3 artículos se están agotando');
		assert.match(notices[0].body, /^Yogur griego, Café y Arroz\./);
	});

	it('no repite el aviso al día siguiente', () => {
		const { notices, markWarned } = plan(
			[item('Yogur griego', 3, { warned: true })],
			NOW,
			false
		);

		assert.deepEqual(notices, []);
		assert.deepEqual(markWarned, []);
	});

	it('separa agotados de los que sólo van justos', () => {
		const { notices, markDepleted, markWarned } = plan(
			[item('Café', 0), item('Yogur griego', 2)],
			NOW,
			false
		);

		assert.deepEqual(
			notices.map(notice => notice.tag),
			['depleted', 'warning']
		);
		assert.equal(notices[0].title, 'Café se ha agotado');
		assert.deepEqual(markDepleted, ['café']);
		assert.deepEqual(markWarned, ['yogur-griego']);
	});

	it('avisa de golpe del que cae de seis días a cero sin pasar por el umbral', () => {
		const { notices, markDepleted, markWarned } = plan(
			[item('Detergente', 0)],
			NOW,
			false
		);

		assert.deepEqual(
			notices.map(notice => notice.tag),
			['depleted']
		);
		assert.deepEqual(markDepleted, ['detergente']);
		assert.deepEqual(markWarned, []);
	});

	it('rearma las dos banderas al reponer de sobra', () => {
		const { clearWarned, clearDepleted, notices } = plan(
			[item('Café', 30, { warned: true, depleted: true })],
			NOW,
			false
		);

		assert.deepEqual(clearWarned, ['café']);
		assert.deepEqual(clearDepleted, ['café']);
		assert.deepEqual(notices, []);
	});

	it('mantiene el aviso de umbral al que sigue por debajo de él', () => {
		const { clearWarned, notices } = plan(
			[item('Café', 3, { warned: true })],
			NOW,
			false
		);

		assert.deepEqual(clearWarned, []);
		assert.deepEqual(notices, []);
	});

	it('rearma el agotado aunque se reponga poco, para que la segunda vez vuelva a avisar', () => {
		// Comprar un bote de tres días saca al artículo de agotado sin sacarlo
		// del umbral: la bandera de agotado tiene que soltarse igualmente.
		const { clearDepleted, clearWarned, notices } = plan(
			[item('Café', 3, { warned: true, depleted: true })],
			NOW,
			false
		);

		assert.deepEqual(clearDepleted, ['café']);
		assert.deepEqual(clearWarned, []);
		assert.deepEqual(notices, []);
	});
});

describe('resumen semanal', () => {
	it('no suena si no hay nada que contar', () => {
		const { notices } = plan([item('Café', 30)], NOW, true);

		assert.deepEqual(notices, []);
	});

	it('resume en un solo aviso lo agotado y lo que se acaba', () => {
		const { notices } = plan(
			[
				item('Café', 0),
				item('Detergente', 0),
				item('Yogur griego', 3),
				item('Arroz', 30)
			],
			NOW,
			true
		);

		assert.equal(notices.length, 1);
		assert.equal(notices[0].tag, 'weekly');
		assert.equal(notices[0].title, 'Resumen de la despensa');
		assert.equal(
			notices[0].body,
			'Agotados: Café y Detergente. Se acaban pronto: Yogur griego (3 días).'
		);
	});

	it('incluye lo ya avisado en semanas anteriores: es una foto, no un diario', () => {
		const { notices } = plan(
			[item('Yogur griego', 2, { warned: true })],
			NOW,
			true
		);

		assert.equal(notices.length, 1);
		assert.match(notices[0].body, /Yogur griego \(2 días\)/);
	});

	it('marca lo nuevo aunque el texto salga del resumen, para no repetirlo el martes', () => {
		const { markDepleted, markWarned } = plan(
			[item('Café', 0), item('Yogur griego', 2)],
			NOW,
			true
		);

		assert.deepEqual(markDepleted, ['café']);
		assert.deepEqual(markWarned, ['yogur-griego']);
	});
});
