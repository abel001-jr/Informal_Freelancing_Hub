import { createContext } from 'react'

// Isolated file — keeps react-refresh happy since this only exports a context, not a component.
export const AuthContext = createContext(null)
