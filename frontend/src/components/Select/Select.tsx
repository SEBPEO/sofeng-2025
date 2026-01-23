import React, { forwardRef } from 'react';
import styles from './Select.module.css';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className = '', ...props }, ref) => {
    return (
      <div className={styles.wrapper}>
        {label && <label className={styles.label}>{label}</label>}
        <select
          ref={ref}
          className={`${styles.select} ${error ? styles.error : ''} ${className}`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <span className={styles.errorText}>{error}</span>}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
