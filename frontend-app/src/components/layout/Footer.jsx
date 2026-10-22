import { Link } from 'react-router-dom'
import styles from './Footer.module.css'

export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <span className={styles.logo}>FreelanceHub</span>
          <p className={styles.tagline}>Bringing talent and opportunity together.</p>
        </div>

        <nav className={styles.cols} aria-label="Footer navigation">
          <div className={styles.col}>
            <p className={styles.colHead}>Marketplace</p>
            <Link to="/services">Browse Services</Link>
            <Link to="/freelancers">Find Freelancers</Link>
            <Link to="/jobs">Job Board</Link>
          </div>
          <div className={styles.col}>
            <p className={styles.colHead}>Account</p>
            <Link to="/register">Get Started</Link>
            <Link to="/login">Sign In</Link>
          </div>
          <div className={styles.col}>
            <p className={styles.colHead}>Platform</p>
            <Link to="/about">About</Link>
            <Link to="/help">Help &amp; Support</Link>
          </div>
        </nav>
      </div>

      <div className={styles.bottom}>
        <p>© {year} FreelanceHub. All rights reserved.</p>
      </div>
    </footer>
  )
}
