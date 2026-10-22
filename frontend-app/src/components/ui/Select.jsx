import styles from './Select.module.css'

export default function Select({ label, id, error, options = [], className = '', required, ...props }) {
  return (
    <div className={styles.field}>
      {label && (
        <label htmlFor={id} className={styles.label}>
          {label}{required && <span className={styles.required} aria-hidden="true"> *</span>}
        </label>
      )}
      <select
        id={id}
        className={[styles.select, error ? styles.hasError : '', className].filter(Boolean).join(' ')}
        aria-invalid={!!error}
        required={required}
        {...props}
      >
        {options.map(({ value, label: optLabel }) => (
          <option key={value} value={value}>{optLabel}</option>
        ))}
      </select>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </div>
  )
}
