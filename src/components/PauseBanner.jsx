import { useContext, useState } from 'react';
import PantryContext from '../lib/context/PantryContext';
import { formatDay } from '../lib/pantry';
import Button from './Button';

/**
 * Mientras la despensa está parada esto se ve en todas las pantallas, encima
 * de la lista. Se entra a la pausa por el menú de ajustes, que es donde va una
 * acción que se usa dos veces al año, pero salir no puede esconderse ahí: una
 * despensa parada y sin avisar cuenta días que no son, y en silencio.
 *
 * Enseña el día en que se pausó y no cuántos lleva parada porque un número de
 * días se queda viejo en la pantalla de quien deja la app abierta, y la fecha
 * no envejece.
 */
const PauseBanner = () => {
	const { pantry, paused, resume } = useContext(PantryContext);

	const [failed, setFailed] = useState(false);

	if (!paused) return null;

	const handleResume = async () => setFailed(await resume());

	return (
		<div className='pause-banner'>
			<div className='text'>
				<strong>Despensa en pausa</strong>
				<small className={failed ? 'failure' : ''}>
					{failed
						? 'No se ha podido reanudar. Inténtalo otra vez.'
						: `Desde el ${formatDay(pantry.pausedAt)}${
								pantry.resumesOn ? ` al ${formatDay(pantry.resumesOn)}` : ''
						  }`}
				</small>
			</div>
			<Button use='primary' onClick={handleResume}>
				Reanudar
			</Button>
		</div>
	);
};

export default PauseBanner;
