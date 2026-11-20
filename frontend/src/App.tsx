import { type ReactNode } from 'react'
import { Link, Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom'
import {
  Activity, ArrowLeft, Database, FileText, FlaskConical, LayoutDashboard,
  LogOut, ScanSearch, Search, Settings as SettingsIcon, WifiOff,
} from 'lucide-react'

import { AuthProvider, RequireAnalyst, useAuth } from './auth'
import { Logo, LogoMark } from './components/Logo'
import { ScrollToTop } from './components/ScrollToTop'
import { isDemoMode } from './api'

import { Landing } from './public/pages/Landing'
import { About as PublicAbout } from './public/pages/About'
import { Technology } from './public/pages/Technology'
import { HowItWorks } from './public/pages/HowItWorks'
import { Research } from './public/pages/Research'
import { DemoAccess } from './public/pages/DemoAccess'
import { Login } from './public/pages/Login'
import { Register } from './public/pages/Register'
import { ForgotPassword } from './public/pages/ForgotPassword'
import { JudgeMode } from './public/pages/JudgeMode'

import { AppOverview } from './app/AppOverview'
import { AppDataLab } from './app/AppDataLab'
import { AppDetection } from './app/AppDetection'
import { AppInvestigation } from './app/AppInvestigation'
import { AppExplain } from './app/AppExplain'
import { AppExperiments } from './app/AppExperiments'
import { AppReports } from './app/AppReports'
import { AppSettings } from './app/AppSettings'

const appNav = [
  { to: '/app/overview', label: 'Overview', icon: LayoutDashboard },
  { to: '/app/data', label: 'Data Lab', icon: Database },
  { to: '/app/detect', label: 'Detection', icon: ScanSearch },
  { to: '/app/investigate', label: 'Investigation', icon: Search },
  { to: '/app/explain', label: 'Explainability', icon: Activity },
  { to: '/app/experiments', label: 'Experiments', icon: FlaskConical },
  { to: '/app/reports', label: 'Reports', icon: FileText },
  { to: '/app/settings', label: 'Settings', icon: SettingsIcon },
]

/** Shell for the signed-in analyst platform. Light theme only. */
function AnalystShell({ children }: { children: ReactNode }) {
  const { user, demoSession, logout } = useAuth()
  const offline = isDemoMode()

  return (
    <div className="flex min-h-screen flex-col bg-paper text-body md:flex-row">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-white md:flex">
        <div className="border-b border-line px-5 py-5">
          <Logo size={30} />
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Analyst navigation">
          {appNav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-soft text-primary' : 'text-body hover:bg-soft hover:text-ink'
                }`
              }
            >
              <Icon size={16} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-2 border-t border-line px-5 py-4 text-xs text-muted">
          <div className="font-medium text-ink">ProgVision · AEGYTHON 2026</div>
          <LinkToSite />
          {user && (
            <button
              type="button"
              onClick={() => { void logout() }}
              className="flex items-center gap-1.5 text-muted hover:text-critical"
            >
              <LogOut size={13} aria-hidden="true" /> Sign out
            </button>
          )}
        </div>
      </aside>

      <header className="border-b border-line bg-white px-4 py-3 md:hidden">
        <div className="flex items-center justify-between gap-3">
          <LogoMark size={30} />
          <LinkToSite />
        </div>
        <nav className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1" aria-label="Analyst navigation">
          {appNav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${
                  isActive ? 'bg-soft text-primary' : 'bg-paper text-muted'
                }`
              }
            >
              <Icon size={14} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="min-w-0 flex-1" data-scroll-container>
        {offline && (
          <div className="mx-4 mt-4 flex items-start gap-2 rounded-xl border border-warning/30 bg-amber-50 px-4 py-3 text-sm text-warning md:mx-6">
            <WifiOff size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>API offline — results shown here are labelled demo fixtures. Start the API on port 8000 for live data.</span>
          </div>
        )}
        {demoSession && (
          <div className="mx-4 mt-4 rounded-xl border border-secondary/20 bg-blue-50 px-4 py-2.5 text-sm text-secondary md:mx-6">
            Demo session — changes are local and reset when you leave.
          </div>
        )}
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">{children}</div>
      </main>
    </div>
  )
}

function LinkToSite() {
  return (
    <Link to="/" className="inline-flex items-center gap-1.5 hover:text-primary">
      <ArrowLeft size={13} aria-hidden="true" /> Back to site
    </Link>
  )
}

/** Layout route: one shell for every /app/* page, with the page rendered via Outlet. */
function AnalystLayout() {
  return (
    <RequireAnalyst>
      <AnalystShell><Outlet /></AnalystShell>
    </RequireAnalyst>
  )
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public website */}
      <Route path="/" element={<Landing />} />
      <Route path="/about" element={<PublicAbout />} />
      <Route path="/technology" element={<Technology />} />
      <Route path="/how-it-works" element={<HowItWorks />} />
      <Route path="/research" element={<Research />} />
      <Route path="/demo" element={<DemoAccess />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/judge" element={<JudgeMode />} />

      {/* Analyst platform */}
      <Route path="/app" element={<AnalystLayout />}>
        <Route index element={<Navigate to="/app/overview" replace />} />
        <Route path="overview" element={<AppOverview />} />
        <Route path="data" element={<AppDataLab />} />
        <Route path="detect" element={<AppDetection />} />
        <Route path="investigate" element={<AppInvestigation />} />
        <Route path="explain" element={<AppExplain />} />
        <Route path="experiments" element={<AppExperiments />} />
        <Route path="reports" element={<AppReports />} />
        <Route path="settings" element={<AppSettings />} />
        <Route path="*" element={<Navigate to="/app/overview" replace />} />
      </Route>

      {/* Legacy dashboard links keep working */}
      <Route path="/data" element={<Navigate to="/app/data" replace />} />
      <Route path="/detect" element={<Navigate to="/app/detect" replace />} />
      <Route path="/investigate" element={<Navigate to="/app/investigate" replace />} />
      <Route path="/explain" element={<Navigate to="/app/explain" replace />} />
      <Route path="/experiments" element={<Navigate to="/app/experiments" replace />} />
      <Route path="/reports" element={<Navigate to="/app/reports" replace />} />
      <Route path="/dashboard" element={<Navigate to="/app/overview" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ScrollToTop />
      <AppRoutes />
    </AuthProvider>
  )
}
