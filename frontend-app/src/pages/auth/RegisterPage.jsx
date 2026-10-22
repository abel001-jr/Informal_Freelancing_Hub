import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Button from '../../components/ui/Button'
import Alert from '../../components/ui/Alert'
import styles from './AuthPage.module.css'

const ROLE_OPTIONS = [
  { value: '',           label: 'I want to…' },
  { value: 'client',     label: 'Hire freelancers (Client)' },
  { value: 'freelancer', label: 'Offer my services (Freelancer)' },
  { value: 'both',       label: 'Both' },
]

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [fields, setFields] = useState({
    first_name: '', last_name: '', username: '',
    email: '', phone: '', role: '',
    password: '', password2: '', accept_terms: false,
  })
  const [errors, setErrors]       = useState({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading]     = useState(false)

  function set(key, value) {
    setFields(f => ({ ...f, [key]: value }))
    if (errors[key]) setErrors(e => ({ ...e, [key]: '' }))
    if (serverError) setServerError('')
  }

  function validate() {
    const errs = {}
    if (!fields.first_name.trim()) errs.first_name = 'First name is required.'
    if (!fields.last_name.trim())  errs.last_name  = 'Last name is required.'
    if (!fields.username.trim())   errs.username   = 'Username is required.'
    if (!/^[a-zA-Z0-9_]+$/.test(fields.username))
      errs.username = 'Letters, numbers and underscores only.'
    if (!fields.email.trim())      errs.email    = 'Email is required.'
    if (!/\S+@\S+\.\S+/.test(fields.email)) errs.email = 'Enter a valid email address.'
    if (!fields.role)              errs.role     = 'Please select your account type.'
    if (!fields.password)          errs.password = 'Password is required.'
    if (fields.password.length < 8) errs.password = 'Password must be at least 8 characters.'
    if (fields.password !== fields.password2) errs.password2 = 'Passwords do not match.'
    if (!fields.accept_terms) errs.accept_terms = 'Please accept the terms to create your account.'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    setErrors({})
    setServerError('')
    try {
      await register({
        first_name: fields.first_name.trim(),
        last_name:  fields.last_name.trim(),
        username:   fields.username.trim(),
        email:      fields.email.trim(),
        phone:      fields.phone.trim(),
        role:       fields.role,
        password:   fields.password,
        accept_terms: fields.accept_terms,
      })
      navigate('/login', { state: { registered: true } })
    } catch (err) {
      const fieldErrors = {}
      if (err.data && typeof err.data === 'object') {
        for (const [key, messages] of Object.entries(err.data)) {
          if (Object.hasOwn(fields, key)) {
            fieldErrors[key] = Array.isArray(messages) ? messages.join(' ') : String(messages)
          }
        }
      }
      setErrors(fieldErrors)
      setServerError(Object.keys(fieldErrors).length
        ? 'Please check the highlighted fields.'
        : err.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Create your account</h1>
        <p className={styles.subtitle}>
          Already have one?{' '}
          <Link to="/login" className={styles.link}>Sign in</Link>
        </p>
      </div>

      {serverError && (
        <Alert variant="error" className={styles.alert}>{serverError}</Alert>
      )}

      <form onSubmit={handleSubmit} noValidate className={`${styles.form} ${styles.registrationForm}`}>
        <div className={styles.row}>
          <Input id="first_name" label="First name" type="text" autoComplete="given-name"
            autoFocus required value={fields.first_name}
            onChange={e => set('first_name', e.target.value)}
            error={errors.first_name} placeholder="Ada" />
          <Input id="last_name" label="Last name" type="text" autoComplete="family-name"
            required value={fields.last_name}
            onChange={e => set('last_name', e.target.value)}
            error={errors.last_name} placeholder="Koroma" />
        </div>

        <Input id="username" label="Username" type="text" autoComplete="username"
          required value={fields.username}
          onChange={e => set('username', e.target.value)}
          error={errors.username} placeholder="ada_koroma"
          hint="Letters, numbers and underscores only." />

        <Input id="email" label="Email address" type="email" autoComplete="email"
          required value={fields.email}
          onChange={e => set('email', e.target.value)}
          error={errors.email} placeholder="ada@example.com" />

        <Input id="phone" label="Phone number" type="tel" autoComplete="tel"
          maxLength={20} error={errors.phone}
          value={fields.phone}
          onChange={e => set('phone', e.target.value)}
          placeholder="+232 76 000 000" />

        <Select id="role" label="Account type" required
          options={ROLE_OPTIONS} value={fields.role}
          onChange={e => set('role', e.target.value)}
          error={errors.role} />

        <Input id="password" label="Password" type="password" autoComplete="new-password"
          required value={fields.password}
          onChange={e => set('password', e.target.value)}
          error={errors.password} placeholder="••••••••"
          hint="At least 8 characters." />

        <Input id="password2" label="Confirm password" type="password" autoComplete="new-password"
          required value={fields.password2}
          onChange={e => set('password2', e.target.value)}
          error={errors.password2} placeholder="••••••••" />

        <div className={styles.terms}>
          <label className={styles.termsChoice}>
          <input type="checkbox" checked={fields.accept_terms}
            onChange={e => set('accept_terms', e.target.checked)} required
            aria-invalid={!!errors.accept_terms}
            aria-describedby={errors.accept_terms ? 'accept_terms-error' : undefined} />
          <span>I agree to the{' '}
          <Link to="/terms" className={styles.link}>Terms of Service</Link> and{' '}
          <Link to="/privacy" className={styles.link}>Privacy Policy</Link>.</span>
          </label>
          {errors.accept_terms && <p id="accept_terms-error" className={styles.termsError} role="alert">{errors.accept_terms}</p>}
        </div>

        {/* Animated register button */}
        <div className={styles.submitRow}>
          <Button variant="primary" type="submit" loading={loading} disabled={loading} className={styles.submit}>
            {loading ? 'Creating account...' : 'Create account'}
          </Button>
        </div>
      </form>
    </div>
  )
}
