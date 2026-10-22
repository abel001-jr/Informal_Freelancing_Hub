import { useEffect, useReducer } from 'react'
import { Link } from 'react-router-dom'
import { apiGet } from '../lib/api'

function reducer(state, action) {
  if (action.type === 'loading') return { ...state, status: 'loading' }
  if (action.type === 'ready') return { status: 'ready', items: action.items }
  if (action.type === 'error') return { status: 'error', items: [] }
  return state
}

export default function MarketplacePreview({ kind }) {
  const services = kind === 'services'
  const endpoint = services ? 'services/' : 'freelancers/'
  const [state, dispatch] = useReducer(reducer, { status: 'loading', items: [] })
  const [attempt, retry] = useReducer(value => value + 1, 0)

  useEffect(() => {
    const controller = new AbortController()
    dispatch({ type: 'loading' })
    apiGet(endpoint, controller.signal)
      .then(data => dispatch({ type: 'ready', items: (data.results ?? data).slice(0, 3) }))
      .catch(error => {
        if (error.name !== 'AbortError') dispatch({ type: 'error' })
      })
    return () => controller.abort()
  }, [endpoint, attempt])

  return (
    <section className="section marketplace-preview" id={services ? 'available-services' : 'meet-freelancers'}
      aria-labelledby={`${kind}-preview-title`}>
      <div className="section-top">
        <div>
          <p className="eyebrow">{services ? 'FIND YOUR NEXT COLLABORATION' : 'PEOPLE BEHIND THE POSSIBILITIES'}</p>
          <h2 id={`${kind}-preview-title`}>{services ? 'Services ready for your next idea.' : 'Meet your next creative partner.'}</h2>
        </div>
        <Link className="light-button directory-link" to={`/${kind}`}>
          {services ? 'Browse all services' : 'Browse all freelancers'} <span aria-hidden="true">↗</span>
        </Link>
      </div>
      <div aria-live="polite" aria-busy={state.status === 'loading'}>
        {state.status === 'loading' && <p className="preview-message">Loading {kind}…</p>}
        {state.status === 'error' && (
          <div className="preview-message">We couldn’t load {kind}. <button type="button" onClick={retry}>Try again</button></div>
        )}
        {state.status === 'ready' && !state.items.length && (
          <p className="preview-message">{services ? 'New services will appear here as they are published.' : 'Freelancer profiles will appear here when available.'}</p>
        )}
        {state.status === 'ready' && state.items.length > 0 && (
          <div className="preview-grid">
            {state.items.map(item => services ? <ServiceCard key={item.id} service={item} /> : <FreelancerCard key={item.id} profile={item} />)}
          </div>
        )}
      </div>
    </section>
  )
}

function ServiceCard({ service }) {
  return (
    <article className="preview-card service-preview-card">
      <div className="preview-image">
        <span className="preview-image-mark" aria-hidden="true">✦</span>
        {service.image && <img src={service.image} alt="" loading="lazy" onError={event => { event.currentTarget.hidden = true }} />}
      </div>
      <div className="preview-card-body">
        <p className="eyebrow">{service.category?.name ?? 'Service'}</p>
        <h3>{service.title}</h3>
        <p className="preview-description">{service.description}</p>
        <div className="preview-card-meta"><strong>NLe {Number(service.price).toLocaleString()}</strong><span>{service.delivery_days}d delivery</span></div>
        <Link className="preview-card-link" to={`/services?q=${encodeURIComponent(service.title)}`}>Explore service <span aria-hidden="true">↗</span></Link>
      </div>
    </article>
  )
}

function FreelancerCard({ profile }) {
  const user = profile.user ?? {}
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || 'Freelancer'
  return (
    <article className="preview-card talent-preview-card">
      <div className="preview-person"><span className="preview-avatar" aria-hidden="true">{name[0].toUpperCase()}</span><div><h3>{name}</h3><p>{profile.professional_title || 'Independent professional'}</p></div></div>
      <p className="preview-description">{profile.biography || 'Explore this freelancer’s skills in the talent directory.'}</p>
      <div className="preview-skills">{(profile.skills ?? '').split(',').map(skill => skill.trim()).filter(Boolean).slice(0, 3).map((skill, index) => <span key={`${skill}-${index}`}>{skill}</span>)}</div>
      <div className="preview-card-meta"><span>{Number(profile.rating) > 0 ? `★ ${Number(profile.rating).toFixed(1)} rating` : 'Not yet rated'}</span><span>{profile.availability ? 'Available' : 'Currently busy'}</span></div>
      <Link className="preview-card-link" to="/freelancers">Explore freelancers <span aria-hidden="true">↗</span></Link>
    </article>
  )
}
