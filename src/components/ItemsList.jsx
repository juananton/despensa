import React, { useContext, useState } from 'react';
import { CATEGORIES } from '../lib/constants';
import ItemsContext from '../lib/context/ItemsContext';
import { daysLeft, unitsLeft } from '../lib/items';
import Input from './Input';
import Item from './Item';
import Select from './Select';

const ItemsList = () => {
	const { listData } = useContext(ItemsContext);

	const [searchBy, setSearchBy] = useState('');
	const [filterBy, setFilterBy] = useState('all');
	const [sortBy, setSortBy] = useState(0);

	let itemsFiltered = searchByName(listData, searchBy);
	itemsFiltered = filterByCategory(itemsFiltered, filterBy);
	itemsFiltered = sortItems(itemsFiltered, sortBy);

	const itemsRendered = renderItems(listData, itemsFiltered);

	return (
		<div>
			<div className='toolbar'>
				<div className='wrapper1'>
					<Input
						type='text'
						value={searchBy}
						placeholder='Buscar'
						onChange={e => setSearchBy(e.target.value)}
					/>
				</div>
				<div className='wrapper2'>
					<Select
						value={filterBy}
						onChange={e => {
							setFilterBy(e.target.value);
						}}
					>
						<option value='all'>Todas</option>
						{Object.values(CATEGORIES).map(cat => (
							<option key={cat} value={cat}>
								{cat}
							</option>
						))}
					</Select>
					<Select
						value={sortBy}
						onChange={e => {
							setSortBy(+e.target.value);
						}}
					>
						<option value='0'>Más recientes</option>
						<option value='1'>Nombre</option>
						<option value='2'>Menos días</option>
						<option value='3'>Más días</option>
						<option value='4'>Menos unidades</option>
						<option value='5'>Más unidades</option>
					</Select>
				</div>
			</div>

			{itemsRendered}
		</div>
	);
};

const searchByName = (items, search) => {
	if (!search) return items.data;

	const lowerCasedSearch = search.toLowerCase();

	return items.data.filter(item =>
		item.name.toLowerCase().startsWith(lowerCasedSearch)
	);
};

const filterByCategory = (items, filterBy) => {
	let filteredItems;

	filterBy === 'all'
		? (filteredItems = items)
		: (filteredItems = items.filter(item => item.category === filterBy));
	return filteredItems;
};

const sortItems = (items, sortBy) => {
	const by = read => (a, b) => read(a) - read(b);
	const desc = compare => (a, b) => compare(b, a);

	const byName = (a, b) => a.name.localeCompare(b.name, 'es');
	const byDays = by(item => daysLeft(item));
	const byUnits = by(item => unitsLeft(item));

	switch (sortBy) {
		case 1:
			return [...items].sort(byName);
		case 2:
			return [...items].sort(byDays);
		case 3:
			return [...items].sort(desc(byDays));
		case 4:
			return [...items].sort(byUnits);
		case 5:
			return [...items].sort(desc(byUnits));
		default:
			return items;
	}
};

const renderItems = (items, itemsFiltered) => {
	if (items.loading) return <p>Cargando artículos...</p>;
	if (items.error) return <p>Error al cargar los artículos</p>;
	if (!itemsFiltered.length) return <p>No hay artículos que mostrar</p>;

	return itemsFiltered.map(item => <Item item={item} key={item.id} />);
};

export default ItemsList;
