import { useEffect, useState } from 'react';
import { supabase } from './supabase';

/**
 * Sesión de Supabase. `undefined` mientras se comprueba, `null` si no hay nadie
 * dentro, y el objeto de sesión si lo hay. Distinguir los tres estados evita
 * que la pantalla de login parpadee al recargar con la sesión ya guardada.
 */
export const useSession = () => {
	const [session, setSession] = useState(undefined);

	useEffect(() => {
		supabase.auth.getSession().then(({ data }) => setSession(data.session));

		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((_event, session) =>
			setSession(session)
		);

		return () => subscription.unsubscribe();
	}, []);

	return session;
};
