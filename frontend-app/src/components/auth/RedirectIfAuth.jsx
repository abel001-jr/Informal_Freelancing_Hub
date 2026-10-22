import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import Spinner from '../ui/Spinner'

/**
 * Prevents already-authenticated users from seeing auth pages (login/register).
 * Redirects them to /dashboard instead.
 */
export default function RedirectIfAuth({ children }) {
  const { user, status } = useAuth()

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Spinner size="lg" />
      </div>
    )
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
