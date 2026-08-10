import { useState } from 'react';
import { FiBell, FiBellOff, FiLogOut, FiSettings } from 'react-icons/fi';
import { supabase } from '../lib/supabase';
import { usePush } from '../lib/usePush';
import Button from './Button';
import CreateForm from './CreateForm';
import Dropdown from './Dropdown';
import Modal from './Modal';

const DENIED_NOTE =
	'Los has bloqueado en el navegador. Se vuelven a permitir desde los ajustes del sitio.';

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

const Header = () => {
	const [showModal, setShowModal] = useState(false);
	const closeModal = () => setShowModal(false);

	const push = usePush();

	return (
		<div className='header'>
			<Modal formTitle='Nuevo' formId='create' closeModal={closeModal}>
				{showModal && <CreateForm setShowModal={setShowModal} />}
			</Modal>
			<div className='logo'>
				{/* Sin /public: Vite copia esa carpeta a la raíz al construir, así
				    que en producción el fichero está en /logo-icon.svg. El servidor
				    de desarrollo sirve las dos rutas y esconde el fallo. */}
				<img src='/logo-icon.svg' alt='' />
				<h1>Despensa</h1>
			</div>
			<div className='header-buttons'>
				<Button use='primary' onClick={() => setShowModal(true)}>
					Añadir
				</Button>
				<Dropdown
					icon={<FiSettings className='icon' />}
					title='Ajustes'
					options={[
						...pushOption(push),
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
