import { useContext, useState } from 'react';
import { CATEGORIES } from '../lib/constants';
import ItemsContext from '../lib/context/ItemsContext';
import { rescaleToDaysPerUnit } from '../lib/items';
import { validateName } from '../lib/validation';
import Button from './Button';
import Input from './Input';
import Select from './Select';

const EditForm = ({ item, closeModal }) => {
	const { updateItem } = useContext(ItemsContext);

	const [nameValue, setNameValue] = useState(item.name);
	const [daysPerUnitValue, setDaysPerUnitValue] = useState(item.daysPerUnit);
	const [categoryValue, setCategoryValue] = useState(item.category);
	const [nameValidation, setNameValidation] = useState({
		message: '',
		error: false
	});

	const handleSubmit = e => {
		e.preventDefault();

		const validation = validateName(nameValue, { requireValue: true });
		if (validation.error) {
			setNameValidation(validation);
			return;
		}

		const updatedItem = {
			name: nameValue,
			daysPerUnit: daysPerUnitValue,
			category: categoryValue,
			id: item.id
		};

		// Cambiar la duración por unidad reescala el stock que quedaba, para no
		// perder lo ya consumido.
		if (daysPerUnitValue !== item.daysPerUnit) {
			updatedItem.depletesAt = rescaleToDaysPerUnit(item, daysPerUnitValue);
		}

		updateItem(updatedItem);
		closeModal(true);
	};

	const handleNameChange = e => {
		setNameValue(e.target.value);
		setNameValidation(validateName(e.target.value));
	};

	return (
		<form className='create-form' onSubmit={handleSubmit}>
			<Input
				type='text'
				label='Nombre'
				value={nameValue}
				onChange={handleNameChange}
				message={nameValidation.message}
				error={nameValidation.error}
				autoFocus
			/>
			<Select
				label='Categoría'
				value={categoryValue}
				onChange={e => {
					setCategoryValue(e.target.value);
				}}
			>
				{Object.values(CATEGORIES).map(cat => (
					<option key={cat} value={cat}>
						{cat}
					</option>
				))}
			</Select>
			<Input
				type='number'
				label='Días por unidad'
				value={daysPerUnitValue}
				min={1}
				onChange={e => setDaysPerUnitValue(+e.target.value)}
			/>
			<div className='form-buttons'>
				<Button type='button' onClick={closeModal}>
					Cancelar
				</Button>
				<Button type='submit' use='primary'>
					Actualizar
				</Button>
			</div>
		</form>
	);
};

export default EditForm;
