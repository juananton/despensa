import Login from './components/Login';
import Manager from './components/Manager';
import { ItemsProvider } from './lib/context/ItemsContext';
import { useSession } from './lib/useSession';
import './styles/css/index.css';

const App = () => {
	const session = useSession();

	// La política RLS no deja leer nada sin sesión, así que ni montamos el
	// proveedor de datos hasta que haya alguien dentro.
	if (session === undefined) return null;
	if (!session) return <Login />;

	return (
		<ItemsProvider>
			<Manager />
		</ItemsProvider>
	);
};

export default App;
