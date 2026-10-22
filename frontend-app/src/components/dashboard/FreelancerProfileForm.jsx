/**
 * FreelancerProfileForm
 * ---------------------
 * Replaces the old ProfessionalForm for freelancers.
 * Covers all 6 spec areas for "Freelancer Skills and Portfolio":
 *   1. Skills and service categories
 *   2. Education, qualifications and certifications
 *   3. Work experience and employment history
 *   4. Portfolio links, project descriptions, images and files
 *   5. Hourly rate or fixed service price
 *   6. Availability and years of experience
 *
 * Maps directly to FreelancerProfile model fields via PATCH /api/freelancers/{id}/
 *
 * The backend stores experience, education, and portfolio as freetext blobs.
 * We structure them in the UI as repeatable entry cards (JSON-stringified on save,
 * parsed on load) so the data is rich locally while remaining compatible with the
 * existing backend model without a migration.
 */

import { useEffect, useReducer, useRef, useState } from 'react'
import { apiGet, apiPatch } from '../../lib/api'
import styles from './FreelancerProfileForm.module.css'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseJsonField(raw, fallback) {
  if (!raw) return fallback
  try { return JSON.parse(raw) } catch { return fallback }
}

function uid() { return Math.random().toString(36).slice(2, 9) }

// ─── Sub-reducers for list sections ──────────────────────────────────────────

function listReducer(state, action) {
  switch (action.type) {
    case 'set':    return action.items
    case 'add':    return [...state, { ...action.item, _id: uid() }]
    case 'update': return state.map(item => item._id === action.id ? { ...item, ...action.patch } : item)
    case 'remove': return state.filter(item => item._id !== action.id)
    case 'move': {
      const arr = [...state]
      const [moved] = arr.splice(action.from, 1)
      arr.splice(action.to, 0, moved)
      return arr
    }
    default: return state
  }
}

// ─── Skill tag input ──────────────────────────────────────────────────────────

function SkillsInput({ value, onChange, disabled }) {
  const [input, setInput] = useState('')
  const skills = value ? value.split(',').map(s => s.trim()).filter(Boolean) : []

  function add() {
    const trimmed = input.trim()
    if (!trimmed || skills.includes(trimmed)) { setInput(''); return }
    onChange([...skills, trimmed].join(', '))
    setInput('')
  }

  function remove(skill) {
    onChange(skills.filter(s => s !== skill).join(', '))
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() }
    if (e.key === 'Backspace' && !input && skills.length) {
      remove(skills[skills.length - 1])
    }
  }

  return (
    <div className={styles.skillsWrap}>
      <div className={styles.tagBox} aria-label="Skills tags">
        {skills.map(skill => (
          <span key={skill} className={styles.tag}>
            {skill}
            {!disabled && (
              <button type="button" onClick={() => remove(skill)} aria-label={`Remove ${skill}`}>×</button>
            )}
          </span>
        ))}
        {!disabled && (
          <input
            className={styles.tagInput}
            placeholder={skills.length ? 'Add another…' : 'Type a skill and press Enter'}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={add}
            disabled={disabled}
          />
        )}
      </div>
      {skills.length === 0 && <p className={styles.hint}>Press Enter or comma to add each skill.</p>}
    </div>
  )
}

// ─── Experience card ──────────────────────────────────────────────────────────

