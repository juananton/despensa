import { useState } from 'react';
import { supabase } from '../lib/supabase';
import Button from './Button';
import Input from './Input';

/**
 * Acceso por contraseña, no por enlace mágico. El servicio de correo que trae
 * Supabase de serie permite un puñado de envíos por hora y está pensado sólo
 * para pruebas: colgar de él el acceso diario significa quedarse fuera de la
 * despensa el día que se agote la cuota.
 *
 * Las dos cuentas se crean a mano desde el panel, con su contraseña. Aquí no
 * hay registro ni recuperación: si alguna se pierde, se cambia desde el panel.
 */
const Login = () => {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [errorMessage, setErrorMessage] = useState('');
	const [signingIn, setSigningIn] = useState(false);

	const handleSubmit = async e => {
		e.preventDefault();

		setSigningIn(true);
		setErrorMessage('');

		const { error } = await supabase.auth.signInWithPassword({
			email,
			password
		});

		setSigningIn(false);

		// El mensaje de Supabase tal cual: uno genérico sólo sirve para esconder
		// la causa cuando algo falla.
		if (error) setErrorMessage(error.message);
	};

	return (
		<div className='manager'>
			<div className='header'>
				<h1>Despensa</h1>
			</div>
			<form className='create-form' onSubmit={handleSubmit}>
				<Input
					type='email'
					label='Correo'
					value={email}
					onChange={e => setEmail(e.target.value)}
					autoComplete='username'
					required
					autoFocus
				/>
				<Input
					type='password'
					label='Contraseña'
					value={password}
					onChange={e => setPassword(e.target.value)}
					message={errorMessage}
					error={!!errorMessage}
					autoComplete='current-password'
					required
				/>
				<div className='form-buttons'>
					<Button
						type='submit'
						use='primary'
						disabled={signingIn || !email || !password}
					>
						{signingIn ? 'Entrando...' : 'Entrar'}
					</Button>
				</div>
			</form>
		</div>
	);
};

export default Login;
