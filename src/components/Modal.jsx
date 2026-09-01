import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';
import Button from './Button';

/**
 * El título llega entero y no como una palabra a la que este componente añade
 * "artículo": desde que la pausa de la despensa también se pide por aquí, hay
 * ventanas que no van de un artículo.
 */
const Modal = ({ title, children, closeModal }) => {
	if (!children) return null;

	return createPortal(
		<div className='modal-overlay'>
			<div className='modal-window'>
				<div className='modal-window-header'>
					<h1>{title}</h1>
					<Button
						className='close'
						variant='icon'
						use='nobg'
						onClick={closeModal}
					>
						<FiX className='icon' />
					</Button>
				</div>
				{children}
			</div>
		</div>,
		document.getElementById('modal')
	);
};

export default Modal;
