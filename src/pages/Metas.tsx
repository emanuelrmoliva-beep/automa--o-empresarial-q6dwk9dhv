import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Target,
  Plus,
  Search,
  Calendar,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Edit2,
  Trash2,
  Loader2,
  DollarSign,
  Briefcase,
  Flame,
  Award,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import {
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  getEntries,
  getExpenses,
  getSales,
} from '@/services/erp'
import type { Goal, GoalType, GoalPeriod, GoalStatus, Entry, Expense, Sale } from '@/types/erp'
import { formatCurrency, formatDatePtBr } from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/EmptyState'

const GOAL_TYPE_LABELS: Record<GoalType, { label: string; desc: string }> = {
  faturamento: {
    label: 'Crescimento de Faturamento',
    desc: 'Mede a soma de receitas recebidas no período',
  },
  lucro: {
    label: 'Lucro Líquido Operacional',
    desc: 'Mede receitas recebidas menos despesas pagas',
  },
  vendas_qtd: {
    label: 'Total de Vendas Concluídas (R$)',
    desc: 'Mede o valor total de vendas realizadas',
  },
  reducao_despesas: {
    label: 'Teto / Economia de Despesas',
    desc: 'Mede o controle de despesas pagas contra o orçamento',
  },
  equipamento_investimento: {
    label: 'Compra de Equipamento / Expansão',
    desc: 'Mede a reserva ou aplicação realizada para novos ativos',
  },
  livre: {
    label: 'Meta Livre / Personalizada',
    desc: 'Progresso ajustável livremente pelo gestor',
  },
}

const PERIOD_LABELS: Record<GoalPeriod, string> = {
  mensal: 'Mensal',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
}

