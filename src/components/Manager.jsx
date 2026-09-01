import Header from './Header';
import ItemsList from './ItemsList';
import PauseBanner from './PauseBanner';

const Manager = () => {
	return (
		<div className='manager'>
			<Header />
			<PauseBanner />
			<ItemsList />
		</div>
	);
};

export default Manager;
