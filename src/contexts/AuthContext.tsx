import React, { createContext, useContext, useEffect, useState } from 'react'
import type { AuthRecord } from 'pocketbase'
import pb from '@/lib/pocketbase/client'
import { getCompanyByUserId } from '@/services/erp'
import type { Company } from '@/types/erp'

interface AuthContextType {
  user: AuthRecord | null
  company: Company | null
  isLoading: boolean
  login: (email: string, pass: string) => Promise<void>
  signup: (name: string, email: string, pass: string) => Promise<void>
  logout: () => void
  refreshCompany: () => Promise<Company | null>
  setCompany: (company: Company | null) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthRecord | null>(pb.authStore.record)
  const [company, setCompany] = useState<Company | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const fetchCompany = async (userId: string) => {
    try {
      const comp = await getCompanyByUserId(userId)
      setCompany(comp)
      return comp
    } catch (e) {
      console.error('Erro ao buscar dados da empresa:', e)
      setCompany(null)
      return null
    }
  }

  useEffect(() => {
    let isMounted = true

    const initAuth = async () => {
      try {
        if (pb.authStore.isValid && pb.authStore.record) {
          setUser(pb.authStore.record)
          await fetchCompany(pb.authStore.record.id)
        } else {
          setUser(null)
          setCompany(null)
        }
      } catch (err) {
        console.error('Erro ao carregar sessão inicial:', err)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    initAuth()

    const unsub = pb.authStore.onChange((token, record) => {
      setUser(record)
      if (record) {
        fetchCompany(record.id)
      } else {
        setCompany(null)
      }
    })

    return () => {
      isMounted = false
      unsub()
    }
  }, [])

  const login = async (email: string, pass: string) => {
    const authData = await pb.collection('users').authWithPassword(email, pass)
    setUser(authData.record)
    if (authData.record) {
      await fetchCompany(authData.record.id)
    }
  }

  const signup = async (name: string, email: string, pass: string) => {
    await pb.collection('users').create({
      email,
      password: pass,
      passwordConfirm: pass,
      name,
    })
    // Auto-login após cadastro
    await login(email, pass)
  }

  const logout = () => {
    pb.authStore.clear()
    setUser(null)
    setCompany(null)
  }

  const refreshCompany = async () => {
    if (!user) return null
    return await fetchCompany(user.id)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        isLoading,
        login,
        signup,
        logout,
        refreshCompany,
        setCompany,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}
