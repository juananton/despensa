import { useState } from 'react';
import { FiBell, FiBellOff, FiLogOut, FiSettings } from 'react-icons/fi';
import { supabase } from '../lib/supabase';
import { usePush } from '../lib/usePush';
import Button from './Button';
import CreateForm from './CreateForm';
import Dropdown from './Dropdown';
import Modal from './Modal';

const DENIED_TITLE =
	'Has bloqueado los avisos para esta web. Se vuelven a permitir desde los ajustes del sitio, en el navegador.';

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
				title: DENIED_TITLE,
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
			title: push.error ?? undefined,
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
			<Modal formTitle='Añadir' formId='create' closeModal={closeModal}>
				{showModal && <CreateForm setShowModal={setShowModal} />}
			</Modal>
			<h1>Despensa</h1>
			<div className='header-buttons'>
				<Button use='primary' onClick={() => setShowModal(true)}>
					Añadir artículo
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
