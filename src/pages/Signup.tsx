import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, User, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const Signup: React.FC = () => {
  const { signup } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Indicador de força de senha
  const getPasswordStrength = () => {
    if (!password) return { label: '', color: 'bg-slate-200', width: '0%' }
    if (password.length < 6) return { label: 'Fraca', color: 'bg-red-500', width: '33%' }
    if (password.length < 8 || !/[0-9]/.test(password))
      return { label: 'Média', color: 'bg-amber-500', width: '66%' }
    return { label: 'Forte', color: 'bg-emerald-500', width: '100%' }
  }

  const strength = getPasswordStrength()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (password !== confirmPassword) {
      setErrorMsg('As senhas não coincidem.')
      return
    }

    if (password.length < 8) {
      setErrorMsg('A senha deve conter no mínimo 8 caracteres.')
      return
    }

    try {
      setLoading(true)
      await signup(name, email, password)
      toast({
        title: 'Conta criada com sucesso!',
        description: 'Agora vamos preencher os dados cadastrais da sua empresa.',
      })
      // Vai automaticamente para o onboarding
      navigate('/onboarding/company')
    } catch (err: any) {
      console.error('Falha ao cadastrar:', err)
      setErrorMsg(
        err?.data?.data?.email?.message ||
          err?.message ||
          'Não foi possível criar sua conta. Verifique os dados inseridos.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 sm:p-6">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div>
          <Link
            to="/"
            className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 mb-4 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Voltar para o login
          </Link>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Criar conta</h2>
          <p className="text-sm text-slate-500">Comece a gerenciar sua empresa em minutos.</p>
        </div>

        {errorMsg && (
          <div className="p-3 text-xs rounded-lg bg-red-50 border border-red-200 text-red-700">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-semibold text-slate-700">
              Nome Completo
            </Label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <Input
                id="name"
                type="text"
                placeholder="Ex: Carlos Eduardo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-9 h-10 border-slate-300 focus-visible:ring-emerald-500"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
              E-mail corporativo ou pessoal
            </Label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <Input
                id="email"
                type="email"
                placeholder="carlos@empresa.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 h-10 border-slate-300 focus-visible:ring-emerald-500"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pass" className="text-xs font-semibold text-slate-700">
              Senha (mínimo 8 dígitos)
            </Label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <Input
                id="pass"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 pr-10 h-10 border-slate-300 focus-visible:ring-emerald-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {password && (
              <div className="space-y-1 pt-1">
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${strength.color}`}
                    style={{ width: strength.width }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Força: {strength.label}</span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPass" className="text-xs font-semibold text-slate-700">
              Confirmar Senha
            </Label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <Input
                id="confirmPass"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-9 h-10 border-slate-300 focus-visible:ring-emerald-500"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm transition-all active:scale-[0.98]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Criando conta...
              </>
            ) : (
              'Criar conta e Continuar'
            )}
          </Button>
        </form>

        <p className="text-center text-xs text-slate-500">
          Já tem uma conta?{' '}
          <Link
            to="/"
            className="font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
          >
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Signup
