import { useId, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import DashboardSidebar from './DashboardSidebar'
import ServicesPage from '../../pages/ServicesPage'
import FreelancersPage from '../../pages/FreelancersPage'
import ProfileSetup from './ProfileSetup'
import styles from './Dashboard.module.css'

export default function DashboardShell({ role, items, active, onSelect, title, toolbar, sidebarExtra, overlay, children }) {
  const [open, setOpen] = useState(false)
  const sidebarId = useId()
  const toggle = useRef(null)
  const [params, setParams] = useSearchParams()
  const view = ['services', 'freelancers', 'profile'].includes(params.get('view')) ? params.get('view') : null
  const navigationItems = [...items,
    { key: 'marketplace-services', label: 'Browse services', icon: '⊞', group: 'Marketplace' },
    { key: 'marketplace-freelancers', label: 'Browse freelancers', icon: '♧', group: 'Marketplace' },
    { key: 'account-profile', label: 'Profile & settings', icon: '◎', group: 'Account' },
  ]
  function select(key) {
    if (key === 'account-profile') {
      setParams({ section: active, view: 'profile' })
    } else if (key.startsWith('marketplace-')) {
      setParams({ section: active, view: key.slice('marketplace-'.length) })
    } else {
      onSelect(key)
    }
    close()
  }
  function close() { setOpen(false) }
  return (
    <div className={styles.shell} onKeyDown={event => {
      if (event.key === 'Escape' && open) { close(); toggle.current?.focus() }
    }}>
      {open && <button className={styles.sidebarBackdrop} aria-label="Close sidebar" onClick={close} />}
      <DashboardSidebar id={sidebarId} role={role} items={navigationItems} active={view === 'profile' ? 'account-profile' : view ? `marketplace-${view}` : active} open={open}
        onSelect={select} extra={sidebarExtra} />
      <div className={styles.main}>
        <header className={styles.topbar}>
          <button ref={toggle} className={styles.menuButton} type="button" aria-controls={sidebarId}
            aria-expanded={open} onClick={() => setOpen(value => !value)}>{open ? 'Close menu' : 'Menu'}</button>
          <span>{role} workspace <span className={styles.slash}>/</span><strong>{view === 'profile' ? 'Profile & settings' : view ? `Browse ${view}` : title}</strong></span>
          <div>{toolbar}</div>
        </header>
        {view ? <main id="main-content" className={styles.marketplaceContent}>
          {view !== 'profile' && <button className={styles.returnButton} type="button" onClick={() => setParams({ section: active })}>← Back to {title.toLowerCase()}</button>}
          {view === 'profile' ? <ProfileSetup /> : view === 'services' ? <ServicesPage /> : <FreelancersPage />}
        </main> : children}
      </div>
      {overlay}
    </div>
  )
}