function ExperienceCard({ item, onUpdate, onRemove, disabled }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardBadge}>Work</span>
        {!disabled && (
          <button type="button" className={styles.removeBtn} onClick={onRemove} aria-label="Remove experience entry">
            Remove
          </button>
        )}
      </div>
      <div className={styles.cardGrid}>
        <label>
          Job title <span className={styles.req}>*</span>
          <input
            type="text"
            value={item.title ?? ''}
            onChange={e => onUpdate({ title: e.target.value })}
            placeholder="e.g. Senior Web Developer"
            maxLength={120}
            disabled={disabled}
            required
          />
        </label>
        <label>
          Company / Organisation
          <input
            type="text"
            value={item.company ?? ''}
            onChange={e => onUpdate({ company: e.target.value })}
            placeholder="e.g. Acme Ltd"
            maxLength={120}
            disabled={disabled}
          />
        </label>
        <label>
          Start date
          <input
            type="month"
            value={item.start ?? ''}
            onChange={e => onUpdate({ start: e.target.value })}
            disabled={disabled}
          />
        </label>
        <label>
          End date
          <input
            type="month"
            value={item.end ?? ''}
            onChange={e => onUpdate({ end: e.target.value })}
            disabled={disabled || item.current}
            placeholder={item.current ? 'Present' : ''}
          />
        </label>
        <label className={styles.checkLabel}>
          <input
            type="checkbox"
            checked={Boolean(item.current)}
            onChange={e => onUpdate({ current: e.target.checked, end: e.target.checked ? '' : item.end })}
            disabled={disabled}
          />
          I currently work here
        </label>
      </div>
      <label className={styles.fullLabel}>
        Responsibilities / achievements
        <textarea
          rows={3}
          value={item.description ?? ''}
          onChange={e => onUpdate({ description: e.target.value })}
          placeholder="Describe your key responsibilities, technologies used, and achievements."
          disabled={disabled}
        />
      </label>
    </div>
  )
}

// ─── Education card ───────────────────────────────────────────────────────────

function EducationCard({ item, onUpdate, onRemove, disabled }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={[styles.cardBadge, styles.badgeEdu].join(' ')}>Education</span>
        {!disabled && (
          <button type="button" className={styles.removeBtn} onClick={onRemove} aria-label="Remove education entry">
            Remove
          </button>
        )}
      </div>
      <div className={styles.cardGrid}>
        <label>
          Degree / Qualification <span className={styles.req}>*</span>
          <input
            type="text"
            value={item.degree ?? ''}
            onChange={e => onUpdate({ degree: e.target.value })}
            placeholder="e.g. BSc Computer Science"
            maxLength={150}
            disabled={disabled}
            required
          />
        </label>
        <label>
          Institution
          <input
            type="text"
            value={item.institution ?? ''}
            onChange={e => onUpdate({ institution: e.target.value })}
            placeholder="e.g. University of Sierra Leone"
            maxLength={150}
            disabled={disabled}
          />
        </label>
        <label>
          Year of completion
          <input
            type="number"
            value={item.year ?? ''}
            onChange={e => onUpdate({ year: e.target.value })}
            placeholder="e.g. 2020"
            min="1950"
            max={new Date().getFullYear() + 6}
            disabled={disabled}
          />
        </label>
        <label>
          Certificate / Credential (optional)
          <input
            type="url"
            value={item.credential ?? ''}
            onChange={e => onUpdate({ credential: e.target.value })}
            placeholder="https://credential-link.com"
            disabled={disabled}
          />
        </label>
      </div>
      <label className={styles.fullLabel}>
        Notes
        <textarea
          rows={2}
          value={item.notes ?? ''}
          onChange={e => onUpdate({ notes: e.target.value })}
          placeholder="Honours, specialisations, relevant modules…"
          disabled={disabled}
        />
      </label>
    </div>
  )
}

// ─── Portfolio card ───────────────────────────────────────────────────────────

