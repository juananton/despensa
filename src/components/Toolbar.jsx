import { useState } from 'react';
import { FiSearch, FiX } from 'react-icons/fi';
import { CATEGORIES } from '../lib/constants';
import Button from './Button';
import Input from './Input';
import Select from './Select';

const Toolbar = ({
	search,
	onSearchChange,
	category,
	onCategoryChange,
	sort,
	onSortChange
}) => {
	const [searchOpen, setSearchOpen] = useState(false);

	const openSearch = () => setSearchOpen(true);

	// Cerrar también limpia el término: dejar la barra oculta con un filtro
	// aplicado que ya no se ve en ningún sitio sería confuso.
	const closeSearch = () => {
		setSearchOpen(false);
		onSearchChange('');
	};

	if (searchOpen) {
		return (
			<div className='toolbar'>
				<div className='search-bar'>
					<FiSearch className='icon icon-search' />
					<Input
						type='text'
						value={search}
						placeholder='Buscar'
						onChange={e => onSearchChange(e.target.value)}
						onKeyDown={e => e.key === 'Escape' && closeSearch()}
						autoFocus
					/>
					<Button variant='icon' use='nobg' onClick={closeSearch}>
						<FiX className='icon' />
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className='toolbar'>
			<div className='wrapper'>
				<Select
					value={category}
					onChange={e => onCategoryChange(e.target.value)}
				>
					<option value='all'>Todos</option>
					{Object.values(CATEGORIES).map(cat => (
						<option key={cat} value={cat}>
							{cat}
						</option>
					))}
				</Select>
				<Select value={sort} onChange={e => onSortChange(+e.target.value)}>
					<option value='0'>Más recientes</option>
					<option value='1'>Nombre</option>
					<option value='2'>Menos días</option>
					<option value='3'>Más días</option>
				</Select>
			</div>
			<Button variant='icon' use='nobg' onClick={openSearch}>
				<FiSearch className='icon' />
			</Button>
		</div>
	);
};

export default Toolbar;
