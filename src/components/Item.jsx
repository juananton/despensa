import { useContext, useEffect, useRef, useState } from 'react';
import {
	FiEdit,
	FiMinus,
	FiMoreVertical,
	FiPlus,
	FiTrash2
} from 'react-icons/fi';
import { WARNING_DAYS } from '../lib/constants';
import ItemsContext from '../lib/context/ItemsContext';
import { daysLeft, shiftUnits, unitsLeft } from '../lib/items';
import Button from './Button';
import DeleteForm from './DeleteForm';
import EditForm from './EditForm';
import Modal from './Modal';
import Tag from './Tag';

const Item = ({ item }) => {
	const { updateItem, now } = useContext(ItemsContext);

	// Derivados de la fecha de agotamiento: no hay estado que sincronizar.
	const daysCount = daysLeft(item, now);
	const unitsCount = unitsLeft(item, now);

	// Add and remove units
	const shift = delta =>
		updateItem({ id: item.id, depletesAt: shiftUnits(item, delta) });

	const addUnit = () => shift(1);
	const removeUnit = () => shift(-1);

	const finishWarning = () => {
		if (daysCount === 0) {
			return 'error';
		} else if (daysCount <= WARNING_DAYS) {
			return 'warning';
		}
	};

	// Actions dropdown
	const [dropdownOpened, setDropdownOpened] = useState(false);
	const dropdownRef = useRef(null);
	const dropdownButtonRef = useRef(null);

	const openDropdown = () => setDropdownOpened(true);
	const closeDropdown = () => setDropdownOpened(false);

	const handelClick = () => {
		if (!dropdownOpened) {
			openDropdown();
		} else {
			closeDropdown();
			dropdownButtonRef.current.blur();
		}
	};

	useEffect(() => {
		if (!dropdownOpened) return;

		const handleClickOutside = e => {
			!dropdownRef.current.contains(e.target) && closeDropdown();
		};

		document.addEventListener('click', handleClickOutside, {
			capture: true
		});
		return () =>
			document.removeEventListener('click', handleClickOutside, {
				capture: true
			});
	}, [dropdownOpened]);

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
				<div className='dropdownGroup' ref={dropdownRef}>
					<Button
						ref={dropdownButtonRef}
						onClick={handelClick}
						variant='icon'
						use='nobg'
					>
						<FiMoreVertical className='icon' />
					</Button>
					{dropdownOpened && (
						<ul className='dropdown'>
							<li
								onClick={() => {
									showEditModal();
									closeDropdown();
								}}
							>
								<FiEdit className='icon' />
								<span>Editar</span>
							</li>
							<li
								onClick={() => {
									showDeleteModal();
									closeDropdown();
								}}
							>
								<FiTrash2 className='icon' />
								<span>Eliminar</span>
							</li>
						</ul>
					)}
				</div>
			</div>
		</div>
	);
};

export default Item;
