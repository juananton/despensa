import { useContext, useState } from 'react';
import { CATEGORIES } from '../lib/constants';
import ItemsContext from '../lib/context/ItemsContext';
import { rescaleToRate } from '../lib/items';
import {
	validateCycleDays,
	validateName,
	validateUnitsPerCycle
} from '../lib/validation';
import Button from './Button';
import Input from './Input';
import Select from './Select';

const EditForm = ({ item, closeModal }) => {
	const { updateItem } = useContext(ItemsContext);

	const [nameValue, setNameValue] = useState(item.name);
	// Texto, no números: ver la nota en lib/validation.js.
	const [unitsPerCycleValue, setUnitsPerCycleValue] = useState(
		String(item.unitsPerCycle)
	);
	const [cycleDaysValue, setCycleDaysValue] = useState(String(item.cycleDays));
	const [categoryValue, setCategoryValue] = useState(item.category);
	const [errors, setErrors] = useState({});

	const handleSubmit = e => {
		e.preventDefault();

		const validated = {
			name: validateName(nameValue, { requireValue: true }),
			unitsPerCycle: validateUnitsPerCycle(unitsPerCycleValue),
			cycleDays: validateCycleDays(cycleDaysValue)
		};

		setErrors(validated);
		if (Object.values(validated).some(field => field.error)) return;

		const rate = {
			unitsPerCycle: Number(unitsPerCycleValue),
			cycleDays: Number(cycleDaysValue)
		};

		const updatedItem = {
			name: nameValue,
			...rate,
			category: categoryValue,
			id: item.id
		};

		// Cambiar el ritmo de consumo reescala el stock que quedaba, para no
		// perder lo ya consumido.
		const rateChanged =
			rate.unitsPerCycle !== item.unitsPerCycle ||
			rate.cycleDays !== item.cycleDays;

		if (rateChanged) {
			updatedItem.depletesAt = rescaleToRate(item, rate);
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
			<div className='rate'>
				<Input
					type='number'
					label='Consumo'
					value={unitsPerCycleValue}
					min={1}
					inputMode='numeric'
					onChange={e => setUnitsPerCycleValue(e.target.value)}
					message={errors.unitsPerCycle?.message}
					error={errors.unitsPerCycle?.error}
				/>
				<span className='rate-separator'>uds. cada</span>
				<Input
					type='number'
					value={cycleDaysValue}
					min={1}
					inputMode='numeric'
					onChange={e => setCycleDaysValue(e.target.value)}
					message={errors.cycleDays?.message}
					error={errors.cycleDays?.error}
				/>
				<span className='rate-separator'>días</span>
			</div>
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
