import { useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import styles from './Navbar.module.css'

export default function Navbar() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const toggle = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (!location.hash) return
    const frame = requestAnimationFrame(() => {
      document.getElementById(location.hash.slice(1))?.scrollIntoView()
    })
    return () => cancelAnimationFrame(frame)
  }, [location.pathname, location.hash])

  function close() { setOpen(false) }
  function signOut() { logout(); close(); navigate('/') }
  function escape(event) {
    if (event.key === 'Escape' && open) {
      close()
      toggle.current?.focus()
    }
  }

  return (
    <header className={styles.header} onKeyDown={escape}>
      <Link to="/" className={styles.brand} aria-label="FreelanceHub home" onClick={close}>
        <span className={styles.mark}>f<span>h</span></span>
        freelance<span className={styles.light}>hub</span><span className={styles.dot}>.</span>
      </Link>
      <button ref={toggle} type="button" className={styles.menuToggle}
        aria-expanded={open} aria-controls={menuId} onClick={() => setOpen(value => !value)}>
        {open ? 'Close' : 'Menu'} <span aria-hidden="true">?</span>
      </button>
      <nav id={menuId} className={styles.navigation} data-open={open} aria-label="Main navigation">
        <NavLink to="/services" onClick={close}>Services</NavLink>
        <NavLink to="/freelancers" onClick={close}>Freelancers</NavLink>
        <Link to="/#how-it-works" onClick={close}>How it works</Link>
        <Link to="/#freelancers" onClick={close}>For freelancers</Link>
        <Link className={styles.mobileAccount} to={user ? '/dashboard' : '/register'} onClick={close}>
          {user ? 'My workspace' : 'Create account'}
        </Link>
        {user && <button type="button" className={styles.mobileAccount} onClick={signOut}>Sign out</button>}
      </nav>
      <div className={styles.actions}>
        {user ? <button type="button" className={styles.textAction} onClick={signOut}>Sign out</button>
          : <Link className={styles.textAction} to="/login" onClick={close}>Sign in</Link>}
        <Link className={styles.cta} to={user ? '/dashboard' : '/register'} onClick={close}>
          {user ? 'My workspace' : 'Get started'}
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
        </Link>
      </div>
    </header>
  )
}