export const Metas: React.FC = () => {
  const { company } = useAuth()
  const { toast } = useToast()

  const [goals, setGoals] = useState<Goal[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)

  const [searchTerm, setSearchTerm] = useState('')
  const [periodFilter, setPeriodFilter] = useState<'Todos' | GoalPeriod>('Todos')
  const [statusFilter, setStatusFilter] = useState<'Todos' | GoalStatus>('Todos')

  // Modal Criar/Editar
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [title, setTitle] = useState('')
  const [goalType, setGoalType] = useState<GoalType>('faturamento')
  const [periodType, setPeriodType] = useState<GoalPeriod>('mensal')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState('')
  const [targetValue, setTargetValue] = useState('')
  const [manualValue, setManualValue] = useState('')
  const [status, setStatus] = useState<GoalStatus>('em_andamento')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Confirmação Exclusão
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    if (!company) return
    try {
      const [gData, entData, expData, salData] = await Promise.all([
        getGoals(company.id),
        getEntries(company.id),
        getExpenses(company.id),
        getSales(company.id),
      ])
      setGoals(gData)
      setEntries(entData)
      setExpenses(expData)
      setSales(salData)
    } catch (err) {
      console.error('Erro ao carregar metas:', err)
    } finally {
      setLoading(false)
    }
  }, [company])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  useRealtime('goals', () => loadAll(), !!company)
  useRealtime('entries', () => loadAll(), !!company)
  useRealtime('expenses', () => loadAll(), !!company)
  useRealtime('sales', () => loadAll(), !!company)

  // Auto define end_date com base no período e data inicial
  const calculateEndDate = (start: string, period: GoalPeriod) => {
    if (!start) return ''
    const [y, m, d] = start.split('-').map(Number)
    const baseDate = new Date(y, m - 1, d)
    let monthsToAdd = 1
    if (period === 'mensal') monthsToAdd = 1
    else if (period === 'trimestral') monthsToAdd = 3
    else if (period === 'semestral') monthsToAdd = 6
    else if (period === 'anual') monthsToAdd = 12

    baseDate.setMonth(baseDate.getMonth() + monthsToAdd)
    baseDate.setDate(baseDate.getDate() - 1)
    return baseDate.toISOString().split('T')[0]
  }

  const handlePeriodChange = (p: GoalPeriod) => {
    setPeriodType(p)
    if (startDate) {
      setEndDate(calculateEndDate(startDate, p))
    }
  }

  const handleStartDateChange = (s: string) => {
    setStartDate(s)
    if (s && periodType) {
      setEndDate(calculateEndDate(s, periodType))
    }
  }

  const openCreateModal = () => {
    setEditingGoal(null)
    const today = new Date().toISOString().split('T')[0]
    setTitle('')
    setGoalType('faturamento')
    setPeriodType('mensal')
    setStartDate(today)
    setEndDate(calculateEndDate(today, 'mensal'))
    setTargetValue('')
    setManualValue('0')
    setStatus('em_andamento')
    setNotes('')
    setIsModalOpen(true)
  }

  const openEditModal = (g: Goal) => {
    setEditingGoal(g)
    setTitle(g.title)
    setGoalType(g.goal_type)
    setPeriodType(g.period_type)
    setStartDate(g.start_date.split('T')[0])
    setEndDate(g.end_date.split('T')[0])
    setTargetValue(g.target_value.toString())
    setManualValue(g.current_value !== undefined ? g.current_value.toString() : '0')
    setStatus(g.status)
    setNotes(g.notes || '')
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!company) return

    const numTarget = parseFloat(targetValue.replace(',', '.'))
    if (isNaN(numTarget) || numTarget <= 0) {
      toast({ variant: 'destructive', title: 'Valor-alvo inválido' })
      return
    }

    const numManual = parseFloat((manualValue || '0').replace(',', '.')) || 0

    try {
      setSubmitting(true)
      if (editingGoal) {
        await updateGoal(editingGoal.id, {
          title,
          goal_type: goalType,
          period_type: periodType,
          start_date: startDate,
          end_date: endDate,
          target_value: numTarget,
          current_value: numManual,
          status,
          notes,
        })
        toast({ title: 'Meta atualizada com sucesso!' })
      } else {
        await createGoal({
          company_id: company.id,
          title,
          goal_type: goalType,
          period_type: periodType,
          start_date: startDate,
          end_date: endDate,
          target_value: numTarget,
          current_value: numManual,
          status,
          notes,
        })
        toast({ title: 'Meta criada com sucesso!' })
      }
      setIsModalOpen(false)
      await loadAll()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar meta', description: err?.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTargetId) return
    try {
      await deleteGoal(deleteTargetId)
      toast({ title: 'Meta removida' })
      setDeleteTargetId(null)
      await loadAll()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao excluir meta', description: err?.message })
    }
  }

  const handleToggleComplete = async (goal: Goal) => {
    try {
      const nextStatus: GoalStatus = goal.status === 'concluida' ? 'em_andamento' : 'concluida'
      await updateGoal(goal.id, { status: nextStatus })
      toast({
        title:
          nextStatus === 'concluida'
            ? '🎉 Parabéns! Meta concluída!'
            : 'Meta reaberta para acompanhamento.',
      })
      await loadAll()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao atualizar meta' })
    }
  }

  // Medição automática contra dados reais da empresa
  const computeGoalProgress = useCallback(
    (g: Goal) => {
      const start = g.start_date.split('T')[0]
      const end = g.end_date.split('T')[0]

      let accumulated = 0

      if (g.goal_type === 'faturamento') {
        accumulated = entries
          .filter((e) => {
            const d = e.entry_date.split('T')[0]
            return d >= start && d <= end && e.status === 'Recebida'
          })
          .reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
      } else if (g.goal_type === 'lucro') {
        const sumEnt = entries
          .filter((e) => {
            const d = e.entry_date.split('T')[0]
            return d >= start && d <= end && e.status === 'Recebida'
          })
          .reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
        const sumExp = expenses
          .filter((ex) => {
            const d = ex.expense_date.split('T')[0]
            return d >= start && d <= end && ex.status === 'Paga'
          })
          .reduce((sum, ex) => sum + (Number(ex.amount) || 0), 0)
        accumulated = Math.max(0, sumEnt - sumExp)
      } else if (g.goal_type === 'vendas_qtd') {
        accumulated = sales
          .filter((s) => {
            const d = s.sale_date.split('T')[0]
            return d >= start && d <= end && s.status === 'Concluída'
          })
          .reduce((sum, s) => sum + (Number(s.amount) || 0), 0)
      } else if (g.goal_type === 'reducao_despesas') {
        // Redução / Teto de despesas: mede quanto já foi gasto
        accumulated = expenses
          .filter((ex) => {
            const d = ex.expense_date.split('T')[0]
            return d >= start && d <= end && ex.status === 'Paga'
          })
          .reduce((sum, ex) => sum + (Number(ex.amount) || 0), 0)
      } else {
        // livre ou equipamento_investimento: usa current_value manual
        accumulated = Number(g.current_value) || 0
      }

      const percent = g.target_value > 0 ? (accumulated / g.target_value) * 100 : 0
      const todayStr = new Date().toISOString().split('T')[0]
      const isPast = todayStr > end
      const isComplete = g.status === 'concluida' || percent >= 100

      // Saúde do prazo
      let health: 'concluida' | 'no_prazo' | 'atrasada' = 'no_prazo'
      if (isComplete) {
        health = 'concluida'
      } else if (isPast) {
        health = 'atrasada'
      } else {
        // Se já passou mais da metade do tempo e progresso está muito baixo
        const startTime = new Date(start).getTime()
        const endTime = new Date(end).getTime()
        const nowTime = new Date().getTime()
        const totalDuration = endTime - startTime
        const elapsed = nowTime - startTime
        if (totalDuration > 0 && elapsed > 0) {
          const expectedPct = (elapsed / totalDuration) * 100
          if (percent < expectedPct - 25) {
            health = 'atrasada'
          }
        }
      }

      return {
        accumulated,
        percent: Math.min(Math.round(percent * 10) / 10, 999),
        health,
        isPast,
      }
    },
    [entries, expenses, sales],
  )

  const filteredGoals = useMemo(() => {
    return goals.filter((g) => {
      const matchSearch =
        g.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (g.notes || '').toLowerCase().includes(searchTerm.toLowerCase())
      const matchPeriod = periodFilter === 'Todos' || g.period_type === periodFilter
      const matchStatus = statusFilter === 'Todos' || g.status === statusFilter
      return matchSearch && matchPeriod && matchStatus
    })
  }, [goals, searchTerm, periodFilter, statusFilter])

  // Mini estatísticas
  const stats = useMemo(() => {
    const total = goals.length
    const ativas = goals.filter((g) => g.status === 'em_andamento').length
    const concluidas = goals.filter((g) => g.status === 'concluida').length

    let somaAlvo = 0
    let somaAtingido = 0
    goals.forEach((g) => {
      somaAlvo += Number(g.target_value) || 0
      const prog = computeGoalProgress(g)
      somaAtingido += prog.accumulated
    })

    return { total, ativas, concluidas, somaAlvo, somaAtingido }
  }, [goals, computeGoalProgress])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Target className="w-6 h-6 text-emerald-600" />
            Sistema de Metas & Réguas de Crescimento
          </h2>
          <p className="text-sm text-slate-500">
            Defina aonde quer chegar: faturamento, compra de equipamentos, lucro ou crescimento
            medidos automaticamente.
          </p>
        </div>

        <Button
          onClick={openCreateModal}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9 px-4 shadow-sm flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Nova Meta
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">Metas Ativas</span>
          <p className="text-2xl font-bold font-mono text-emerald-700 mt-1">
            {stats.ativas}{' '}
            <span className="text-xs font-normal text-slate-400">/ {stats.total} total</span>
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">Metas Concluídas</span>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-1 flex items-center gap-2">
            {stats.concluidas}
            <Award className="w-5 h-5 text-amber-500" />
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">
            Total Alvo Planejado
          </span>
          <p className="text-xl font-bold font-mono text-slate-900 mt-1">
            {formatCurrency(stats.somaAlvo)}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">
            Realizado no Período
          </span>
          <p className="text-xl font-bold font-mono text-emerald-700 mt-1">
            {formatCurrency(stats.somaAtingido)}
          </p>
        </div>
      </div>

      {/* Régua explicativa */}
      <div className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm tracking-tight text-white flex items-center gap-2">
              Réguas de Acompanhamento Concreto
            </h4>
            <p className="text-xs text-slate-300 mt-0.5 max-w-2xl">
              Metas de faturamento, lucro e vendas são medidas <strong>em tempo real</strong> contra
              as receitas recebidas e vendas registradas no seu ERP. Você sabe exatamente o
              percentual conquistado sem precisar calcular nada na mão.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] bg-emerald-500/30 text-emerald-200 px-2.5 py-1 rounded-full font-medium border border-emerald-400/30">
            Mensal
          </span>
          <span className="text-[11px] bg-emerald-500/30 text-emerald-200 px-2.5 py-1 rounded-full font-medium border border-emerald-400/30">
            Trimestral
          </span>
          <span className="text-[11px] bg-emerald-500/30 text-emerald-200 px-2.5 py-1 rounded-full font-medium border border-emerald-400/30">
            Semestral
          </span>
          <span className="text-[11px] bg-emerald-500/30 text-emerald-200 px-2.5 py-1 rounded-full font-medium border border-emerald-400/30">
            Anual
          </span>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <Input
            placeholder="Buscar por nome da meta ou objetivo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 border-slate-200 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={periodFilter} onValueChange={(val: any) => setPeriodFilter(val)}>
            <SelectTrigger className="w-36 h-10 text-xs">
              <SelectValue placeholder="Régua / Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todas as Réguas</SelectItem>
              <SelectItem value="mensal">Mensal</SelectItem>
              <SelectItem value="trimestral">Trimestral</SelectItem>
              <SelectItem value="semestral">Semestral</SelectItem>
              <SelectItem value="anual">Anual</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
            <SelectTrigger className="w-36 h-10 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos os Status</SelectItem>
              <SelectItem value="em_andamento">Em Andamento</SelectItem>
              <SelectItem value="concluida">Concluída</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid de Metas */}
      {filteredGoals.length === 0 ? (
        <EmptyState
          icon={<Target className="w-8 h-8 text-emerald-600" />}
          title="Nenhuma meta cadastrada"
          description="Crie metas com régua mensal, trimestral ou anual para compra de equipamentos, crescimento ou faturamento."
          actionLabel="+ Criar Minha Primeira Meta"
          onAction={openCreateModal}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredGoals.map((g) => {
            const prog = computeGoalProgress(g)
            const typeInfo = GOAL_TYPE_LABELS[g.goal_type] || {
              label: g.goal_type,
              desc: '',
            }
            const isCompleted = g.status === 'concluida' || prog.percent >= 100

            return (
              <div
                key={g.id}
                className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition hover:shadow-md ${
                  isCompleted
                    ? 'border-emerald-300 ring-1 ring-emerald-200'
                    : prog.health === 'atrasada'
                      ? 'border-amber-300'
                      : 'border-slate-200'
                }`}
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase tracking-wide">
                      Régua {PERIOD_LABELS[g.period_type]}
                    </span>

                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Concluída
                      </span>
                    ) : prog.health === 'atrasada' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                        <AlertTriangle className="w-3.5 h-3.5" /> Atenção / Atrasada
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                        <Clock className="w-3.5 h-3.5" /> No prazo
                      </span>
                    )}
                  </div>

                  {/* Título & Descrição */}
                  <h3 className="font-bold text-slate-900 text-base leading-snug tracking-tight">
                    {g.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                    <span>{typeInfo.label}</span>
                  </p>

                  {/* Datas */}
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-2">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {formatDatePtBr(g.start_date)} até {formatDatePtBr(g.end_date)}
                    </span>
                  </div>

                  {/* Barra de Progresso */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700">{prog.percent}% alcançado</span>
                      <span className="font-mono text-slate-500">
                        {formatCurrency(prog.accumulated)} / {formatCurrency(g.target_value)}
                      </span>
                    </div>

                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          isCompleted
                            ? 'bg-emerald-500'
                            : prog.health === 'atrasada'
                              ? 'bg-amber-500'
                              : 'bg-emerald-600'
                        }`}
                        style={{ width: `${Math.min(prog.percent, 100)}%` }}
                      />
                    </div>
                  </div>

                  {g.notes && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg mt-3 border border-slate-100 italic">
                      "{g.notes}"
                    </p>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleComplete(g)}
                    className={`text-xs h-8 px-2.5 ${
                      g.status === 'concluida'
                        ? 'text-slate-600 hover:text-slate-800'
                        : 'text-emerald-700 hover:bg-emerald-50 font-semibold'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    {g.status === 'concluida' ? 'Reabrir Meta' : 'Concluir Meta'}
                  </Button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(g)}
                      className="p-1.5 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition"
                      title="Editar Meta"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTargetId(g.id)}
                      className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                      title="Excluir Meta"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Criar / Editar */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[540px] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-600" />
              {editingGoal ? 'Editar Meta Empresarial' : 'Nova Meta Empresarial'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="mTitle" className="text-xs font-semibold text-slate-700">
                Nome da Meta (o que você deseja alcançar?) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="mTitle"
                placeholder="Ex: Comprar caminhão novo, Crescer 20% no faturamento..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mType" className="text-xs font-semibold text-slate-700">
                  Base / Tipo Concreto <span className="text-red-500">*</span>
                </Label>
                <Select value={goalType} onValueChange={(val: any) => setGoalType(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="faturamento">Faturamento (Receitas)</SelectItem>
                    <SelectItem value="lucro">Lucro Líquido</SelectItem>
                    <SelectItem value="vendas_qtd">Vendas Concluídas</SelectItem>
                    <SelectItem value="reducao_despesas">Teto de Despesas</SelectItem>
                    <SelectItem value="equipamento_investimento">
                      Compra de Equipamento / Expansão
                    </SelectItem>
                    <SelectItem value="livre">Valor Livre / Personalizada</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-slate-400">{GOAL_TYPE_LABELS[goalType]?.desc}</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mPeriod" className="text-xs font-semibold text-slate-700">
                  Régua de Acompanhamento <span className="text-red-500">*</span>
                </Label>
                <Select value={periodType} onValueChange={(val: any) => handlePeriodChange(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensal">Régua Mensal (1 mês)</SelectItem>
                    <SelectItem value="trimestral">Régua Trimestral (3 meses)</SelectItem>
                    <SelectItem value="semestral">Régua Semestral (6 meses)</SelectItem>
                    <SelectItem value="anual">Régua Anual (12 meses)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mStart" className="text-xs font-semibold text-slate-700">
                  Data de Início <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="mStart"
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mEnd" className="text-xs font-semibold text-slate-700">
                  Data Limite (Alvo) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="mEnd"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mTarget" className="text-xs font-semibold text-slate-700">
                  Valor-Alvo em R$ <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="mTarget"
                  placeholder="Ex: 50000.00"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  className="h-9 text-xs font-mono"
                  required
                />
              </div>

              {goalType === 'livre' || goalType === 'equipamento_investimento' ? (
                <div className="space-y-1.5">
                  <Label htmlFor="mManual" className="text-xs font-semibold text-slate-700">
                    Valor Já Acumulado (R$)
                  </Label>
                  <Input
                    id="mManual"
                    placeholder="0,00"
                    value={manualValue}
                    onChange={(e) => setManualValue(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                  <p className="text-[10px] text-slate-400">Progresso manual</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Medição Automática</Label>
                  <div className="h-9 px-3 bg-emerald-50 text-emerald-800 rounded-md border border-emerald-200 text-[11px] flex items-center font-medium">
                    Calculado em tempo real com os lançamentos
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mNotes" className="text-xs font-semibold text-slate-700">
                Observações e Plano de Ação (Opcional)
              </Label>
              <Textarea
                id="mNotes"
                placeholder="Ex: Destinar 15% das vendas para conta poupança específica..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs min-h-[70px]"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Salvando...
                  </>
                ) : (
                  'Salvar Meta'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação Exclusão */}
      <Dialog open={!!deleteTargetId} onOpenChange={() => setDeleteTargetId(null)}>
        <DialogContent className="w-[92vw] sm:max-w-[400px] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Excluir esta Meta?
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-500">
            Deseja excluir esta meta e o histórico de acompanhamento? Esta ação não pode ser
            desfeita.
          </p>
          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTargetId(null)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} className="text-xs">
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Metas
