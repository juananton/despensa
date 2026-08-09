import { forwardRef } from 'react';

const BTN_VARIANTS = {
	text: 'btn-text',
	icon: 'btn-icon'
};
const BTN_USES = {
	primary: 'btn-primary',
	secondary: 'btn-secondary',
	nobg: 'btn-nobg',
	disabled: 'disabled'
};

const Button = forwardRef(
	(
		{ variant = 'text', use = 'secondary', className, children, ...props },
		ref
	) => {
		const btnVariant = BTN_VARIANTS[variant];
		const btnUse = BTN_USES[use];

		return (
			<button
				ref={ref}
				{...props}
				className={`btn ${btnVariant} ${btnUse} ${className || ''}`.trim()}
			>
				{children}
			</button>
		);
	}
);

Button.displayName = 'Button';

export default Button;
