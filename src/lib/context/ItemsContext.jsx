import { createContext, useCallback, useEffect, useState } from 'react';
import { TICK_MS } from '../constants';
import { fromRow, toRow } from '../items';
import { supabase } from '../supabase';

const ItemsContext = createContext();

export const ItemsProvider = ({ children }) => {
	const [listData, setListData] = useState({
		data: [],
		error: false,
		loading: true
	});

	// Los días restantes los calcula cada componente leyendo la hora en el
	// momento de pintar. Esto sólo fuerza un repintado periódico para que la
	// cuenta atrás avance sola: guardar aquí la hora y pasarla hacia abajo
	// significaba tener dos relojes desfasados haciendo la misma cuenta.
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

	useEffect(() => {
		fetchData();

		// Cualquier cambio en la tabla recarga la lista, venga de este dispositivo
		// o del otro. Con veinte artículos sale más barato que ir reconciliando
		// cada evento por separado, y no hay forma de que las dos pantallas
		// acaben divergiendo.
		const channel = supabase
			.channel('items-changes')
			.on(
				'postgres_changes',
				{ event: '*', schema: 'public', table: 'items' },
				fetchData
			)
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	}, [fetchData]);

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
