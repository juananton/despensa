import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState
} from 'react';
import { TICK_MS } from '../constants';
import { fromRow, toRow } from '../items';
import { supabase } from '../supabase';
import PantryContext from './PantryContext';

// Margen para agrupar la ráfaga de avisos de realtime que provoca reanudar la
// despensa. Lo bastante corto para no notarse al pulsar `+`, lo bastante largo
// para que veinte mensajes seguidos quepan dentro.
const RELOAD_DELAY_MS = 100;

const ItemsContext = createContext();

export const ItemsProvider = ({ children }) => {
	const { paused } = useContext(PantryContext);

	const [listData, setListData] = useState({
		data: [],
		error: false,
		loading: true
	});

	// Los días restantes los calcula cada componente leyendo la hora en el
	// momento de pintar. Esto sólo fuerza un repintado periódico para que la
	// cuenta atrás avance sola: guardar aquí la hora y pasarla hacia abajo
	// significaba tener dos relojes desfasados haciendo la misma cuenta. Con
	// una pausa viva el reloj no avanza (ver lib/clock.js) y el repintado no
	// cambia nada, que es justo lo que se quiere.
	const [, setTick] = useState(0);

	useEffect(() => {
		const interval = setInterval(() => setTick(tick => tick + 1), TICK_MS);
		return () => clearInterval(interval);
	}, []);

	const fetchData = useCallback(async () => {
		// El desempate por id no es cosmético: sin él, dos artículos con el mismo
		// created_at salen en el orden físico de las filas, y al actualizar una
		// Postgres la reescribe al final de la tabla. Sin esto, cada `+` o `−`
		// hace que el artículo salte de sitio en la lista.
		const { data, error } = await supabase
			.from('items')
			.select('*')
			.order('created_at', { ascending: false })
			.order('id');

		if (error) {
			setListData({ data: [], loading: false, error: true });
			return;
		}

		setListData({ data: data.map(fromRow), loading: false, error: false });
	}, []);

	// Realtime manda un mensaje por FILA cambiada, así que reanudar la despensa
	// —que desplaza la tabla entera de una vez— dispararía tantas recargas como
	// artículos haya. Agruparlas en una sola deja el caso normal igual (un `+`
	// es un mensaje) y convierte esa ráfaga en una recarga.
	const reloadTimer = useRef(null);

	const scheduleReload = useCallback(() => {
		clearTimeout(reloadTimer.current);
		reloadTimer.current = setTimeout(fetchData, RELOAD_DELAY_MS);
	}, [fetchData]);

	// La carga inicial no está aquí: la hace el efecto de la pausa, que también
	// corre al montar. Pedirla en los dos sitios traía la lista dos veces.
	useEffect(() => {
		// Cualquier cambio en la tabla recarga la lista, venga de este dispositivo
		// o del otro. Con veinte artículos sale más barato que ir reconciliando
		// cada evento por separado, y no hay forma de que las dos pantallas
		// acaben divergiendo.
		const channel = supabase
			.channel('items-changes')
			.on(
				'postgres_changes',
				{ event: '*', schema: 'public', table: 'items' },
				scheduleReload
			)
			.subscribe();

		return () => {
			clearTimeout(reloadTimer.current);
			supabase.removeChannel(channel);
		};
	}, [scheduleReload]);

	// Pausar y reanudar cambian lo que hay que enseñar sin que nadie toque la
	// lista: al reanudar porque Postgres reescribe todas las fechas, y al
	// pausar porque el reloj deja de avanzar. Se recarga sin esperar a que
	// llegue el aviso de realtime, que es quien avisa al OTRO móvil.
	useEffect(() => {
		fetchData();
	}, [paused, fetchData]);

	const addItem = async newItem => {
		const { error } = await supabase.from('items').insert(toRow(newItem));
		if (!error) fetchData();
	};

	const updateItem = async ({ id, ...changes }) => {
		const { error } = await supabase
			.from('items')
			.update(toRow(changes))
			.eq('id', id);

		if (!error) fetchData();
	};

	const deleteItem = async id => {
		const { error } = await supabase.from('items').delete().eq('id', id);
		if (!error) fetchData();
	};

	// Sumar o restar unidades. Es una operación relativa que resuelve el
	// servidor: dos `+` simultáneos suman dos, no uno.
	const shiftUnits = async (id, delta) => {
		const { error } = await supabase.rpc('shift_units', {
			item_id: id,
			delta
		});

		if (!error) fetchData();
	};

	return (
		<ItemsContext.Provider
			value={{
				listData,
				addItem,
				deleteItem,
				updateItem,
				shiftUnits
			}}
		>
			{children}
		</ItemsContext.Provider>
	);
};

export default ItemsContext;
