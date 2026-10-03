import React, { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Lock, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()
  const { toast } = useToast()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!token) {
      setErrorMsg('Token de recuperação ausente ou inválido.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMsg('As senhas não conferem.')
      return
    }

    if (password.length < 8) {
      setErrorMsg('A senha deve ter no mínimo 8 dígitos.')
      return
    }

    try {
      setLoading(true)
      await pb.collection('users').confirmPasswordReset(token, password, confirmPassword)
      setSuccess(true)
      toast({
        title: 'Senha redefinida!',
        description: 'Faça login com a sua nova senha.',
      })
      setTimeout(() => {
        navigate('/')
      }, 2000)
    } catch (err: any) {
      console.error('Falha ao redefinir:', err)
      setErrorMsg(err?.message || 'Token expirado ou inválido. Solicite um novo link.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 sm:p-6">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Definir nova senha</h2>
          <p className="text-sm text-slate-500">Crie uma nova senha segura para a sua conta.</p>
        </div>

        {errorMsg && (
          <div className="p-3 text-xs rounded-lg bg-red-50 border border-red-200 text-red-700">
            {errorMsg}
          </div>
        )}

        {success ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="font-semibold text-slate-800">Senha alterada!</h3>
            <p className="text-xs text-slate-500">Redirecionando para a tela de login...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pass" className="text-xs font-semibold text-slate-700">
                Nova Senha
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
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPass" className="text-xs font-semibold text-slate-700">
                Confirmar Nova Senha
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
              className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Atualizando...
                </>
              ) : (
                'Redefinir senha'
              )}
            </Button>
          </form>
        )}

        <div className="text-center">
          <Link to="/" className="text-xs font-semibold text-emerald-600 hover:underline">
            Voltar para o login
          </Link>
        </div>
      </div>
    </div>
  )
}

export default ResetPassword
