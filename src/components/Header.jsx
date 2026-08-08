import { useState } from 'react';
import { FiLogOut } from 'react-icons/fi';
import { supabase } from '../lib/supabase';
import Button from './Button';
import CreateForm from './CreateForm';
import Modal from './Modal';

const Header = () => {
	const [showModal, setShowModal] = useState(false);
	const closeModal = () => setShowModal(false);

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
				<Button
					variant='icon'
					use='nobg'
					title='Salir'
					onClick={() => supabase.auth.signOut()}
				>
					<FiLogOut className='icon' />
				</Button>
			</div>
		</div>
	);
};

export default Header;
