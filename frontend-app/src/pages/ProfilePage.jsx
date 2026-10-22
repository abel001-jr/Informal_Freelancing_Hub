import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export default function ProfilePage() {
  const { user } = useAuth()
  const location = useLocation()
  const workspace = user.role === 'admin' ? 'admin' : user.role === 'both' ? 'workspace' : user.role === 'freelancer' ? 'freelancer' : 'client'
  const params = new URLSearchParams(location.search)
  params.set('view', 'profile')
  return <Navigate to={{ pathname: `/dashboard/${workspace}`, search: params.toString() }} replace />
}
