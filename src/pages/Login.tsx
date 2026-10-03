import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  TrendingUp,
  DollarSign,
  PackageCheck,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const Login: React.FC = () => {
  const { login } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!email || !password) {
      setErrorMsg('Por favor, preencha seu e-mail e senha.')
      return
    }

    try {
      setLoading(true)
      await login(email, password)
      toast({
        title: 'Bem-vindo de volta!',
        description: 'Autenticado com sucesso.',
      })
      navigate('/dashboard')
    } catch (err: any) {
      console.error('Falha no login:', err)
      setErrorMsg('E-mail ou senha incorretos. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left visual panel - Desktop only */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 relative overflow-hidden flex-col justify-between p-12 text-white">
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-white">
              Automação Empresarial
            </span>
          </div>
        </div>

        {/* Hero Visual content */}
        <div className="relative z-10 max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" /> Gestão Completa & Segura
          </div>
          <h2 className="text-4xl font-extrabold leading-tight tracking-tight text-white">
            O controle total do seu negócio em uma única plataforma web.
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Vendas, receitas, despesas, contas a pagar e receber, formação de preços e controle de
            estoque com ledger em tempo real.
          </p>

          {/* Floating feature pills */}
          <div className="flex flex-wrap gap-2 pt-2">
            <span className="px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Fluxo de Caixa
            </span>
            <span className="px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300 flex items-center gap-1.5">
              <PackageCheck className="w-3.5 h-3.5 text-teal-400" /> Estoque Inteligente
            </span>
            <span className="px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-blue-400" /> Formação de Preço
            </span>
          </div>
        </div>

        {/* Ambient background blur */}
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 text-xs text-slate-400">
          Automação Empresarial © 2025 • Todos os direitos reservados
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Acesse sua conta</h2>
            <p className="text-sm text-slate-500">
              Entre para gerenciar sua empresa com eficiência.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 text-xs rounded-lg bg-red-50 border border-red-200 text-red-700">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                E-mail
              </Label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu.email@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 h-10 border-slate-300 focus-visible:ring-emerald-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="pass" className="text-xs font-semibold text-slate-700">
                  Senha
                </Label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
                >
                  Esqueceu sua senha?
                </Link>
              </div>
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
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm transition-all active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-200" />
            <span className="flex-shrink mx-4 text-xs font-medium text-slate-400 uppercase">
              Novo por aqui?
            </span>
            <div className="flex-grow border-t border-slate-200" />
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/signup')}
            className="w-full h-10 border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
          >
            Criar conta
          </Button>
        </div>
      </div>
    </div>
  )
}

export default Login
