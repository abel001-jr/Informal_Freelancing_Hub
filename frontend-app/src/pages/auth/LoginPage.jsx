import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import Alert from '../../components/ui/Alert'
import styles from './AuthPage.module.css'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const destination = location.state?.from
  const from = destination
    ? `${destination.pathname}${destination.search ?? ''}${destination.hash ?? ''}`
    : location.state?.registered ? '/profile' : '/dashboard'

  const [fields, setFields] = useState({ username: '', password: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  function set(key, value) {
    setFields(f => ({ ...f, [key]: value }))
    if (errors[key]) setErrors(e => ({ ...e, [key]: '' }))
    if (serverError) setServerError('')
  }

  function validate() {
    const errs = {}
    if (!fields.username.trim()) errs.username = 'Username is required.'
    if (!fields.password)        errs.password = 'Password is required.'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    setServerError('')
    try {
      await login(fields.username.trim(), fields.password)
      navigate(from, { replace: true })
    } catch (err) {
      setServerError(err.message || 'Sign in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Sign in</h1>
        <p className={styles.subtitle}>
          Your workspace. Your people. Your next possibility.
        </p>
      </div>

      {serverError && (
        <Alert variant="error" className={styles.alert}>{serverError}</Alert>
      )}
      {location.state?.passwordChanged && <Alert variant="success">Password updated. Sign in with your new password.</Alert>}
      {location.state?.registered && <Alert variant="success">Account created. Sign in to complete your profile and verify your email.</Alert>}

      <form onSubmit={handleSubmit} noValidate className={styles.form}>
        <div className={styles.iconField}>
        <svg className={styles.fieldIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="7" r="4"/><path d="M4 21v-3a8 8 0 0 1 16 0v3"/></svg>
        <Input
          id="username"
          label="Username"
          type="text"
          autoComplete="username"
          autoFocus
          required
          value={fields.username}
          onChange={e => set('username', e.target.value)}
          error={errors.username}
          placeholder="your_username"
        />
        </div>
        <div className={`${styles.iconField} ${styles.passwordField}`}>
        <svg className={styles.fieldIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v3"/></svg>
        <Input
          id="password"
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          required
          value={fields.password}
          onChange={e => set('password', e.target.value)}
          error={errors.password}
          placeholder="••••••••"
        />
        <button className={styles.passwordToggle} type="button" aria-controls="password"
          aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}
          onClick={() => setShowPassword(value => !value)}>{showPassword ? 'Hide' : 'Show'}</button>
        </div>

        <div className={styles.forgot}>
          <Link to="/forgot-password" className={styles.link}>Forgot password?</Link>
        </div>

        {/* Animated sign-in button */}
        <div className={styles.submitRow}>
          <Button variant="primary" type="submit" loading={loading} disabled={loading} className={styles.submit}>
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </div>
      </form>
      <div className={styles.accountDivider}><span>New to FreelanceHub?</span></div>
      <Link to="/register" className={styles.secondaryAction}>Create an account <span aria-hidden="true">↗</span></Link>
    </div>
  )
}
