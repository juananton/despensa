import { createContext, useEffect, useState } from 'react';
import { TICK_MS } from '../constants';

const API_URL = 'http://localhost:4000/data';

const ItemsContext = createContext();

export const ItemsProvider = ({ children }) => {
	// Data states
	const [listData, setListData] = useState({
		data: [],
		error: false,
		loading: true
	});

	// Acepta una lista o una función (prev => siguiente), para que dos acciones
	// seguidas no se pisen leyendo el estado de un render anterior.
	const setData = newData =>
		setListData(prev => ({
			data: typeof newData === 'function' ? newData(prev.data) : newData,
			loading: false,
			error: false
		}));

	const setError = () => setListData({ data: [], loading: false, error: true });

	// Reloj compartido. Los días restantes se calculan contra él, así que basta
	// con refrescarlo para que toda la lista se actualice sola.
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		const interval = setInterval(() => setNow(Date.now()), TICK_MS);
		return () => clearInterval(interval);
	}, []);

	// Fetch items
	const fetchData = async signal => {
		try {
			const res = await fetch(`${API_URL}?_sort=id&_order=desc`, { signal });
			if (res.ok) {
				const data = await res.json();
				setData(data);
			} else {
				setError();
			}
		} catch (err) {
			if (err.name !== 'AbortError') setError();
		}
	};

	useEffect(() => {
		const controller = new AbortController();
		fetchData(controller.signal);
		return () => controller.abort();
	}, []);

	// Add item
	const addItem = async newItem => {
		try {
			const res = await fetch(API_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(newItem)
			});
			const data = await res.json();
			setData(prev => [data, ...prev]);
		} catch (err) {}
	};

	// Update Item
	const updateItem = async updatedItem => {
		// Optimista: la interfaz responde al momento y el servidor confirma.
		setData(prev =>
			prev.map(item =>
				item.id === updatedItem.id ? { ...item, ...updatedItem } : item
			)
		);

		try {
			await fetch(`${API_URL}/${updatedItem.id}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(updatedItem)
			});
		} catch (err) {}
	};

	// Delete item
	const deleteItem = async id => {
		await fetch(`${API_URL}/${id}`, {
			method: 'DELETE'
		});

		setData(prev => prev.filter(item => item.id !== id));
	};

	return (
		<ItemsContext.Provider
			value={{
				listData,
				now,
				addItem,
				deleteItem,
				updateItem
			}}
		>
			{children}
		</ItemsContext.Provider>
	);
};

export default ItemsContext;
