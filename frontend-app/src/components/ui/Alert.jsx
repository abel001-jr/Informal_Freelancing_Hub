import styles from './Alert.module.css'

/**
 * variant: 'error' | 'success' | 'warning' | 'info'
 */
export default function Alert({ variant = 'error', children, className = '' }) {
  return (
    <div
      role="alert"
      className={[styles.alert, styles[variant], className].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  )
}
