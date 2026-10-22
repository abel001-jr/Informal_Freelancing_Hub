import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import Spinner from '../ui/Spinner'

/**
 * Wraps protected routes. Redirects unauthenticated users to /login,
 * preserving the intended destination so they can be sent back after sign-in.
 *
 * Optional `allowedRoles` array restricts access to specific roles.
 */
export default function RequireAuth({ children, allowedRoles }) {
  const { user, status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Spinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
