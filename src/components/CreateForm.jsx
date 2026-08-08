import { useContext, useState } from 'react';
import { CATEGORIES } from '../lib/constants';
import ItemsContext from '../lib/context/ItemsContext';
import { depletionFrom } from '../lib/items';
import { validateName } from '../lib/validation';
import Button from './Button';
import Input from './Input';
import Select from './Select';

const CreateForm = ({ setShowModal }) => {
	const { addItem } = useContext(ItemsContext);

	const [nameValue, setNameValue] = useState('');
	const [daysPerUnitValue, setDaysPerUnitValue] = useState(1);
	const [unitsValue, setUnitsValue] = useState(1);
	const [categoryValue, setCategoryValue] = useState(CATEGORIES.CAT1);
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

		const newItem = {
			name: nameValue,
			daysPerUnit: daysPerUnitValue,
			category: categoryValue,
			depletesAt: depletionFrom(unitsValue, daysPerUnitValue)
		};

		addItem(newItem);
		setShowModal(false);
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
			<Input
				type='number'
				label='Unidades'
				value={unitsValue}
				min={0}
				onChange={e => setUnitsValue(+e.target.value)}
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
