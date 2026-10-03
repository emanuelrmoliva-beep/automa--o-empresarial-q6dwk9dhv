import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    try {
      setLoading(true)
      await pb.collection('users').requestPasswordReset(email)
    } catch (err) {
      // Por segurança contra enumeração de e-mails, não mostramos erro de inexistência
      console.error(err)
    } finally {
      setLoading(false)
      setSubmitted(true)
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
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Recuperar senha</h2>
          <p className="text-sm text-slate-500">
            Informe seu e-mail para receber as instruções de redefinição.
          </p>
        </div>

        {submitted ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="font-semibold text-slate-800">E-mail enviado!</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Se existir uma conta vinculada ao e-mail <strong>{email}</strong>, você receberá um
              link para redefinir sua senha em instantes.
            </p>
            <Button variant="outline" onClick={() => setSubmitted(false)} className="mt-4 text-xs">
              Tentar outro e-mail
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                Seu e-mail cadastrado
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

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...
                </>
              ) : (
                'Enviar link de redefinição'
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}

export default ForgotPassword
