import styles from './Input.module.css'

export default function Input({
  label,
  id,
  error,
  hint,
  className = '',
  required,
  ...props
}) {
  return (
    <div className={styles.field}>
      {label && (
        <label htmlFor={id} className={styles.label}>
          {label}{required && <span className={styles.required} aria-hidden="true"> *</span>}
        </label>
      )}
      <input
        id={id}
        className={[styles.input, error ? styles.hasError : '', className].filter(Boolean).join(' ')}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        aria-invalid={!!error}
        required={required}
        {...props}
      />
      {hint && !error && <p id={`${id}-hint`} className={styles.hint}>{hint}</p>}
      {error && <p id={`${id}-error`} className={styles.error} role="alert">{error}</p>}
    </div>
  )
}
