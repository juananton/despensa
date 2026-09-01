import { createContext, useCallback, useEffect, useState } from 'react';
import { freezeClock } from '../clock';
import { fromRow, isPaused } from '../pantry';
import { supabase } from '../supabase';

/**
 * Estado de la pausa de la despensa: la cuenta atrás se para durante las
 * ausencias largas y se reanuda al volver, desplazando todas las fechas de
 * agotamiento por lo que haya durado (ver la migración 0006).
 *
 * Va por encima de ItemsProvider y no dentro porque lo que hace es mover el
 * reloj con el que ese calcula: congelarlo antes de que se pinte un solo
 * artículo es lo que evita ver los días de verdad y que se corrijan medio
 * segundo después.
 */

const PantryContext = createContext();

export const PantryProvider = ({ children }) => {
	const [pantry, setPantry] = useState(null);

	// El reloj se mueve aquí y sólo aquí. Va junto al setState a propósito: son
	// la misma verdad contada a dos sitios, y el repintado que provoca el
	// segundo es lo que hace que la pantalla refleje al primero.
	const apply = useCallback(row => {
		const next = fromRow(row);

		freezeClock(next.pausedAt);
		setPantry(next);
	}, []);

	useEffect(() => {
		/**
		 * Se arranca por resume_if_due() y no por un select: si ya ha llegado el
		 * día de la vuelta, la despensa se reanuda al abrir la app sin esperar al
		 * cron de la mañana, y la respuesta es en cualquier caso la fila que hay
		 * que pintar. La función es idempotente, así que da igual que la llamen
		 * los dos móviles a la vez.
		 */
		const load = async () => {
			const { data, error } = await supabase.rpc('resume_if_due');

			// Sin fila no se puede saber si hay pausa, y darla por supuesta sería
			// peor: se sigue con el reloj real, que es el caso normal.
			apply(error ? null : data);
		};

		load();

		const channel = supabase
			.channel('pantry-changes')
			.on(
				'postgres_changes',
				{ event: '*', schema: 'public', table: 'pantry' },
				payload => apply(payload.new)
			)
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	}, [apply]);

	/**
	 * Las dos devuelven si ha fallado, y no se limitan a no hacer nada como el
	 * resto de escrituras de la app. La diferencia es que aquí no hay forma de
	 * notar el fallo mirando la pantalla: cuando un `+` no llega, el número se
	 * queda donde estaba y se vuelve a pulsar; cuando la pausa no llega, la
	 * despensa sigue exactamente igual que si nunca hubieras abierto el menú.
	 *
	 * El motivo de verdad va a la consola y a la persona le llega una frase:
	 * "function public.pause_pantry does not exist" no le sirve de nada a quien
	 * está a punto de irse de viaje.
	 */
	const pause = async resumesOn => {
		const { data, error } = await supabase.rpc('pause_pantry', {
			resumes: resumesOn || null
		});

		if (error) {
			console.error('Fallo al pausar la despensa', error);
			return true;
		}

		apply(data);
		return false;
	};

	const resume = async () => {
		const { data, error } = await supabase.rpc('resume_pantry');

		if (error) {
			console.error('Fallo al reanudar la despensa', error);
			return true;
		}

		apply(data);
		return false;
	};

	// Hasta saber si hay una pausa no se pinta nada: es media consulta de
	// retraso y evita enseñar unos días que no son. Mismo criterio que App con
	// la sesión.
	if (!pantry) return null;

	return (
		<PantryContext.Provider
			value={{ pantry, paused: isPaused(pantry), pause, resume }}
		>
			{children}
		</PantryContext.Provider>
	);
};

export default PantryContext;
