import { useContext, useState } from 'react';
import ItemsContext from '../lib/context/ItemsContext';
import { daysLeft, unitsLeft } from '../lib/items';
import Item from './Item';
import Toolbar from './Toolbar';

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
			<Toolbar
				search={searchBy}
				onSearchChange={setSearchBy}
				category={filterBy}
				onCategoryChange={setFilterBy}
				sort={sortBy}
				onSortChange={setSortBy}
			/>

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
