import { useContext, useState } from 'react';
import { CATEGORIES } from '../lib/constants';
import ItemsContext from '../lib/context/ItemsContext';
import { rescaleToDaysPerUnit } from '../lib/items';
import { validateDaysPerUnit, validateName } from '../lib/validation';
import Button from './Button';
import Input from './Input';
import Select from './Select';

const EditForm = ({ item, closeModal }) => {
	const { updateItem } = useContext(ItemsContext);

	const [nameValue, setNameValue] = useState(item.name);
	// Texto, no números: ver la nota en lib/validation.js.
	const [daysPerUnitValue, setDaysPerUnitValue] = useState(
		String(item.daysPerUnit)
	);
	const [categoryValue, setCategoryValue] = useState(item.category);
	const [errors, setErrors] = useState({});

	const handleSubmit = e => {
		e.preventDefault();

		const validated = {
			name: validateName(nameValue, { requireValue: true }),
			daysPerUnit: validateDaysPerUnit(daysPerUnitValue)
		};

		setErrors(validated);
		if (Object.values(validated).some(field => field.error)) return;

		const daysPerUnit = Number(daysPerUnitValue);

		const updatedItem = {
			name: nameValue,
			daysPerUnit,
			category: categoryValue,
			id: item.id
		};

		// Cambiar la duración por unidad reescala el stock que quedaba, para no
		// perder lo ya consumido.
		if (daysPerUnit !== item.daysPerUnit) {
			updatedItem.depletesAt = rescaleToDaysPerUnit(item, daysPerUnit);
		}

		updateItem(updatedItem);
		closeModal(true);
	};

	const handleNameChange = e => {
		setNameValue(e.target.value);
		setErrors(prev => ({ ...prev, name: validateName(e.target.value) }));
	};

	return (
		<form className='create-form' onSubmit={handleSubmit}>
			<Input
				type='text'
				label='Nombre'
				value={nameValue}
				onChange={handleNameChange}
				message={errors.name?.message}
				error={errors.name?.error}
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
				inputMode='numeric'
				onChange={e => setDaysPerUnitValue(e.target.value)}
				message={errors.daysPerUnit?.message}
				error={errors.daysPerUnit?.error}
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
