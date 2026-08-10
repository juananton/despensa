import { useContext, useState } from 'react';
import {
	FiEdit,
	FiMinus,
	FiMoreVertical,
	FiPlus,
	FiTrash2
} from 'react-icons/fi';
import { WARNING_DAYS } from '../lib/constants';
import ItemsContext from '../lib/context/ItemsContext';
import { daysLeft, unitsLeft } from '../lib/items';
import Button from './Button';
import DeleteForm from './DeleteForm';
import Dropdown from './Dropdown';
import EditForm from './EditForm';
import Modal from './Modal';
import Tag from './Tag';

const Item = ({ item }) => {
	const { shiftUnits } = useContext(ItemsContext);

	// Derivados de la fecha de agotamiento: no hay estado que sincronizar.
	const daysCount = daysLeft(item);
	const unitsCount = unitsLeft(item);

	// Add and remove units
	const addUnit = () => shiftUnits(item.id, 1);
	const removeUnit = () => shiftUnits(item.id, -1);

	const finishWarning = () => {
		if (daysCount === 0) {
			return 'error';
		} else if (daysCount <= WARNING_DAYS) {
			return 'warning';
		}
	};

	// Access edit and delete item forms
	const [modalContent, setModalContent] = useState({
		formDisplay: undefined,
		formTitle: ''
	});

	const showDeleteModal = () => {
		setModalContent({
			formDisplay: <DeleteForm item={item} closeModal={closeModal} />,
			formTitle: 'Eliminar'
		});
	};

	const showEditModal = () => {
		setModalContent({
			formDisplay: <EditForm item={item} closeModal={closeModal} />,
			formTitle: 'Editar'
		});
	};

	const closeModal = () =>
		setModalContent({ formDisplay: undefined, formTitle: '' });

	return (
		<div className='item'>
			<Modal formTitle={modalContent.formTitle} closeModal={closeModal}>
				{modalContent.formDisplay}
			</Modal>
			<div className='wrapper'>
				<Tag className='category'>{item.category}</Tag>
				<h2 className='name'>{item.name}</h2>
				<span className={`days ${finishWarning()}`}>
					{daysCount}
					<span>días</span>
				</span>
			</div>
			<div className='controls'>
				<span className={`units ${finishWarning()}`}>{unitsCount}</span>
				<Button onClick={removeUnit} variant='icon' disabled={daysCount <= 0}>
					<FiMinus className='icon' />
				</Button>
				<Button onClick={addUnit} variant='icon'>
					<FiPlus className='icon' />
				</Button>
				<Dropdown
					icon={<FiMoreVertical className='icon' />}
					title='Acciones'
					options={[
						{
							icon: <FiEdit className='icon' />,
							label: 'Editar',
							onClick: showEditModal
						},
						{
							icon: <FiTrash2 className='icon' />,
							label: 'Eliminar',
							onClick: showDeleteModal
						}
					]}
				/>
			</div>
		</div>
	);
};

export default Item;
