import { useContext, useState } from 'react';
import { CATEGORIES } from '../lib/constants';
import ItemsContext from '../lib/context/ItemsContext';
import { depletionFrom } from '../lib/items';
import {
	validateCycleDays,
	validateName,
	validateUnits,
	validateUnitsPerCycle
} from '../lib/validation';
import Button from './Button';
import Input from './Input';
import Select from './Select';

const CreateForm = ({ setShowModal }) => {
	const { addItem } = useContext(ItemsContext);

	const [nameValue, setNameValue] = useState('');
	// Texto, no números: ver la nota en lib/validation.js.
	const [unitsPerCycleValue, setUnitsPerCycleValue] = useState('1');
	const [cycleDaysValue, setCycleDaysValue] = useState('1');
	const [unitsValue, setUnitsValue] = useState('1');
	const [categoryValue, setCategoryValue] = useState(CATEGORIES.CAT1);
	const [errors, setErrors] = useState({});

	const handleSubmit = e => {
		e.preventDefault();

		const validated = {
			name: validateName(nameValue, { requireValue: true }),
			unitsPerCycle: validateUnitsPerCycle(unitsPerCycleValue),
			cycleDays: validateCycleDays(cycleDaysValue),
			units: validateUnits(unitsValue)
		};

		setErrors(validated);
		if (Object.values(validated).some(field => field.error)) return;

		const rate = {
			unitsPerCycle: Number(unitsPerCycleValue),
			cycleDays: Number(cycleDaysValue)
		};

		addItem({
			name: nameValue,
			...rate,
			category: categoryValue,
			depletesAt: depletionFrom(Number(unitsValue), rate)
		});

		setShowModal(false);
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
			<Input
				type='number'
				label='Unidades'
				value={unitsValue}
				min={0}
				inputMode='numeric'
				onChange={e => setUnitsValue(e.target.value)}
				message={errors.units?.message}
				error={errors.units?.error}
			/>
			<div className='form-buttons'>
				<Button type='button' onClick={() => setShowModal(false)}>
					Cancelar
				</Button>
				<Button type='submit' use='primary'>
					Añadir
				</Button>
			</div>
		</form>
	);
};

export default CreateForm;
