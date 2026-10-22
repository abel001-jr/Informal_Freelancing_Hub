import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import Spinner from '../components/ui/Spinner'

/**
 * Redirects to the correct dashboard based on the user's role.
 * This page will be replaced once dashboard pages are built.
 */
export default function DashboardRedirect() {
  const { user, status } = useAuth()

  if (status === 'loading') {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}><Spinner size="lg" /></div>
  }

  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'both') return <Navigate to="/dashboard/workspace" replace />

  if (user.role === 'freelancer') return <Navigate to="/dashboard/freelancer" replace />
  if (user.role === 'admin')      return <Navigate to="/dashboard/admin" replace />
  return <Navigate to="/dashboard/client" replace />
}
