import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'

// Preserve older dashboard URLs while giving dual-role accounts one workspace.
export default function DashboardEntry({ workspace, children }) {
  const { user } = useAuth()
  const location = useLocation()
  if (user?.role !== 'both') return children
  const params = new URLSearchParams(location.search)
  const section = params.get('section')
  if (workspace === 'client' && ['projects', 'jobs', 'requests'].includes(section)) {
    params.set('section', `hiring-${section}`)
  }
  return <Navigate to={{ pathname: '/dashboard/workspace', search: params.toString() }} replace />
}
