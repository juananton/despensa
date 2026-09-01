import { useContext, useState } from 'react';
import PantryContext from '../lib/context/PantryContext';
import { toISODate } from '../lib/pantry';
import { validateReturnDate } from '../lib/validation';
import Button from './Button';
import Input from './Input';

/**
 * Pide la pausa de la despensa para una ausencia larga. La fecha de vuelta es
 * opcional, pero conviene ponerla: es lo que hace que la despensa se reanude
 * sola. El fallo caro de esta función no es pausarla, sino volver a casa y
 * olvidarse de quitarla.
 */
const PauseForm = ({ closeModal }) => {
	const { pause } = useContext(PantryContext);

	const [dateValue, setDateValue] = useState('');
	const [error, setError] = useState({});
	// Separado del error del campo: uno señala lo que hay que corregir en la
	// fecha y el otro que la despensa no llegó a pararse. Pintarlos con el
	// mismo estado dejaría el recuadro en rojo por un fallo que no es suyo.
	const [failed, setFailed] = useState(false);

	const today = toISODate(new Date());

	const handleSubmit = async e => {
		e.preventDefault();

		const validated = validateReturnDate(dateValue);

		setError(validated);
		if (validated.error) return;

		// La ventana no se cierra si no se ha pausado: cerrarla es lo que diría
		// que ha salido bien. Se mira el valor que acaba de llegar y no el del
		// estado, que hasta el siguiente pintado sigue siendo el de antes.
		const failure = await pause(dateValue);

		setFailed(failure);
		if (!failure) closeModal();
	};

	return (
		<form className='pause-form' onSubmit={handleSubmit}>
			<p className='note'>
				Puedes reanudarla manualmente en cualquier momento o introducir una
				fecha para que lo haga automáticamente.
			</p>
			<Input
				type='date'
				label='Fecha de reanudación'
				value={dateValue}
				min={today}
				onChange={e => setDateValue(e.target.value)}
				message={error.message}
				error={error.error}
			/>
			{/* La pausa cuenta el consumo, no la caducidad: es la limitación del
			    modelo, y decirla aquí es más barato que descubrirla abriendo la
			    nevera al volver. */}
			<p className='note'>El fresco caduca igual: revísalo al llegar.</p>
			{failed && (
				<p className='note failure'>
					No se ha podido pausar. Inténtalo otra vez.
				</p>
			)}
			<div className='form-buttons'>
				<Button type='button' onClick={closeModal}>
					Cancelar
				</Button>
				<Button type='submit' use='primary'>
					Pausar
				</Button>
			</div>
		</form>
	);
};

export default PauseForm;
