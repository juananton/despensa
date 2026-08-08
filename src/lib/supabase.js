import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
	// Se incrustan al construir, no se leen al ejecutar: si faltaban durante el
	// build, no hay nada que arreglar en caliente, hay que volver a construir.
	throw new Error(
		'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY. En local, copia .env.example a .env.local. En Vercel, ponlas en Environment Variables y vuelve a desplegar.'
	);
}

export const supabase = createClient(url, publishableKey);
