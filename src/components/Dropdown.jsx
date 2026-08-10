import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Button from './Button';

/**
 * Menú que cuelga de un botón de icono. Lo usan las acciones de cada artículo
 * y los ajustes de la cabecera: mismo comportamiento (se cierra al tocar
 * fuera, con Escape, y se voltea si no cabe) en un solo sitio.
 *
 * Las opciones se pasan como datos y no como hijos porque las dos listas son
 * lo mismo: icono, texto y una acción. Cada opción puede traer `disabled` y su
 * propio `title` para los casos en que se puede ver pero no usar.
 */

// El hueco de 0.5rem que el menú deja respecto al botón (ver _Dropdown.scss),
// más otro tanto para no pegarlo al borde de la pantalla.
const DROPDOWN_MARGIN = 16;

const Dropdown = ({ icon, title, options }) => {
	const [opened, setOpened] = useState(false);
	const [upwards, setUpwards] = useState(false);

	const groupRef = useRef(null);
	const buttonRef = useRef(null);
	const menuRef = useRef(null);

	const close = () => setOpened(false);

	const toggle = () => {
		if (opened) {
			close();
			buttonRef.current.blur();
		} else {
			setOpened(true);
		}
	};

	// El menú cabe hacia abajo salvo cerca del borde inferior de la pantalla,
	// donde se saldría. Se mide con el botón (no con el propio menú) porque el
	// botón no se mueve al voltearlo: medir el menú haría que la decisión
	// dependiese de su resultado. useLayoutEffect y no useEffect para que la
	// corrección entre antes de pintar, sin salto visible.
	useLayoutEffect(() => {
		if (!opened) return;

		const button = buttonRef.current.getBoundingClientRect();
		const menuHeight = menuRef.current.offsetHeight;
		const spaceBelow = window.innerHeight - button.bottom;

		setUpwards(spaceBelow < menuHeight + DROPDOWN_MARGIN);
	}, [opened]);

	useEffect(() => {
		if (!opened) return;

		const handleClickOutside = e => {
			!groupRef.current.contains(e.target) && close();
		};

		const handleEscape = e => e.key === 'Escape' && close();

		document.addEventListener('click', handleClickOutside, { capture: true });
		document.addEventListener('keydown', handleEscape);

		return () => {
			document.removeEventListener('click', handleClickOutside, {
				capture: true
			});
			document.removeEventListener('keydown', handleEscape);
		};
	}, [opened]);

	return (
		<div className='dropdownGroup' ref={groupRef}>
			<Button
				ref={buttonRef}
				onClick={toggle}
				variant='icon'
				use='nobg'
				title={title}
				className={opened ? 'active' : ''}
			>
				{icon}
			</Button>
			{opened && (
				<ul ref={menuRef} className={`dropdown${upwards ? ' upwards' : ''}`}>
					{options.map(option => (
						<li
							key={option.label}
							className={option.disabled ? 'disabled' : ''}
							onClick={() => {
								if (option.disabled) return;

								option.onClick();
								close();
							}}
						>
							{option.icon}
							<span className='label'>
								{option.label}
								{/* Segunda línea visible, no un `title`: el tooltip no
								    existe en una pantalla táctil, así que ahí una
								    explicación o un error quedaban invisibles justo en
								    el único sitio donde se usa la app. */}
								{option.note && (
									<small className={`note ${option.noteTone ?? ''}`}>
										{option.note}
									</small>
								)}
							</span>
						</li>
					))}
				</ul>
			)}
		</div>
	);
};

export default Dropdown;