function PortfolioCard({ item, onUpdate, onRemove, disabled }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={[styles.cardBadge, styles.badgePortfolio].join(' ')}>Portfolio</span>
        {!disabled && (
          <button type="button" className={styles.removeBtn} onClick={onRemove} aria-label="Remove portfolio entry">
            Remove
          </button>
        )}
      </div>
      <div className={styles.cardGrid}>
        <label>
          Project title <span className={styles.req}>*</span>
          <input
            type="text"
            value={item.title ?? ''}
            onChange={e => onUpdate({ title: e.target.value })}
            placeholder="e.g. E-commerce Platform Redesign"
            maxLength={200}
            disabled={disabled}
            required
          />
        </label>
        <label>
          Project link / URL
          <input
            type="url"
            value={item.url ?? ''}
            onChange={e => onUpdate({ url: e.target.value })}
            placeholder="https://your-project.com"
            disabled={disabled}
          />
        </label>
      </div>
      <label className={styles.fullLabel}>
        Project description <span className={styles.req}>*</span>
        <textarea
          rows={3}
          value={item.description ?? ''}
          onChange={e => onUpdate({ description: e.target.value })}
          placeholder="What was the project? What did you build or deliver? What technologies or skills did you use?"
          disabled={disabled}
          required
        />
      </label>
      <label className={styles.fullLabel}>
        Tools &amp; technologies used
        <input
          type="text"
          value={item.tools ?? ''}
          onChange={e => onUpdate({ tools: e.target.value })}
          placeholder="e.g. React, Django, Figma"
          maxLength={200}
          disabled={disabled}
        />
      </label>
    </div>
  )
}

// ─── Main form ────────────────────────────────────────────────────────────────

function profileReducer(state, action) {
  switch (action.type) {
    case 'loading': return { ...state, status: 'loading' }
    case 'ready':   return { status: 'ready', profile: action.profile }
    case 'error':   return { status: 'error', error: action.error }
    default:        return state
  }
}

