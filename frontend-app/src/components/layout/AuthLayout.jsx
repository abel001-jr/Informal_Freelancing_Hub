import { Link, Outlet, useLocation } from 'react-router-dom'
import styles from './AuthLayout.module.css'

export default function AuthLayout() {
  const registration = useLocation().pathname === '/register'
  return (
    <div className={styles.root}>
      <div className={styles.card} data-page={registration ? 'register' : 'login'}>
      {/* Branding panel */}
      <div className={styles.brand}>
        <div className={styles.brandInner}>
          <Link to="/" className={styles.logo}>FreelanceHub</Link>
          <p className={styles.welcome}>{registration ? 'YOUR NEXT CHAPTER' : 'WELCOME BACK'}</p>
          <p className={styles.headline}>{registration ? 'A little talent.\nA lot of possibility.' : 'Good work starts\nwith the right people.'}</p>
          <p className={styles.sub}>
            Connect with skilled freelancers or find your next great project — all in one place.
          </p>
          <span className={styles.brandFootnote}>Independent people. Extraordinary possibilities.</span>
        </div>
      </div>

      {/* Form panel */}
      <main className={styles.formPanel} id="main-content">
        <div className={styles.formInner}>
          <Link to="/" className={styles.backLink}>Back to FreelanceHub</Link>
          <Outlet />
        </div>
      </main>
      </div>
    </div>
  )
}
