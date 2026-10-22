import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import './LandingPage.css'
import MarketplacePreview from '../components/MarketplacePreview'
import Navbar from '../components/layout/Navbar'

export default function HomePage() {
  const { user } = useAuth()
  const [filter, setFilter] = useState('all')

  function handleTabKey(event, current) {
    const filters = ['all', 'creative', 'business']
    const index = filters.indexOf(current)
    let next
    if (event.key === 'ArrowRight') next = filters[(index + 1) % filters.length]
    if (event.key === 'ArrowLeft') next = filters[(index + filters.length - 1) % filters.length]
    if (event.key === 'Home') next = filters[0]
    if (event.key === 'End') next = filters.at(-1)
    if (next) {
      event.preventDefault()
      setFilter(next)
      event.currentTarget.parentElement.querySelector(`#tab-${next}`).focus()
    }
  }

  return (
<div className="marketplace-landing">
<svg className="icon-library" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <symbol id="arrow" viewBox="0 0 24 24"><path d="M5 12h14m-6-6 6 6-6 6"/></symbol>
    <symbol id="spark" viewBox="0 0 24 24"><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/></symbol>
    <symbol id="code" viewBox="0 0 24 24"><path d="m8 7-5 5 5 5m8-10 5 5-5 5M14 4l-4 16"/></symbol>
    <symbol id="pen" viewBox="0 0 24 24"><path d="m16 3 5 5-12 12-6 1 1-6L16 3Zm-3 3 5 5M4 15l5 5"/></symbol>
    <symbol id="check" viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></symbol>
    <symbol id="grid" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></symbol>
    <symbol id="chat" viewBox="0 0 24 24"><path d="M21 11a9 9 0 0 1-9 9H4l-2 2V11a9 9 0 0 1 19 0ZM7 9h10M7 13h6"/></symbol>
    <symbol id="briefcase" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V3h8v4M3 12c5 4 13 4 18 0M10 13h4"/></symbol>
    <symbol id="chart" viewBox="0 0 24 24"><path d="M4 3v18h17M8 16v-4m5 4V8m5 8V5"/></symbol>
    <symbol id="video" viewBox="0 0 24 24"><rect x="3" y="5" width="13" height="14" rx="2"/><path d="m16 10 5-4v12l-5-4"/></symbol>
    <symbol id="document" viewBox="0 0 24 24"><path d="M14 3H5v18h14V8l-5-5Zm0 0v5h5M8 12h8m-8 4h5"/></symbol>
  </svg>
  <div className="site-shell">
    <Navbar />

    <main id="main-content">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-lines" aria-hidden="true"></div>
        <div className="hero-content">
          <div className="intro-pill"><span className="tiny-star">✦</span> Independent talent. Real possibilities.</div>
          <h1 id="hero-title">Your next big idea.<br /><span>The right hands to build it.</span></h1>
          <p className="hero-description">Find skilled freelancers for the work that matters.<br className="desktop-break" /> From a fresh identity to your first website, start something good.</p>
          <div className="hero-actions"><Link className="slide-button" to="/services">Find your service <svg className="icon"><use href="#arrow"/></svg></Link><a className="light-button" href="#freelancers">Offer your skills <span>↗</span></a></div>
          <div className="hero-assurances"><span><svg className="icon"><use href="#check"/></svg> Clear project scopes</span><span><svg className="icon"><use href="#check"/></svg> Direct conversations</span><span><svg className="icon"><use href="#check"/></svg> Work on your terms</span></div>
        </div>


      </section>

      <div className="expertise-strip"><p>GOOD PEOPLE. A WORLD OF POSSIBILITIES.</p><div><span>Design & creative</span><i>✦</i><span>Web & technology</span><i>✦</i><span>Words & stories</span><i>✦</i><span>Marketing & growth</span><i>✦</i><span>Business support</span></div></div>

      <MarketplacePreview kind="services" />
      <MarketplacePreview kind="freelancers" />

      <section className="section steps-section" id="how-it-works" aria-labelledby="steps-title">
        <div className="section-top"><div><p className="eyebrow">A SIMPLE WAY TO START</p><h2 id="steps-title">Less searching.<br />More making things happen.</h2></div><p>Good work starts with a little clarity. Find your person, talk through the details, and give your idea room to grow.</p></div>
        <div className="steps"><article><span className="step-number">01</span><h3>Find your kind of talent</h3><p>Explore services by skill. Look through portfolios and find an approach that feels right for your project.</p><a href="#services">Explore the possibilities <span>↗</span></a></article><article><span className="step-number">02</span><h3>Make a plan, together</h3><p>Start a conversation. Agree on the scope, timeline, and deliverables before the work begins.</p><span className="step-detail">A shared vision from day one</span></article><article><span className="step-number">03</span><h3>Watch your idea take shape</h3><p>Stay in touch, review the work, and bring your feedback. Build something you’re proud to put out there.</p><span className="step-detail">From a first draft to a fresh start</span></article></div>
      </section>

      <section className="workflow-section" aria-labelledby="workflow-title"><div className="section workflow-grid">
        <div><p className="eyebrow">ROOM TO DO YOUR BEST WORK</p><h2 id="workflow-title">The big picture.<br />And all the little details.</h2><p className="section-description">A shared space for the conversations, decisions, and small wins that move a project forward.</p><div className="feature-list"><div><span className="feature-symbol"><svg className="icon"><use href="#chat"/></svg></span><div><h3>Keep the conversation flowing</h3><p>Talk through ideas and keep your project discussions together.</p></div></div><div><span className="feature-symbol"><svg className="icon"><use href="#briefcase"/></svg></span><div><h3>Know what comes next</h3><p>Set expectations with a clear scope and agreed milestones.</p></div></div><div><span className="feature-symbol"><svg className="icon"><use href="#check"/></svg></span><div><h3>Make space for the finishing touches</h3><p>Review deliverables and share feedback along the way.</p></div></div></div></div>
        <div className="milestone-card"><div className="card-label"><span className="small-square"><svg className="icon"><use href="#pen"/></svg></span><span>PROJECT OVERVIEW</span><span className="ellipsis">···</span></div><h3>A brand with a story</h3><p>A fresh identity for a new beginning.</p><div className="milestone-meta"><div className="avatar-stack"><span className="avatar avatar-tan">JD</span><span className="avatar avatar-mauve">AM</span></div><span>You + your creative partner</span></div><div className="progress-label"><strong>The journey so far</strong><span>2 of 3 milestones</span></div><div className="progress-track"><i></i></div><div className="milestone complete"><span>✓</span><div><strong>Discover & define</strong><small>Direction, moodboard, and a shared vision</small></div><b>Done</b></div><div className="milestone complete"><span>✓</span><div><strong>Explore & create</strong><small>Logo concepts and visual language</small></div><b>Done</b></div><div className="milestone"><span>3</span><div><strong>Refine & deliver</strong><small>The details that make it yours</small></div><b>Up next</b></div><div className="card-footnote"><span className="live-dot"></span>Illustrative workspace · sample project</div></div>
      </div></section>

      <section className="section services-section" id="services" aria-labelledby="services-title"><div className="section-top"><div><p className="eyebrow">A SKILL FOR EVERY NEXT STEP</p><h2 id="services-title">Whatever you’re building,<br />start with the right people.</h2></div><p>From the first spark to the final detail, explore the skills that can help bring your project to life.</p></div>
        <div className="category-tabs" role="tablist" aria-label="Service collections"><button role="tab" id="tab-all" aria-controls="category-panel" aria-selected={filter === 'all'} tabIndex={filter === 'all' ? 0 : -1} onClick={() => setFilter('all')} onKeyDown={event => handleTabKey(event, 'all')}>All services</button><button role="tab" id="tab-creative" aria-controls="category-panel" aria-selected={filter === 'creative'} tabIndex={filter === 'creative' ? 0 : -1} onClick={() => setFilter('creative')} onKeyDown={event => handleTabKey(event, 'creative')}>Creative</button><button role="tab" id="tab-business" aria-controls="category-panel" aria-selected={filter === 'business'} tabIndex={filter === 'business' ? 0 : -1} onClick={() => setFilter('business')} onKeyDown={event => handleTabKey(event, 'business')}>Business & tech</button></div>
        <div className="category-grid" role="tabpanel" id="category-panel" aria-labelledby={`tab-${filter}`} tabIndex="0">
          <Link className="category-card" to="/services?q=design" data-category="creative" hidden={filter !== 'all' && filter !== 'creative'}><span className="category-icon"><svg className="icon"><use href="#pen"/></svg></span><span className="category-arrow">↗</span><h3>Design & branding</h3><p>Give your business a look that feels like you.</p><span className="category-tags">Logos · Brand identity · Illustration</span></Link>
          <Link className="category-card" to="/services?q=website" data-category="business" hidden={filter !== 'all' && filter !== 'business'}><span className="category-icon sand"><svg className="icon"><use href="#code"/></svg></span><span className="category-arrow">↗</span><h3>Web & development</h3><p>Build a digital home for your next big idea.</p><span className="category-tags">Websites · Apps · Online stores</span></Link>
          <Link className="category-card" to="/services?q=writing" data-category="creative" hidden={filter !== 'all' && filter !== 'creative'}><span className="category-icon"><svg className="icon"><use href="#document"/></svg></span><span className="category-arrow">↗</span><h3>Writing & translation</h3><p>Find the words that make people listen.</p><span className="category-tags">Copywriting · Content · Translation</span></Link>
          <Link className="category-card" to="/services?q=marketing" data-category="business" hidden={filter !== 'all' && filter !== 'business'}><span className="category-icon sand"><svg className="icon"><use href="#chart"/></svg></span><span className="category-arrow">↗</span><h3>Marketing & growth</h3><p>Help your work reach the right audience.</p><span className="category-tags">Social media · SEO · Campaigns</span></Link>
          <Link className="category-card" to="/services?q=video" data-category="creative" hidden={filter !== 'all' && filter !== 'creative'}><span className="category-icon sand"><svg className="icon"><use href="#video"/></svg></span><span className="category-arrow">↗</span><h3>Video & animation</h3><p>Turn a story into something worth watching.</p><span className="category-tags">Editing · Motion design · Animation</span></Link>
          <Link className="category-card" to="/services?q=business" data-category="business" hidden={filter !== 'all' && filter !== 'business'}><span className="category-icon"><svg className="icon"><use href="#briefcase"/></svg></span><span className="category-arrow">↗</span><h3>Business support</h3><p>A helping hand for the everyday essentials.</p><span className="category-tags">Admin · Research · Virtual assistance</span></Link>
        </div>
      </section>

      <section className="freelancer-section" id="freelancers"><div className="section freelancer-grid"><div className="freelancer-art" aria-hidden="true"><span className="orbit orbit-one"></span><span className="orbit orbit-two"></span><span className="orbit orbit-three"></span><span className="art-star">✦</span><div className="talent-card"><div className="talent-avatar">AM<span>✦</span></div><h3>Your name. Your craft.</h3><p>Independent creative</p><div className="skill-pills"><span>Brand design</span><span>Illustration</span></div><div className="talent-line"></div><span className="talent-footer"><span className="live-dot"></span> Ready for a new chapter</span></div><div className="art-sticker">Made by you.<br /><strong>Needed by someone.</strong></div></div><div><p className="eyebrow">FOR THE INDEPENDENT SPIRIT</p><h2>Do what you’re good at.<br />Make it your next chapter.</h2><p className="section-description">Your skills deserve a place to shine. Turn what you love doing into a service, show your work, and start your next conversation.</p><ul className="freelancer-checks"><li><svg className="icon"><use href="#check"/></svg> Create a profile that tells your story</li><li><svg className="icon"><use href="#check"/></svg> Build services around your strengths</li><li><svg className="icon"><use href="#check"/></svg> Connect with people who need your craft</li></ul><Link className="slide-button" to={user ? "/dashboard" : "/register"}>Make your next move <svg className="icon"><use href="#arrow"/></svg></Link></div></div></section>

      <section className="section faq-section" aria-labelledby="faq-title"><div><p className="eyebrow">A LITTLE MORE CLARITY</p><h2 id="faq-title">Good questions.<br />Simple answers.</h2><p className="section-description">A few things to know before<br />you start something new.</p></div><div className="faq-list"><details open><summary>What kind of work can I find here?<span>+</span></summary><p>This concept brings creative, technical, and business services together: from brand design and websites to writing, marketing, and everyday support.</p></details><details><summary>How do I choose the right freelancer?<span>+</span></summary><p>Look for relevant portfolio work, read the service scope, and discuss your goals. Agree on the deliverables and timeline before you request the service.</p></details><details><summary>Can I offer my own services?<span>+</span></summary><p>Yes. The freelancer journey is designed around creating a profile, describing your skills, and listing clearly scoped services.</p></details><details><summary>How do I start exploring?<span>+</span></summary><p>Browse the services or freelancer directory to explore the available skills. Create an account when you?re ready to take your next step.</p></details></div></section>

      <section className="final-cta" id="get-started"><span className="cta-star" aria-hidden="true">✦</span><p className="eyebrow">YOUR NEXT CHAPTER</p><h2>Great things start<br />with “let’s do this.”</h2><p>A fresh idea. A new collaboration. A little possibility.</p><Link className="cream-button" to="/services">Explore your possibilities <svg className="icon"><use href="#arrow"/></svg></Link></section>
    </main>
    <footer className="footer"><div className="footer-top"><div><a className="brand" href="#"><span className="brand-mark">f<span>h</span></span>freelance<span className="brand-light">hub</span><span className="brand-dot">.</span></a><p>Independent people.<br />Extraordinary possibilities.</p></div><div><strong>Find your next</strong><a href="#services">Explore services</a><a href="#how-it-works">How it works</a></div><div><strong>Make your mark</strong><a href="#freelancers">For freelancers</a><Link to={user ? "/dashboard" : "/register"}>{user ? "My workspace" : "Get started"}</Link></div><div className="footer-signoff">A little talent.<br />A lot of possibility.<span>✦</span></div></div><div className="footer-bottom"><span>© <span>{new Date().getFullYear()}</span> FreelanceHub</span><span>Made for the way you work.</span><Link to="/freelancers">Meet the talent ?</Link></div></footer>
  </div>
</div>
  )
}
