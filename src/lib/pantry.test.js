import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	formatDay,
	fromISODate,
	fromRow,
	isPaused,
	toISODate
} from './pantry.js';

describe('estado de la pausa', () => {
	it('lee la fila de la despensa', () => {
		const pantry = fromRow({
			id: 1,
			paused_at: '2026-09-01T17:15:00Z',
			resumes_on: '2026-09-15'
		});

		assert.deepEqual(pantry, {
			pausedAt: '2026-09-01T17:15:00Z',
			resumesOn: '2026-09-15'
		});
		assert.equal(isPaused(pantry), true);
	});

	// Si la consulta falla no se puede saber si hay pausa, y lo que se pinta es
	// una despensa en marcha: dar por supuesta una pausa que no existe pararía
	// la cuenta atrás sin que nadie lo haya pedido.
	it('sin fila, la despensa está en marcha', () => {
		assert.equal(isPaused(fromRow(null)), false);
		assert.equal(isPaused(fromRow({ paused_at: null })), false);
	});
});

describe('días sueltos', () => {
	// El fallo que motiva no usar toISOString(): en España, cualquier hora
	// anterior a las 02:00 cae en el día anterior una vez pasada a UTC.
	it('no se va al día de antes de madrugada', () => {
		assert.equal(toISODate(new Date(2026, 8, 15, 0, 30)), '2026-09-15');
		assert.equal(toISODate(new Date(2026, 8, 15, 23, 59)), '2026-09-15');
	});

	it('vuelve del texto al mismo día', () => {
		const day = fromISODate('2026-09-15');

		assert.equal(day.getFullYear(), 2026);
		assert.equal(day.getMonth(), 8);
		assert.equal(day.getDate(), 15);
		assert.equal(toISODate(day), '2026-09-15');
	});
});

describe('fechas para leer', () => {
	const today = new Date(2026, 8, 1);

	it('escribe el día y el mes en números, que es lo que cabe', () => {
		assert.equal(formatDay('2026-09-15', today), '15/09');
	});

	// El año sólo cuando aporta: en una pausa de Navidad la vuelta cae en enero
	// y un "07/01" a secas se lee como si fuese el que ya pasó.
	it('añade el año cuando no es el de hoy', () => {
		assert.equal(formatDay('2027-01-07', today), '07/01/27');
	});

	it('entiende también un instante completo', () => {
		assert.equal(
			formatDay(new Date(2026, 8, 1, 17, 15).toISOString(), today),
			'01/09'
		);
	});
});
