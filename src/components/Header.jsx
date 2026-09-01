import { useContext, useState } from 'react';
import {
	FiBell,
	FiBellOff,
	FiLogOut,
	FiPause,
	FiPlay,
	FiSettings
} from 'react-icons/fi';
import PantryContext from '../lib/context/PantryContext';
import { supabase } from '../lib/supabase';
import { usePush } from '../lib/usePush';
import Button from './Button';
import CreateForm from './CreateForm';
import Dropdown from './Dropdown';
import Modal from './Modal';
import PauseForm from './PauseForm';

const DENIED_NOTE =
	'Los has bloqueado en el navegador. Se vuelven a permitir desde los ajustes del sitio.';

// Las dos ventanas que salen de la cabecera. Como objeto y no como un par de
// banderas para que Modal reciba `undefined` cuando no hay ninguna abierta: es
// lo que lo apaga.
const FORMS = {
	create: { title: 'Nuevo artículo', Form: CreateForm },
	pause: { title: 'Pausar la despensa', Form: PauseForm }
};

/**
 * La opción de avisos vale para este dispositivo, no para la cuenta: por eso
 * cambia de texto según cómo esté ESTE móvil. Mientras se comprueba no se pinta
 * ninguna, en vez de enseñar "Activar" y cambiarla medio segundo después: da
 * tiempo a tocar lo que no es y acabar desactivando lo que ya estaba puesto.
 */
const pushOption = push => {
	if (push.status === 'checking' || push.status === 'unsupported') return [];

	if (push.status === 'denied') {
		return [
			{
				icon: <FiBellOff className='icon' />,
				label: 'Avisos bloqueados',
				note: DENIED_NOTE,
				disabled: true,
				onClick: () => {}
			}
		];
	}

	const on = push.status === 'on';

	return [
		{
			icon: on ? <FiBellOff className='icon' /> : <FiBell className='icon' />,
			label: on ? 'Desactivar avisos' : 'Activar avisos',
			note: push.error ?? undefined,
			noteTone: 'error',
			disabled: push.busy,
			onClick: on ? push.disable : push.enable
		}
	];
};

/**
 * Parar la despensa mientras estáis fuera vive aquí, en los ajustes, porque es
 * cosa de dos veces al año y no se gana un sitio fijo en la cabecera. Pausar
 * pregunta antes la fecha de vuelta; reanudar no pregunta nada, y además se
 * puede hacer desde el aviso que sale sobre la lista (PauseBanner).
 */
const pauseOption = (pantry, showPause) => ({
	icon: pantry.paused ? (
		<FiPlay className='icon' />
	) : (
		<FiPause className='icon' />
	),
	label: pantry.paused ? 'Reanudar la despensa' : 'Pausar la despensa',
	onClick: pantry.paused ? pantry.resume : showPause
});

const Header = () => {
	const [openForm, setOpenForm] = useState(null);
	const closeModal = () => setOpenForm(null);

	const push = usePush();
	const pantry = useContext(PantryContext);

	const form = openForm ? FORMS[openForm] : null;

	return (
		<div className='header'>
			<Modal title={form?.title} closeModal={closeModal}>
				{form && <form.Form closeModal={closeModal} />}
			</Modal>
			<div className='logo'>
				{/* Sin /public: Vite copia esa carpeta a la raíz al construir, así
				    que en producción el fichero está en /logo-icon.svg. El servidor
				    de desarrollo sirve las dos rutas y esconde el fallo. */}
				<img src='/logo-icon.svg' alt='' />
				<h1>Despensa</h1>
			</div>
			<div className='header-buttons'>
				<Button use='primary' onClick={() => setOpenForm('create')}>
					Añadir
				</Button>
				<Dropdown
					icon={<FiSettings className='icon' />}
					title='Ajustes'
					options={[
						...pushOption(push),
						pauseOption(pantry, () => setOpenForm('pause')),
						{
							icon: <FiLogOut className='icon' />,
							label: 'Salir',
							onClick: () => supabase.auth.signOut()
						}
					]}
				/>
			</div>
		</div>
	);
};

export default Header;
