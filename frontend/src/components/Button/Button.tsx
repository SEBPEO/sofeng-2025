import React from 'react';
import styles from './Button.module.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  className = '',
  children,
  type = 'button',
  ...props
}: ButtonProps) => {
  const cls = [styles.button, styles[variant], className].filter(Boolean).join(' ');
  return (
    <button className={cls} type={type} {...props}>
      {children}
    </button>
  );
};

export default Button;
