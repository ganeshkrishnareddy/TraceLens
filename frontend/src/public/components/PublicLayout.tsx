import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { LogoHorizontal } from '../brand/LogoHorizontal'
import { Container } from './ui'

const primaryNav = [
  { to: '/', label: 'Home', end: true },
  { to: '/how-it-works', label: 'How it works' },
  { to: '/technology', label: 'Technology' },
  { to: '/research', label: 'Research' },
  { to: '/about', label: 'About' },
  { to: '/judge', label: 'Judge mode' },
]

const secondaryNav = [
  { to: '/demo', label: 'Interactive demo' },
  { to: '/login', label: 'Sign in' },
  { to: '/register', label: 'Create account' },
]

function navClass(isActive: boolean) {
  return `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-soft text-primary' : 'text-body hover:bg-soft hover:text-ink'
  }`
}

function PublicHeader() {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  useEffect(() => { setOpen(false) }, [location.pathname])

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white">
      <Container className="flex min-h-[64px] items-center justify-between gap-3">
        <Link to="/" aria-label="TraceLens home" className="shrink-0 rounded-lg">
          <span className="hidden sm:inline-flex"><LogoHorizontal size={32} /></span>
          <span className="inline-flex sm:hidden"><LogoHorizontal size={30} compact /></span>
        </Link>

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Main navigation">
          {primaryNav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => navClass(isActive)}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link to="/login" className="btn-ghost">Sign in</Link>
          <Link to="/demo" className="btn-primary">Open demo</Link>
        </div>

        <button
          type="button"
          className="btn-ghost px-2 lg:hidden"
          aria-expanded={open}
          aria-controls="public-mobile-nav"
          aria-label={open ? 'Close navigation' : 'Open navigation'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
      </Container>

      {open && (
        <nav id="public-mobile-nav" className="border-t border-line bg-white lg:hidden" aria-label="Mobile navigation">
          <Container className="grid gap-1 py-3">
            {[...primaryNav, ...secondaryNav].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={Boolean('end' in item && item.end)}
                className={({ isActive }) => `${navClass(isActive)} flex min-h-[40px] items-center`}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
            <Link to="/demo" className="btn-primary mt-2 w-full" onClick={() => setOpen(false)}>
              Open interactive demo
            </Link>
          </Container>
        </nav>
      )}
    </header>
  )
}

function PublicFooter() {
  return (
    <footer className="border-t border-line bg-white">
      <Container className="grid gap-8 py-10 md:grid-cols-5">
        <div className="md:col-span-2">
          <LogoHorizontal size={32} />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-body">
            See the signal. Understand the anomaly. Act with confidence.
          </p>
          <p className="mt-2 text-sm font-medium text-ink">Evidence-driven. Explainable. Reproducible.</p>
          <p className="mt-4 text-xs leading-relaxed text-muted">
            ProgVision — individual participant, AEGYTHON 2026. Independent project, AI-assisted development.
            No customers, production deployment, certification or partnerships are claimed.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Explore</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="text-body hover:text-primary" to="/about">About the project</Link></li>
            <li><Link className="text-body hover:text-primary" to="/technology">Technology</Link></li>
            <li><Link className="text-body hover:text-primary" to="/how-it-works">How it works</Link></li>
            <li><Link className="text-body hover:text-primary" to="/research">Research & methodology</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Try it</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="text-body hover:text-primary" to="/demo">Interactive demo</Link></li>
            <li><Link className="text-body hover:text-primary" to="/judge">Guided judge mode</Link></li>
            <li><Link className="text-body hover:text-primary" to="/login">Sign in</Link></li>
            <li><Link className="text-body hover:text-primary" to="/register">Create account</Link></li>
            <li><Link className="text-body hover:text-primary" to="/app/overview">Analyst workspace</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Contact</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a className="text-body hover:text-primary" href="mailto:pganeshkrishnareddy@gmail.com">
                pganeshkrishnareddy@gmail.com
              </a>
            </li>
            <li>
              <a className="text-body hover:text-primary" href="https://linkedin.com/in/pganeshkrishnareddy" target="_blank" rel="noopener noreferrer">
                LinkedIn
              </a>
            </li>
            <li>
              <a className="text-body hover:text-primary" href="https://github.com/ganeshkrishnareddy" target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
            </li>
            <li>
              <a className="text-body hover:text-primary" href="https://pganeshkrishnareddy.vercel.app/" target="_blank" rel="noopener noreferrer">
                Portfolio
              </a>
            </li>
          </ul>
        </div>
      </Container>
      <div className="border-t border-line">
        <Container className="flex flex-col gap-2 py-4 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 TraceLens · ProgVision · AEGYTHON 2026</span>
          <span>All datasets shown in the public site are labelled synthetic demonstration data.</span>
        </Container>
      </div>
    </footer>
  )
}

export function PublicLayout({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex min-h-screen flex-col bg-paper text-body ${className}`}>
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  )
}

export default PublicLayout
