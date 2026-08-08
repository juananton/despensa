import React from 'react';
import { FiChevronDown } from 'react-icons/fi';

const Select = ({ label, children, onChange, ...props }) => {
	// Android marca el <select> como foco por teclado al volver del selector
	// nativo, aunque se haya elegido con el dedo, así que el contorno se queda
	// encendido y :focus-visible no puede distinguir el caso. Igual que el
	// botón de acciones del artículo, se suelta el foco en cuanto se elige.
	const handleChange = e => {
		onChange?.(e);
		e.target.blur();
	};

	return (
		<label className='select'>
			<span className='label'>{label}</span>
			<div className='wrapper'>
				<select {...props} onChange={handleChange} className='select'>
					{children}
				</select>
				<FiChevronDown className='icon' />
			</div>
		</label>
	);
};

export default Select;
