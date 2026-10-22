import { useEffect, useReducer, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { apiPatch, apiPost } from '../../lib/api'
import FreelancerProfileForm from './FreelancerProfileForm'
import styles from './ProfileSetup.module.css'

const languages = [['en', 'English'], ['kri', 'Krio'], ['fr', 'French'], ['ar', 'Arabic'], ['pt', 'Portuguese'], ['es', 'Spanish']]
function reducer(state, action) {
  if (action.type === 'ready') return { status: 'ready', account: action.account, fields: action.account }
  if (action.type === 'field') return { ...state, fields: { ...state.fields, [action.key]: action.value } }
  if (action.type === 'cover') return { ...state, account: action.account, fields: { ...state.fields, cover_picture: action.account.cover_picture } }
  if (action.type === 'error') return { ...state, status: 'error', error: action.error }
  return state
}

function ProfessionalSettings({ account, onUpdated }) {
  return <>
    <div className={styles.sectionTitle}><h2>Professional profile</h2><p>Configure the details used in your marketplace work. Public freelancer information appears in the talent directory.</p></div>
    {account.freelancer_profile && (
      <FreelancerProfileForm
        profileId={account.freelancer_profile.id}
        onSaved={onUpdated}
      />
    )}
    {account.client_profile && <ProfessionalForm key={`client-${account.client_profile.id}`} kind="client" profile={account.client_profile} onUpdated={onUpdated} />}
    {!account.freelancer_profile && !account.client_profile && <p className={styles.note}>This administrative account has no marketplace professional profile. Personal details and security settings are available in the other tabs.</p>}
  </>
}

function ProfessionalForm({ kind, profile, onUpdated }) {
  const [fields, setFields] = useState(profile)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const freelancer = kind === 'freelancer'
  const inputs = freelancer ? [
    ['professional_title', 'Professional title', 'text'], ['skills', 'Skills (comma separated)', 'text'],
    ['hourly_rate', 'Hourly rate (NLe)', 'number'], ['website', 'Website', 'url'],
    ['experience', 'Experience', 'textarea'], ['education', 'Education', 'textarea'], ['portfolio', 'Portfolio', 'textarea'],
  ] : [['company_name', 'Company name', 'text'], ['website', 'Company website', 'url']]
  async function save(event) {
    event.preventDefault(); setBusy(true); setMessage('')
    try {
      const payload = Object.fromEntries(inputs.map(([key]) => [key, key === 'hourly_rate' && fields[key] === '' ? null : fields[key] ?? '']))
      if (freelancer) payload.availability = fields.availability
      await apiPatch(`${freelancer ? 'freelancers' : 'clients'}/${profile.id}/`, payload)
      await onUpdated()
      setMessage('Professional profile saved.')
    } catch (error) { setMessage(error.message) } finally { setBusy(false) }
  }
  return <form onSubmit={save} className={styles.professionalForm}>
    <h3>{freelancer ? 'Freelancer profile' : 'Client / company profile'}</h3>
    {freelancer && <p className={styles.note}>Complete your title, skills, and availability before offering services. Profile approval is managed by administrators.</p>}
    <div className={styles.grid}>{inputs.map(([key, label, type]) => <label className={type === 'textarea' ? styles.fullWidth : undefined} key={key}>{label}{type === 'textarea' ? <textarea rows={3} value={fields[key] ?? ''} onChange={event => setFields(previous => ({ ...previous, [key]: event.target.value }))} disabled={busy} /> : <input type={type} min={type === 'number' ? '0.01' : undefined} step={type === 'number' ? '0.01' : undefined} maxLength={key === 'skills' ? undefined : key === 'professional_title' || key === 'company_name' ? 100 : undefined} value={fields[key] ?? ''} onChange={event => setFields(previous => ({ ...previous, [key]: event.target.value }))} disabled={busy} />}</label>)}</div>
    {freelancer && <label className={styles.availability}><input type="checkbox" checked={Boolean(fields.availability)} onChange={event => setFields(previous => ({ ...previous, availability: event.target.checked }))} disabled={busy} /> Available for new work</label>}
    {message && <p className={styles.message} role="status">{message}</p>}
    <div className={styles.actions}><button type="button" disabled={busy} onClick={() => { setFields(profile); setMessage('') }}>Cancel</button><button className={styles.primary} disabled={busy}>{busy ? 'Saving…' : 'Save professional profile'}</button></div>
  </form>
}

export default function ProfileSetup() {
  const { refreshUser, logout } = useAuth()
  const navigate = useNavigate()
  const [state, dispatch] = useReducer(reducer, { status: 'loading' })
  const [attempt, retry] = useReducer(value => value + 1, 0)
  const [tab, setTab] = useState('personal')
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState({})
  const [token, setToken] = useState('')
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '', confirm: '' })

  useEffect(() => {
    let active = true
    refreshUser().then(account => { if (active) dispatch({ type: 'ready', account }) })
      .catch(error => { if (active) dispatch({ type: 'error', error: error.message }) })
    return () => { active = false }
  }, [refreshUser, attempt])
  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview) }
  }, [preview])

  function errorMessage(error) {
    setErrors(error.data ?? {})
    setMessage(error.message || 'Could not save your changes.')
  }
  function change(event) {
    dispatch({ type: 'field', key: event.target.name, value: event.target.value })
    setErrors(previous => ({ ...previous, [event.target.name]: null }))
  }
  function choosePhoto(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setErrors(previous => ({ ...previous, profile_picture: 'Choose a JPEG, PNG, or WebP image up to 5 MB.' }))
      event.target.value = ''
      return
    }
    setPhoto(file)
    setPreview(URL.createObjectURL(file))
    setErrors(previous => ({ ...previous, profile_picture: null }))
  }
  async function save(event) {
    event.preventDefault()
    setBusy(true); setMessage(''); setErrors({})
    try {
      const data = new FormData()
      for (const key of ['first_name', 'last_name', 'email', 'phone', 'location', 'preferred_language', 'biography']) data.append(key, state.fields[key] ?? '')
      if (photo) data.append('profile_picture', photo)
      await apiPatch('auth/me/', data)
      const account = await refreshUser()
      dispatch({ type: 'ready', account })
      setPhoto(null); setPreview('')
      setMessage(account.email_verified ? 'Profile updated.' : 'Profile saved. Verify your email to complete account setup.')
    } catch (error) { errorMessage(error) } finally { setBusy(false) }
  }
  async function verify(event) {
    event.preventDefault(); setBusy(true); setErrors({}); setMessage('')
    try {
      await apiPost('auth/verify-email/', { token: token.trim() })
      dispatch({ type: 'ready', account: await refreshUser() })
      setToken(''); setMessage('Your email address is verified.')
    } catch (error) { errorMessage(error) } finally { setBusy(false) }
  }
  async function resend() {
    setBusy(true); setErrors({}); setMessage('')
    try { await apiPost('auth/resend-verification/'); setMessage('Verification requested. Check your email for the verification token.') }
    catch (error) { errorMessage(error) } finally { setBusy(false) }
  }
  async function uploadCover(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setMessage('Choose a JPEG, PNG, or WebP cover up to 5 MB.'); return
    }
    setBusy(true); setMessage(''); setErrors({})
    try {
      const data = new FormData()
      data.append('cover_picture', file)
      await apiPatch('auth/me/', data)
      dispatch({ type: 'cover', account: await refreshUser() })
      setMessage('Cover photo updated.')
    } catch (error) { errorMessage(error) } finally { setBusy(false); event.target.value = '' }
  }
  async function changePassword(event) {
    event.preventDefault(); setErrors({}); setMessage('')
    if (passwords.new_password !== passwords.confirm) { setErrors({ confirm: 'Passwords do not match.' }); return }
    setBusy(true)
    try {
      await apiPost('auth/change-password/', { current_password: passwords.current_password, new_password: passwords.new_password })
      logout()
      navigate('/login', { replace: true, state: { passwordChanged: true } })
    } catch (error) { errorMessage(error) } finally { setBusy(false) }
  }
  if (state.status === 'loading') return <p className={styles.loading} role="status">Loading your profile…</p>
  if (state.status === 'error') return <div className={styles.loading} role="alert">{state.error} <button onClick={retry}>Try again</button></div>
  const { account, fields } = state
  const name = [account.first_name, account.last_name].filter(Boolean).join(' ') || account.username
  const role = account.is_admin ? 'Administrator' : account.role === 'both' ? 'Client & freelancer' : account.role === 'freelancer' ? 'Freelancer' : 'Client'
  const completion = ['first_name', 'last_name', 'email', 'phone', 'location', 'preferred_language', 'biography', 'profile_picture'].filter(key => Boolean(account[key])).length
  const errorFor = key => errors[key] && <span className={styles.fieldError} id={`${key}-error`}>{Array.isArray(errors[key]) ? errors[key].join(' ') : String(errors[key])}</span>
  function field(key, label, type = 'text', required = false) {
    return <label>{label}{required && <span className={styles.required}> *</span>}<input name={key} type={type} value={fields[key] ?? ''} onChange={change} required={required} disabled={busy} maxLength={key === 'phone' ? 20 : key === 'location' ? 100 : key.includes('name') ? 150 : 254} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `${key}-error` : undefined} />{errorFor(key)}</label>
  }
  const tabs = [['personal', 'My details'], ['professional', 'Professional profile'], ['security', 'Password'], ['email', 'Email verification'], ['status', 'Account']]
  return (
    <div className={styles.page}>
      <div className={styles.cover}>
        {account.cover_picture && <img src={account.cover_picture} className={styles.coverImage} alt="Profile cover" />}
        <label className={styles.coverUpload}>{busy ? 'Updating...' : 'Change cover'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadCover} disabled={busy} /></label>
        {!account.cover_picture && <span className={styles.coverPattern} aria-hidden="true" />}
      </div>
      <div className={styles.identity}>
        <div className={styles.photo}>{preview || account.profile_picture ? <img src={preview || account.profile_picture} alt={`${name}'s profile`} /> : <span aria-hidden="true">{name[0].toUpperCase()}</span>}</div>
        <div className={styles.identityText}><h1>Settings</h1><p>{account.email}</p><span>{role} &middot; {account.email_verified ? 'Email verified' : 'Email not verified'}</span></div>
        <div className={styles.identityAction}><strong>{name}</strong><span>{completion}/8 profile details complete</span></div>
      </div>
      <section className={styles.settings} aria-label="Account settings">
        <div className={styles.tabs} role="tablist" aria-label="Account settings">{tabs.map(([key, label], index) => <button id={`profile-tab-${key}`} role="tab" key={key} aria-controls={`profile-panel-${key}`} aria-selected={tab === key} tabIndex={tab === key ? 0 : -1} onClick={() => { setTab(key); setErrors({}); setMessage('') }} onKeyDown={event => {
          let next
          if (event.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length][0]
          if (event.key === 'ArrowLeft') next = tabs[(index + tabs.length - 1) % tabs.length][0]
          if (event.key === 'Home') next = tabs[0][0]
          if (event.key === 'End') next = tabs.at(-1)[0]
          if (next) { event.preventDefault(); setTab(next); event.currentTarget.parentElement.querySelector(`#profile-tab-${next}`).focus() }
        }}>{label}</button>)}</div>
        {message && <p className={styles.message} role="status">{message}</p>}
        <div className={styles.panel} role="tabpanel" id={`profile-panel-${tab}`} aria-labelledby={`profile-tab-${tab}`} tabIndex={0}>
          {tab === 'personal' && <form onSubmit={save}>
            <div className={styles.sectionTitle}><h2>Personal information</h2><p>Update your photo and the details people use to connect with you.</p></div>
            <div className={styles.photoRow}><div><strong>Your photo</strong><p>This appears on your profile.</p></div><div className={styles.photoSmall}>{preview || account.profile_picture ? <img src={preview || account.profile_picture} alt="Selected profile" /> : <span>{name[0]}</span>}</div><label className={styles.uploadArea}><span className={styles.uploadSymbol} aria-hidden="true">&#8593;</span><strong>Click to upload a photo</strong><small>JPEG, PNG or WebP, up to 5 MB</small><input type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} disabled={busy} /></label>{errorFor('profile_picture')}</div>
            <div className={styles.grid}>{field('first_name', 'First name', 'text', true)}{field('last_name', 'Last name', 'text', true)}{field('phone', 'Phone number', 'tel')}{field('email', 'Email address', 'email', true)}{field('location', 'Location', 'text', true)}<label>Preferred language<select name="preferred_language" value={fields.preferred_language} onChange={change} disabled={busy}>{languages.map(([code, language]) => <option key={code} value={code}>{language}</option>)}</select>{errorFor('preferred_language')}</label><label className={styles.fullWidth}>Biography<textarea name="biography" rows={5} maxLength={2000} value={fields.biography ?? ''} onChange={change} disabled={busy} placeholder="Introduce yourself and what you bring to a collaboration." />{errorFor('biography')}<small>{(fields.biography ?? '').length}/2000 characters</small></label></div>
            <p className={styles.note}>Changing your email resets verification. Language is saved as a preference.</p>
            <div className={styles.actions}><button type="button" onClick={() => { dispatch({ type: 'ready', account }); setPhoto(null); setPreview(''); setErrors({}) }} disabled={busy}>Cancel</button><button className={styles.primary} disabled={busy}>{busy ? 'Saving...' : 'Save changes'}</button></div>
          </form>}
          {tab === 'professional' && <ProfessionalSettings account={account} onUpdated={async () => { const updated = await refreshUser(); dispatch({ type: 'ready', account: updated }) }} />}
          {tab === 'email' && <><div className={styles.sectionTitle}><h2>Email verification</h2><p>{account.email_verified ? 'Your email address is verified.' : 'Enter the token from your verification email. In local development, emails appear in the Django terminal.'}</p></div><p className={styles.emailAddress}>{account.email}</p>{!account.email_verified && <form onSubmit={verify} className={styles.securityForm}><label>Verification token<input required value={token} onChange={event => setToken(event.target.value)} disabled={busy} autoComplete="off" /></label><div className={styles.actions}><button type="button" onClick={resend} disabled={busy}>Resend token</button><button className={styles.primary} disabled={busy}>Verify email</button></div></form>}</>}
          {tab === 'security' && <form onSubmit={changePassword} className={styles.passwordForm}>
            <div className={styles.sectionTitle}><h2>Password</h2><p>Please enter your current password to change your password.</p></div>
            {[['current_password', 'Current password'], ['new_password', 'New password'], ['confirm', 'Confirm new password']].map(([key, label]) => <div className={styles.settingRow} key={key}><label htmlFor={key}>{label}</label><div><input id={key} type="password" required minLength={key === 'current_password' ? undefined : 8} autoComplete={key === 'current_password' ? 'current-password' : 'new-password'} value={passwords[key]} onChange={event => setPasswords(previous => ({ ...previous, [key]: event.target.value }))} disabled={busy} />{key === 'new_password' && <small>Use at least 8 characters. Avoid common passwords and personal details.</small>}{errorFor(key)}</div></div>)}
            <p className={styles.note}>After changing your password, sign in again with your new password.</p><div className={styles.actions}><button type="button" disabled={busy} onClick={() => { setPasswords({ current_password: '', new_password: '', confirm: '' }); setErrors({}) }}>Cancel</button><button className={styles.primary} disabled={busy}>{busy ? 'Updating...' : 'Update password'}</button></div>
          </form>}
          {tab === 'status' && <><div className={styles.sectionTitle}><h2>Account information</h2><p>System-managed information about your account and access.</p></div><dl className={styles.accountDetails}>{[['Role', role], ['Account status', account.is_active ? 'Active' : 'Inactive'], ['Verification', account.email_verified ? 'Verified' : 'Not verified'], ['Registration date', new Date(account.date_joined).toLocaleString()], ['Username', account.username], ['Terms acceptance', account.terms_accepted_at ? new Date(account.terms_accepted_at).toLocaleString() : 'Not recorded']].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></>}
        </div>
      </section>
    </div>
  )
}
