import { forwardRef } from 'react';
import styles from './RadioGroup.module.css';

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
}

export interface RadioGroupProps {
  name: string;
  label?: string;
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
}

export const RadioGroup = forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ name, label, options, value, onChange, error }, ref) => {
    return (
      <div className={styles.wrapper} ref={ref}>
        {label && <label className={styles.label}>{label}</label>}
        <div className={styles.optionsContainer}>
          {options.map((option) => (
            <label
              key={option.value}
              className={`${styles.option} ${value === option.value ? styles.selected : ''}`}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={value === option.value}
                onChange={(e) => onChange?.(e.target.value)}
                className={styles.radio}
              />
              <div className={styles.optionContent}>
                <span className={styles.optionLabel}>{option.label}</span>
                {option.description && (
                  <span className={styles.optionDescription}>{option.description}</span>
                )}
              </div>
            </label>
          ))}
        </div>
        {error && <span className={styles.errorText}>{error}</span>}
      </div>
    );
  }
);

RadioGroup.displayName = 'RadioGroup';

export default RadioGroup;
