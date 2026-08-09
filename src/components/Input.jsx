const Input = ({ label, message, error, ...props }) => {
	return (
		<label>
			<div className='label'>{label}</div>
			<input {...props} className={`input ${error ? 'error' : ''}`} />
			{message && <p className='message'>{message}</p>}
		</label>
	);
};

export default Input;
