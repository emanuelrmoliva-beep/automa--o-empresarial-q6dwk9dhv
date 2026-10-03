import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2 } from 'lucide-react'

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, company, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mb-4" />
        <p className="text-sm font-medium text-slate-600">Carregando sistema...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />
  }

  // Se o usuário está autenticado mas ainda NÃO tem empresa cadastrada
  // e tenta acessar qualquer rota diferente do onboarding
  if (!company && location.pathname !== '/onboarding/company') {
    return <Navigate to="/onboarding/company" replace />
  }

  // Se o usuário já tem empresa e tenta acessar o onboarding
  if (company && location.pathname === '/onboarding/company') {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

export const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, company, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mb-4" />
        <p className="text-sm font-medium text-slate-600">Verificando sessão...</p>
      </div>
    )
  }

  if (user) {
    if (!company) {
      return <Navigate to="/onboarding/company" replace />
    }
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
