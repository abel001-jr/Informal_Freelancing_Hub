import styles from './Spinner.module.css'

export default function Spinner({ size = 'md', label = 'Loading…' }) {
  return (
    <div className={styles.wrapper} role="status" aria-label={label}>
      <span className={[styles.spinner, styles[size]].join(' ')} />
      <span className="sr-only">{label}</span>
    </div>
  )
}
