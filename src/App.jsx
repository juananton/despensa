import Login from './components/Login';
import Manager from './components/Manager';
import { ItemsProvider } from './lib/context/ItemsContext';
import { PantryProvider } from './lib/context/PantryContext';
import { useSession } from './lib/useSession';
import './styles/css/index.css';

const App = () => {
	const session = useSession();

	// La política RLS no deja leer nada sin sesión, así que ni montamos el
	// proveedor de datos hasta que haya alguien dentro.
	if (session === undefined) return null;
	if (!session) return <Login />;

	// La pausa envuelve a los artículos porque es quien decide con qué reloj se
	// cuentan sus días: primero se sabe si la despensa está parada, y sólo
	// entonces se pide la lista.
	return (
		<PantryProvider>
			<ItemsProvider>
				<Manager />
			</ItemsProvider>
		</PantryProvider>
	);
};

export default App;
