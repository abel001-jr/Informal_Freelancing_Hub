import { createBrowserRouter } from 'react-router-dom'

import Layout        from './components/layout/Layout'
import AuthLayout    from './components/layout/AuthLayout'
import RequireAuth   from './components/auth/RequireAuth'
import RedirectIfAuth from './components/auth/RedirectIfAuth'

import HomePage           from './pages/HomePage'
import ProfilePage from './pages/ProfilePage'
import ServicesPage       from './pages/ServicesPage'
import FreelancersPage    from './pages/FreelancersPage'
import LoginPage          from './pages/auth/LoginPage'
import RegisterPage       from './pages/auth/RegisterPage'
import DashboardRedirect  from './pages/DashboardRedirect'
import ClientDashboard    from './pages/dashboard/ClientDashboard'
import FreelancerDashboard from './pages/dashboard/FreelancerDashboard'
import CompositeDashboard from './pages/dashboard/CompositeDashboard'
import DashboardEntry from './components/dashboard/DashboardEntry'
import AdminDashboard from './pages/dashboard/AdminDashboard'
import NotFoundPage       from './pages/NotFoundPage'

export const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  { path: '/profile', element: <RequireAuth><ProfilePage /></RequireAuth> },
  { path: '/dashboard/workspace', element: <RequireAuth allowedRoles={['both']}><CompositeDashboard /></RequireAuth> },
  { path: '/dashboard/client', element: <RequireAuth allowedRoles={['client', 'both', 'admin']}><DashboardEntry workspace="client"><ClientDashboard /></DashboardEntry></RequireAuth> },
  { path: '/dashboard/freelancer', element: <RequireAuth allowedRoles={['freelancer', 'both', 'admin']}><DashboardEntry workspace="freelancer"><FreelancerDashboard /></DashboardEntry></RequireAuth> },
  { path: '/dashboard/admin', element: <RequireAuth allowedRoles={['admin']}><AdminDashboard /></RequireAuth> },
  {
    /* ── Public pages with navbar + footer ── */
    element: <Layout />,
    children: [
      { path: 'services',    element: <ServicesPage /> },
      { path: 'freelancers', element: <FreelancersPage /> },

      /* ── Protected: redirect to correct dashboard ── */
      {
        path: 'dashboard',
        element: <RequireAuth><DashboardRedirect /></RequireAuth>,
      },

      { path: '*', element: <NotFoundPage /> },
    ],
  },

  {
    /* ── Auth pages (split-panel layout, no navbar) ── */
    element: <AuthLayout />,
    children: [
      {
        path: 'login',
        element: <RedirectIfAuth><LoginPage /></RedirectIfAuth>,
      },
      {
        path: 'register',
        element: <RedirectIfAuth><RegisterPage /></RedirectIfAuth>,
      },
    ],
  },
])
