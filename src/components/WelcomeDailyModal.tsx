import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles,
  ArrowRight,
  SunMedium,
  CheckCircle2,
  Calendar,
  Clock,
  Package,
  AlertCircle,
  Truck,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { formatCurrency, formatDatePtBr } from '@/lib/formatters'
import type { AgendaEvent, Payable, Receivable } from '@/types/erp'

interface WelcomeDailyModalProps {
  userName?: string
  companyName?: string
  todayEvents: AgendaEvent[]
  todayPayables: Payable[]
  todayReceivables: Receivable[]
}

const MOTIVATIONAL_QUOTES = [
  'O segredo do sucesso empresarial é a constância em direção ao propósito.',
  'Pequenas disciplinas diárias geram grandes vitórias no final do mês.',
  'Gerencie seus números hoje e colha a tranquilidade do seu negócio amanhã.',
  'Qualidade não é um ato, é um hábito construído a cada entrega realizada.',
  'Cada cliente bem atendido e cada meta cumprida abrem novos caminhos de expansão.',
  'O trabalho duro supera o talento quando o talento não trabalha duro. Excelente jornada hoje!',
  'Foco nas prioridades do dia: clareza na gestão transforma qualquer negócio.',
]

export const WelcomeDailyModal: React.FC<WelcomeDailyModalProps> = ({
  userName,
  companyName,
  todayEvents,
  todayPayables,
  todayReceivables,
}) => {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)

  const todayIso = new Date().toISOString().split('T')[0]

  useEffect(() => {
    // Verifica se já foi dispensado hoje
    const storageKey = `welcome_dismissed_${todayIso}`
    const alreadyDismissed = localStorage.getItem(storageKey)
    if (!alreadyDismissed) {
      setIsOpen(true)
    }
  }, [todayIso])

  const handleDismiss = (redirectToAgenda = false) => {
    const storageKey = `welcome_dismissed_${todayIso}`
    localStorage.setItem(storageKey, 'true')
    setIsOpen(false)
    if (redirectToAgenda) {
      navigate('/agenda')
    }
  }

  // Frase do dia baseada no dia do mês
  const dayOfMonth = new Date().getDate()
  const dailyQuote = MOTIVATIONAL_QUOTES[dayOfMonth % MOTIVATIONAL_QUOTES.length]

  const totalPedidos = todayEvents.filter((e) => e.event_type === 'Pedido').length
  const totalEntregas = todayEvents.filter((e) => e.event_type === 'Entrega').length

  const todayStr = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDismiss(false)}>
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden border-slate-200">
        {/* Banner Motivacional */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-6 text-white relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              <SunMedium className="w-4 h-4" />
              <span>Bom dia, {userName || 'Empreendedor'}!</span>
            </div>
            <span className="text-[11px] text-slate-300 capitalize">{todayStr}</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-2">
            {companyName || 'Automação Empresarial'}
          </h2>

          {/* Frase Motivacional */}
          <div className="mt-4 p-3.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-200 italic leading-relaxed">"{dailyQuote}"</p>
            </div>
          </div>
        </div>

        {/* Resumo do Dia */}
        <div className="p-6 space-y-4 bg-white">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Agenda & Prioridades de Hoje
            </h3>
            <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
              {todayEvents.length} compromisso(s)
            </span>
          </div>

          {/* Mini Cards de Hoje */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Package className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-slate-500 font-medium">Pedidos Hoje</p>
                <p className="text-base font-bold text-slate-900">{totalPedidos}</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                <Truck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-slate-500 font-medium">Entregas Hoje</p>
                <p className="text-base font-bold text-slate-900">{totalEntregas}</p>
              </div>
            </div>
          </div>

          {/* Lista rápida de eventos de hoje */}
          {todayEvents.length > 0 ? (
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {todayEvents.slice(0, 4).map((evt) => (
                <div
                  key={evt.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/60 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        evt.event_type === 'Pedido'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-teal-100 text-teal-800'
                      }`}
                    >
                      {evt.event_type}
                    </span>
                    <span className="font-semibold text-slate-800 truncate">{evt.title}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[11px] text-slate-400 font-mono">
                      {evt.event_time || 'Dia todo'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-3 px-4 rounded-xl bg-slate-50 text-center text-xs text-slate-500 border border-slate-200/60">
              Nenhum pedido ou entrega agendado para hoje.
            </div>
          )}

          {/* Alerta de contas vencendo hoje */}
          {(todayPayables.length > 0 || todayReceivables.length > 0) && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Financeiro de hoje:</strong> {todayPayables.length} conta(s) a pagar
                  {todayReceivables.length > 0 ? ` e ${todayReceivables.length} a receber` : ''}.
                </span>
              </div>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => handleDismiss(false)}
              className="text-xs h-9 text-slate-600"
            >
              Ir para o Dashboard
            </Button>
            <Button
              onClick={() => handleDismiss(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9 px-4 flex items-center gap-1.5"
            >
              Ver Pedidos do Dia na Agenda <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default WelcomeDailyModal
