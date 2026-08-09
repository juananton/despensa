import { CATEGORIES } from '../lib/constants';
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
	return (
		<div className='toolbar'>
			<div className='wrapper1'>
				<Input
					type='text'
					value={search}
					placeholder='Buscar'
					onChange={e => onSearchChange(e.target.value)}
				/>
			</div>
			<div className='wrapper2'>
				<Select
					value={category}
					onChange={e => onCategoryChange(e.target.value)}
				>
					<option value='all'>Todas</option>
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
					<option value='4'>Menos unidades</option>
					<option value='5'>Más unidades</option>
				</Select>
			</div>
		</div>
	);
};

export default Toolbar;
