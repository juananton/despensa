import { FiCalendar } from 'react-icons/fi';

/**
 * Campo de fecha. Existe aparte de Input por lo que Chrome de Android NO pinta:
 * con el campo vacío no enseña ni el "dd/mm/aaaa" ni el icono del calendario
 * —los dos salen sólo en escritorio—, así que el campo se queda en blanco y no
 * hay forma de saber qué se espera ahí. Los dibuja este componente, y de paso
 * el icono es el mismo verde que el chevron del desplegable en vez del negro
 * del sistema, que además no se puede teñir.
 *
 * Mismo molde que Select: etiqueta, envoltorio relativo y adorno encima.
 */
const DateInput = ({ label, message, error, value, ...props }) => {
	// Con el indicador nativo escondido hay que abrir el calendario a mano, o en
	// escritorio no habría manera de sacarlo con el ratón. En Android tocar el
	// campo ya lo abre, y donde no exista showPicker esto no hace nada y queda
	// el comportamiento de siempre.
	const openPicker = e => e.target.showPicker?.();

	return (
		<label className='date-field'>
			{label && <span className='label'>{label}</span>}
			<div className='wrapper'>
				<input
					{...props}
					type='date'
					value={value}
					onClick={openPicker}
					className={`input ${value ? '' : 'empty'} ${error ? 'error' : ''}`}
				/>
				{!value && <span className='placeholder'>dd/mm/aaaa</span>}
				<FiCalendar className='icon' />
			</div>
			{message && <p className='message'>{message}</p>}
		</label>
	);
};

export default DateInput;