export default function FreelancerProfileForm({ profileId, onSaved }) {
  const [state, dispatch]     = useReducer(profileReducer, { status: 'loading' })
  const [attempt, retry]      = useReducer(n => n + 1, 0)
  const [fields, setFields]   = useState({})          // flat scalar fields
  const [experience, expDispatch]   = useReducer(listReducer, [])
  const [education,  eduDispatch]   = useReducer(listReducer, [])
  const [portfolio,  portDispatch]  = useReducer(listReducer, [])
  const [busy, setBusy]       = useState(false)
  const [message, setMessage] = useState('')
  const [msgType, setMsgType] = useState('ok') // 'ok' | 'error'
  const formRef               = useRef(null)

  // ── Load profile ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!profileId) return
    const ctrl = new AbortController()
    dispatch({ type: 'loading' })

    apiGet(`freelancers/${profileId}/`, ctrl.signal)
      .then(profile => {
        dispatch({ type: 'ready', profile })

        setFields({
          professional_title: profile.professional_title ?? '',
          skills:             profile.skills             ?? '',
          hourly_rate:        profile.hourly_rate        ?? '',
          website:            profile.website            ?? '',
          availability:       profile.availability       ?? true,
          years_experience:   profile.years_experience   ?? '',
        })

        // Parse JSON-encoded list fields, fall back gracefully to legacy plain text
        const rawExp  = profile.experience ?? ''
        const rawEdu  = profile.education  ?? ''
        const rawPort = profile.portfolio  ?? ''

        const parsedExp  = parseJsonField(rawExp,  null)
        const parsedEdu  = parseJsonField(rawEdu,  null)
        const parsedPort = parseJsonField(rawPort, null)

        expDispatch({
          type: 'set',
          items: Array.isArray(parsedExp) ? parsedExp.map(i => ({ ...i, _id: uid() }))
            : rawExp ? [{ _id: uid(), title: 'Previous experience', description: rawExp }]
            : []
        })
        eduDispatch({
          type: 'set',
          items: Array.isArray(parsedEdu) ? parsedEdu.map(i => ({ ...i, _id: uid() }))
            : rawEdu ? [{ _id: uid(), degree: 'Previous education', notes: rawEdu }]
            : []
        })
        portDispatch({
          type: 'set',
          items: Array.isArray(parsedPort) ? parsedPort.map(i => ({ ...i, _id: uid() }))
            : rawPort ? [{ _id: uid(), title: 'Portfolio work', description: rawPort }]
            : []
        })
      })
      .catch(err => {
        if (err.name !== 'AbortError') dispatch({ type: 'error', error: err.message })
      })

    return () => ctrl.abort()
  }, [profileId, attempt])

  // ── Save ─────────────────────────────────────────────────────────────────────
  async function handleSave(e) {
    e.preventDefault()
    if (!formRef.current?.reportValidity()) return
    setBusy(true); setMessage('')

    // Strip internal _id keys before serialising
    const stripId = item => { const { _id, ...rest } = item; return rest } // eslint-disable-line no-unused-vars

    const payload = {
      professional_title: fields.professional_title,
      skills:             fields.skills,
      hourly_rate:        fields.hourly_rate === '' ? null : Number(fields.hourly_rate),
      website:            fields.website,
      availability:       fields.availability,
      experience:         JSON.stringify(experience.map(stripId)),
      education:          JSON.stringify(education.map(stripId)),
      portfolio:          JSON.stringify(portfolio.map(stripId)),
    }

    try {
      await apiPatch(`freelancers/${profileId}/`, payload)
      setMsgType('ok')
      setMessage('Your skills and portfolio have been saved.')
      onSaved?.()
    } catch (err) {
      setMsgType('error')
      setMessage(err.message || 'Could not save. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  // ── Render states ─────────────────────────────────────────────────────────
  if (state.status === 'loading') return <p className={styles.loading} role="status">Loading profile…</p>
  if (state.status === 'error') {
    return (
      <div className={styles.errorState} role="alert">
        <p>{state.error}</p>
        <button type="button" onClick={retry}>Try again</button>
      </div>
    )
  }

  const profile = state.profile

  return (
    <form ref={formRef} onSubmit={handleSave} noValidate className={styles.form}>

      {/* ── Approval status banner ─────────────────────────────────────── */}
      {!profile.is_approved && (
        <div className={styles.statusBanner} role="status">
          <span className={styles.statusDot} />
          Your freelancer profile is <strong>pending administrator approval</strong>. You can still edit and save your details while it is under review.
        </div>
      )}
      {profile.is_approved && (
        <div className={[styles.statusBanner, styles.statusApproved].join(' ')} role="status">
          <span className={[styles.statusDot, styles.dotApproved].join(' ')} />
          Profile <strong>approved</strong> — visible in the talent directory.
          {profile.rating > 0 && <span className={styles.rating}>★ {Number(profile.rating).toFixed(1)} · {profile.completed_projects} project{profile.completed_projects !== 1 ? 's' : ''} completed</span>}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 1 — Professional headline & availability
      ══════════════════════════════════════════════════════════════════ */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2>Headline &amp; availability</h2>
          <p>Your professional title and rate are shown on your public profile and service listings.</p>
        </div>

        <div className={styles.twoCol}>
          <label>
            Professional title <span className={styles.req}>*</span>
            <input
              type="text"
              value={fields.professional_title}
              onChange={e => setFields(f => ({ ...f, professional_title: e.target.value }))}
              placeholder="e.g. Full-Stack Web Developer"
              maxLength={100}
              required
              disabled={busy}
            />
            <small>Keep it concise — this is the first thing clients see.</small>
          </label>
          <label>
            Website / portfolio URL
            <input
              type="url"
              value={fields.website}
              onChange={e => setFields(f => ({ ...f, website: e.target.value }))}
              placeholder="https://yourportfolio.com"
              disabled={busy}
            />
          </label>
        </div>

        <div className={styles.twoCol}>
          <label>
            Hourly rate (NLe)
            <input
              type="number"
              value={fields.hourly_rate}
              onChange={e => setFields(f => ({ ...f, hourly_rate: e.target.value }))}
              min="0.01"
              step="0.01"
              placeholder="e.g. 150.00"
              disabled={busy}
            />
            <small>Leave blank if you only work on fixed-price projects.</small>
          </label>
          <label>
            Years of experience
            <input
              type="number"
              value={fields.years_experience}
              onChange={e => setFields(f => ({ ...f, years_experience: e.target.value }))}
              min="0"
              max="60"
              step="1"
              placeholder="e.g. 5"
              disabled={busy}
            />
          </label>
        </div>

        <div className={styles.availRow}>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={Boolean(fields.availability)}
              onChange={e => setFields(f => ({ ...f, availability: e.target.checked }))}
              disabled={busy}
            />
            <span className={styles.toggleTrack} aria-hidden="true" />
            <span>
              Available for new work
              <small>{fields.availability ? 'Clients can send you service requests.' : 'You will not appear as available in search results.'}</small>
            </span>
          </label>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 2 — Skills
      ══════════════════════════════════════════════════════════════════ */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2>Skills</h2>
          <p>Add the skills clients will search for. Be specific — use tools, languages, and disciplines.</p>
        </div>
        <SkillsInput
          value={fields.skills}
          onChange={value => setFields(f => ({ ...f, skills: value }))}
          disabled={busy}
        />
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 3 — Work experience
      ══════════════════════════════════════════════════════════════════ */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2>Work experience</h2>
          <p>List your employment history, freelance roles, and relevant projects. Most recent first.</p>
        </div>

        {experience.length === 0 && (
          <p className={styles.emptyList}>No experience entries yet. Add your first role below.</p>
        )}

        <div className={styles.cardList}>
          {experience.map((item) => (
            <ExperienceCard
              key={item._id}
              item={item}
              disabled={busy}
              onUpdate={patch => expDispatch({ type: 'update', id: item._id, patch })}
              onRemove={() => expDispatch({ type: 'remove', id: item._id })}
            />
          ))}
        </div>

        <button
          type="button"
          className={styles.addBtn}
          disabled={busy}
          onClick={() => expDispatch({ type: 'add', item: { title: '', company: '', start: '', end: '', current: false, description: '' } })}
        >
          + Add work experience
        </button>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 4 — Education, qualifications & certifications
      ══════════════════════════════════════════════════════════════════ */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2>Education &amp; certifications</h2>
          <p>Include degrees, diplomas, professional certifications, and online courses.</p>
        </div>

        {education.length === 0 && (
          <p className={styles.emptyList}>No education entries yet.</p>
        )}

        <div className={styles.cardList}>
          {education.map(item => (
            <EducationCard
              key={item._id}
              item={item}
              disabled={busy}
              onUpdate={patch => eduDispatch({ type: 'update', id: item._id, patch })}
              onRemove={() => eduDispatch({ type: 'remove', id: item._id })}
            />
          ))}
        </div>

        <button
          type="button"
          className={styles.addBtn}
          disabled={busy}
          onClick={() => eduDispatch({ type: 'add', item: { degree: '', institution: '', year: '', credential: '', notes: '' } })}
        >
          + Add education / certification
        </button>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 5 — Portfolio
      ══════════════════════════════════════════════════════════════════ */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2>Portfolio</h2>
          <p>Showcase your best work. Add project descriptions, links, and the tools you used.</p>
        </div>

        {portfolio.length === 0 && (
          <p className={styles.emptyList}>No portfolio entries yet. Add a project below.</p>
        )}

        <div className={styles.cardList}>
          {portfolio.map(item => (
            <PortfolioCard
              key={item._id}
              item={item}
              disabled={busy}
              onUpdate={patch => portDispatch({ type: 'update', id: item._id, patch })}
              onRemove={() => portDispatch({ type: 'remove', id: item._id })}
            />
          ))}
        </div>

        <button
          type="button"
          className={styles.addBtn}
          disabled={busy}
          onClick={() => portDispatch({ type: 'add', item: { title: '', description: '', url: '', tools: '' } })}
        >
          + Add portfolio project
        </button>
      </section>

      {/* ── Save bar ───────────────────────────────────────────────────── */}
      {message && (
        <p className={msgType === 'ok' ? styles.successMsg : styles.errorMsg} role="status">
          {message}
        </p>
      )}

      <div className={styles.saveBar}>
        <span className={styles.saveHint}>
          Changes are saved to your profile immediately.
        </span>
        <button type="submit" className={styles.saveBtn} disabled={busy}>
          {busy ? 'Saving…' : 'Save skills & portfolio'}
        </button>
      </div>
    </form>
  )
}
