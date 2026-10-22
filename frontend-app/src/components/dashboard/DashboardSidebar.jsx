import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import styles from './Dashboard.module.css'

// ─── SVG icons ────────────────────────────────────────────────────────────────
function ChevronIcon({ open }) {
  return (
    <svg
      className={[styles.chevronIcon, open ? styles.chevronOpen : ''].join(' ')}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  )
}

// ─── Build nav tree from flat items list ─────────────────────────────────────
// Items with the same group get collected under that group.
// Items whose key starts with a group prefix (e.g. "hiring-") become children
// of a parent item when a parent with matching key exists.
function buildTree(items) {
  // Group items by their `group` field
  const groups = []
  const seen = new Set()

  for (const item of items) {
    const g = item.group ?? 'Main'
    if (!seen.has(g)) { seen.add(g); groups.push({ group: g, items: [] }) }
    groups.find(gr => gr.group === g).items.push(item)
  }
  return groups
}

// ─── Single nav item (leaf or expandable parent) ─────────────────────────────
function NavItem({ item, active, onSelect, depth = 0 }) {
  const hasChildren = item.children?.length > 0
  const isActive    = active === item.key
  const childActive = hasChildren && item.children.some(c => c.key === active)

  // Start expanded if a child is active
  const [expanded, setExpanded] = useState(childActive)

  // Sync expansion when active changes from outside
  useEffect(() => {
    if (childActive) setExpanded(true)
  }, [childActive])

  if (hasChildren) {
    return (
      <div className={styles.navGroup2}>
        {/* Parent button — expands/collapses */}
        <button
          type="button"
          className={[
            styles.navBtn,
            depth > 0 ? styles.navBtnSub : '',
            childActive ? styles.navBtnParentActive : '',
          ].filter(Boolean).join(' ')}
          aria-expanded={expanded}
          onClick={() => setExpanded(e => !e)}
        >
          {item.icon && (
            <span className={styles.navIcon} aria-hidden="true">{item.icon}</span>
          )}
          <span className={styles.navText}>{item.label}</span>
          {item.count > 0 && <b className={styles.navBadge}>{item.count}</b>}
          <ChevronIcon open={expanded} />
        </button>

        {/* Children — animated slide */}
        {expanded && (
          <div className={styles.navChildren}>
            {item.children.map(child => (
              <NavItem key={child.key} item={child} active={active} onSelect={onSelect} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  // Leaf item
  return (
    <button
      type="button"
      className={[
        styles.navBtn,
        depth > 0 ? styles.navBtnSub : '',
        isActive ? styles.navBtnActive : '',
      ].filter(Boolean).join(' ')}
      aria-current={isActive ? 'page' : undefined}
      onClick={() => onSelect(item.key)}
    >
      {item.icon && (
        <span className={styles.navIcon} aria-hidden="true">{item.icon}</span>
      )}
      <span className={styles.navText}>{item.label}</span>
      {item.count > 0 && <b className={styles.navBadge}>{item.count}</b>}
      <ChevronIcon open={false} />
    </button>
  )
}

// ─── Main sidebar ─────────────────────────────────────────────────────────────
export default function DashboardSidebar({ id, role, items, active, onSelect, open, extra }) {
  const { user, logout } = useAuth()
  const navigate  = useNavigate()
  const scrollRef = useRef(null)

  // Scroll active item into view
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const reveal = () => {
      const sel = el.querySelector('[aria-current="page"]')
      if (!sel) return
      const area = el.getBoundingClientRect()
      const item = sel.getBoundingClientRect()
      if (item.top < area.top + 12)        el.scrollTop += item.top  - area.top  - 12
      else if (item.bottom > area.bottom - 12) el.scrollTop += item.bottom - area.bottom + 12
    }
    const frame    = requestAnimationFrame(reveal)
    const observer = new ResizeObserver(reveal)
    observer.observe(el)
    return () => { cancelAnimationFrame(frame); observer.disconnect() }
  }, [active, open])

  const tree = buildTree(items.filter(i => i.key !== 'account-profile'))

  return (
    <aside
      id={id}
      className={styles.sidebar}
      data-open={open}
      aria-label={`${role} sidebar`}
    >
      {/* ── Brand header ─────────────────────────────────────────────── */}
      <header className={styles.sidebarHeader}>
        <Link to="/" className={styles.brand}>
          <span aria-hidden="true">fh.</span>
          FreelanceHub
        </Link>
        <span className={styles.workspaceLabel}>{role.toUpperCase()} WORKSPACE</span>
      </header>

      {/* ── Scrollable nav ───────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className={styles.sidebarScroll}
        tabIndex={0}
        role="region"
        aria-label="Scrollable workspace navigation"
      >
        <nav aria-label={`${role} workspace navigation`}>
          {tree.map(({ group, items: groupItems }) => (
            <div key={group} className={styles.navSection}>
              {/* Section label — only show if there are multiple groups */}
              {tree.length > 1 && (
                <p className={styles.navGroupLabel}>{group}</p>
              )}
              <div className={styles.navSectionItems}>
                {groupItems.map(item => (
                  <NavItem
                    key={item.key}
                    item={item}
                    active={active}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Bottom links ───────────────────────────────────────────── */}
        <div className={styles.sidebarBottom}>
          <button type="button" onClick={() => onSelect('marketplace-services')}>
            Visit marketplace <span aria-hidden="true">↗</span>
          </button>
          {role === 'Admin' && (
            <a href="/django-admin/">
              Django admin <span aria-hidden="true">↗</span>
            </a>
          )}
          {user?.role === 'both' && role !== 'Admin' && (
            <Link to={role === 'Client' ? '/dashboard/freelancer' : '/dashboard/client'}>
              Switch to {role === 'Client' ? 'freelancer' : 'client'} <span aria-hidden="true">↗</span>
            </Link>
          )}
          {user?.role === 'admin' && role !== 'Admin' && (
            <Link to="/dashboard/admin">
              Admin workspace <span aria-hidden="true">↗</span>
            </Link>
          )}
        </div>
      </div>

      {/* ── Footer (profile + logout) ────────────────────────────────── */}
      <footer className={styles.sidebarFooter}>
        {extra && <div className={styles.sidebarExtra}>{extra}</div>}

        <div className={styles.footerActions}>
          {/* Profile & settings */}
          <button
            type="button"
            className={[
              styles.footerBtn,
              active === 'account-profile' ? styles.footerBtnActive : '',
            ].filter(Boolean).join(' ')}
            aria-current={active === 'account-profile' ? 'page' : undefined}
            onClick={() => onSelect('account-profile')}
          >
            <span className={styles.footerBtnIcon}><SettingsIcon /></span>
            <span>Profile &amp; settings</span>
          </button>

          {/* Sign out */}
          <button
            type="button"
            className={[styles.footerBtn, styles.footerBtnLogout].join(' ')}
            onClick={() => { logout(); navigate('/login') }}
          >
            <span className={styles.footerBtnIcon}><LogoutIcon /></span>
            <span>Sign out</span>
          </button>
        </div>

        {/* Account chip */}
        <div className={styles.account}>
          <span aria-hidden="true">
            {user?.photo
              ? <img src={user.photo} alt="" />
              : (user?.firstName || user?.username || role)[0].toUpperCase()
            }
          </span>
          <div>
            <strong>{user?.firstName || user?.username || role}</strong>
            <small>{role === 'Admin' ? 'System administrator' : `${role} account`}</small>
          </div>
          <i />
        </div>
      </footer>
    </aside>
  )
}
