import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Building2,
  Package,
  ShoppingCart,
  ChevronRight,
  Receipt,
  PieChart as PieChartIcon,
  Target,
  CalendarDays,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  BookOpen,
} from 'lucide-react'
import HelpModal from '@/components/HelpModal'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { useAuth } from '@/contexts/AuthContext'
import {
  getEntries,
  getExpenses,
  getPayables,
  getReceivables,
  getMovements,
  getSales,
  getGoals,
  getAgendaEvents,
  getQuotes,
} from '@/services/erp'
import type {
  Entry,
  Expense,
  Payable,
  Receivable,
  Movement,
  Sale,
  Goal,
  AgendaEvent,
  Quote,
} from '@/types/erp'
import { formatCurrency, formatDatePtBr } from '@/lib/formatters'
import { useRealtime } from '@/hooks/use-realtime'
import { Button } from '@/components/ui/button'
import WelcomeDailyModal from '@/components/WelcomeDailyModal'

const PIE_COLORS = [
  '#10B981', // emerald-500
  '#3B82F6', // blue-500
  '#F59E0B', // amber-500
  '#EC4899', // pink-500
  '#8B5CF6', // purple-500
  '#06B6D4', // cyan-500
  '#EF4444', // red-500
  '#64748B', // slate-500
]

export const Dashboard: React.FC = () => {
  const { user, company } = useAuth()
  const navigate = useNavigate()

  const [entries, setEntries] = useState<Entry[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [payables, setPayables] = useState<Payable[]>([])
  const [receivables, setReceivables] = useState<Receivable[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [agendaEvents, setAgendaEvents] = useState<AgendaEvent[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [helpModalOpen, setHelpModalOpen] = useState(false)
  const [selectedHelpTopic, setSelectedHelpTopic] = useState<string | null>(null)

  const handleOpenDashboardHelp = (topicId?: string) => {
    setSelectedHelpTopic(topicId || null)
    setHelpModalOpen(true)
  }

  const loadData = useCallback(async () => {
    if (!company) return
    try {
      const [
        entData,
        expData,
        payData,
        recData,
        movData,
        salData,
        goalData,
        agendaData,
        quotesData,
      ] = await Promise.all([
        getEntries(company.id),
        getExpenses(company.id),
        getPayables(company.id),
        getReceivables(company.id),
        getMovements(company.id),
        getSales(company.id),
        getGoals(company.id),
        getAgendaEvents(company.id),
        getQuotes(company.id),
      ])
      setEntries(entData)
      setExpenses(expData)
      setPayables(payData)
      setReceivables(recData)
      setMovements(movData)
      setSales(salData)
      setGoals(goalData)
      setAgendaEvents(agendaData)
      setQuotes(quotesData)
    } catch (err) {
      console.error('Erro ao carregar dados do Dashboard:', err)
    } finally {
      setLoading(false)
    }
  }, [company])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Realtime updates
  useRealtime('entries', () => loadData(), !!company)
  useRealtime('expenses', () => loadData(), !!company)
  useRealtime('payables', () => loadData(), !!company)
  useRealtime('receivables', () => loadData(), !!company)
  useRealtime('movements', () => loadData(), !!company)
  useRealtime('sales', () => loadData(), !!company)
  useRealtime('goals', () => loadData(), !!company)
  useRealtime('agenda_events', () => loadData(), !!company)
  useRealtime('quotes', () => loadData(), !!company)

  // Cálculos do Mês Corrente
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()

  const currentMonthEntries = useMemo(() => {
    return entries.filter((e) => {
      const d = new Date(e.entry_date)
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear
    })
  }, [entries, currentMonth, currentYear])

  const currentMonthExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const d = new Date(e.expense_date)
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear
    })
  }, [expenses, currentMonth, currentYear])

  const currentMonthSales = useMemo(() => {
    return sales.filter((s) => {
      const d = new Date(s.sale_date)
      return (
        d.getMonth() === currentMonth && d.getFullYear() === currentYear && s.status === 'Concluída'
      )
    })
  }, [sales, currentMonth, currentYear])

  const totalReceitasMes = useMemo(() => {
    return currentMonthEntries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
  }, [currentMonthEntries])

  const totalDespesasMes = useMemo(() => {
    return currentMonthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
  }, [currentMonthExpenses])

  const saldoDisponivel = totalReceitasMes - totalDespesasMes

  const totalContasReceberPendentes = useMemo(() => {
    return receivables
      .filter((r) => r.status === 'Em aberto')
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
  }, [receivables])

  // 1. Gráfico de Pizza: Despesas por Categoria (Mês Atual ou Total Recente)
  const expensesByCategoryData = useMemo(() => {
    const map = new Map<string, number>()
    // Preferência pelo mês corrente; se vazio, pega todas
    const source = currentMonthExpenses.length > 0 ? currentMonthExpenses : expenses
    source.forEach((exp) => {
      const cat = exp.category || 'Outros'
      const val = Number(exp.amount) || 0
      map.set(cat, (map.get(cat) || 0) + val)
    })

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [currentMonthExpenses, expenses])

  // 2. Gráfico Donut: Receitas vs Despesas vs Saldo Operacional
  const receitasVsDespesasDonut = useMemo(() => {
    return [
      { name: 'Receitas', value: totalReceitasMes, color: '#10B981' },
      { name: 'Despesas', value: totalDespesasMes, color: '#EF4444' },
    ]
  }, [totalReceitasMes, totalDespesasMes])

  // 3. Gráfico Barras: Vendas e Faturamento por Mês (últimos 6 meses)
  const salesAndRevenueLast6Months = useMemo(() => {
    const months = []
    const now = new Date()

    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const m = targetDate.getMonth()
      const y = targetDate.getFullYear()
      const monthLabel = targetDate.toLocaleString('pt-BR', { month: 'short' })

      const sumEntries = entries
        .filter((e) => {
          const d = new Date(e.entry_date)
          return d.getMonth() === m && d.getFullYear() === y
        })
        .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)

      const sumExpenses = expenses
        .filter((e) => {
          const d = new Date(e.expense_date)
          return d.getMonth() === m && d.getFullYear() === y
        })
        .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)

      const sumSales = sales
        .filter((s) => {
          const d = new Date(s.sale_date)
          return d.getMonth() === m && d.getFullYear() === y && s.status === 'Concluída'
        })
        .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)

      months.push({
        month: `${monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}`,
        receitas: sumEntries,
        despesas: sumExpenses,
        vendas: sumSales,
        saldo: sumEntries - sumExpenses,
      })
    }

    return months
  }, [entries, expenses, sales])

  // Próximos Vencimentos (Priorizando os mais urgentes: atrasados e próximos)
  const proximosVencimentos = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0]

    const mappedPayables = payables
      .filter((p) => p.status === 'Em aberto')
      .map((p) => {
        const d = p.due_date.split('T')[0]
        return {
          id: p.id,
          kind: 'pagar' as const,
          description: p.description,
          party: p.supplier || 'Fornecedor',
          amount: Number(p.amount) || 0,
          dueDate: d,
          isOverdue: d < todayStr,
          isToday: d === todayStr,
        }
      })

    const mappedReceivables = receivables
      .filter((r) => r.status === 'Em aberto')
      .map((r) => {
        const d = r.due_date.split('T')[0]
        return {
          id: r.id,
          kind: 'receber' as const,
          description: r.description,
          party: (r.expand?.client_id as any)?.name || 'Cliente',
          amount: Number(r.amount) || 0,
          dueDate: d,
          isOverdue: d < todayStr,
          isToday: d === todayStr,
        }
      })

    return [...mappedPayables, ...mappedReceivables]
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 5)
  }, [payables, receivables])

  // Metas Ativas com progresso calculado
  const activeGoalsSummary = useMemo(() => {
    return goals
      .filter((g) => g.status === 'em_andamento')
      .slice(0, 3)
      .map((g) => {
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
        } else {
          accumulated = Number(g.current_value) || 0
        }

        const pct = g.target_value > 0 ? (accumulated / g.target_value) * 100 : 0
        return {
          id: g.id,
          title: g.title,
          period: g.period_type,
          target: g.target_value,
          accumulated,
          percent: Math.min(Math.round(pct), 100),
        }
      })
  }, [goals, entries, expenses, sales])

  // Pedidos e Entregas do Dia
  const todayIso = new Date().toISOString().split('T')[0]
  const todayAgenda = useMemo(() => {
    return agendaEvents.filter((ev) => ev.event_date.split('T')[0] === todayIso)
  }, [agendaEvents, todayIso])

  const todayPayables = useMemo(() => {
    return payables.filter((p) => p.due_date.split('T')[0] === todayIso && p.status === 'Em aberto')
  }, [payables, todayIso])

  const todayReceivables = useMemo(() => {
    return receivables.filter(
      (r) => r.due_date.split('T')[0] === todayIso && r.status === 'Em aberto',
    )
  }, [receivables, todayIso])

  const recentMovements = useMemo(() => {
    return movements.slice(0, 6)
  }, [movements])

  // Pedidos e Orçamentos em Aberto (Resumo Consolidado para o Dashboard)
  const openOrdersSummary = useMemo(() => {
    const sentQuotes = quotes.filter((q) => q.status === 'Enviado')
    const pendingAgenda = agendaEvents.filter(
      (ev) => ev.status === 'pendente' || ev.status === 'em_andamento',
    )
    const count = sentQuotes.length + pendingAgenda.length
    const quotesTotal = sentQuotes.reduce((sum, q) => sum + (Number(q.total_amount) || 0), 0)
    const agendaTotal = pendingAgenda.reduce((sum, ev) => sum + (Number(ev.amount) || 0), 0)
    const totalAmount = quotesTotal + agendaTotal

    return {
      count,
      totalAmount,
      sentQuotesCount: sentQuotes.length,
      pendingAgendaCount: pendingAgenda.length,
    }
  }, [quotes, agendaEvents])

  return (
    <div className="space-y-6">
      {/* Modal / Tela de Boas-vindas Diária */}
      <WelcomeDailyModal
        userName={user?.name}
        companyName={company?.trade_name}
        todayEvents={todayAgenda}
        todayPayables={todayPayables}
        todayReceivables={todayReceivables}
      />

      {/* Top Welcome + Company Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-slate-900">
            Olá, {user?.name || 'Gestor'}! 👋
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Aqui está o controle completo e a visão 360° da sua empresa.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {company && (
            <div className="flex items-center justify-between gap-3 bg-slate-50 p-2.5 sm:px-3.5 sm:py-2 rounded-xl border border-slate-200/80">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-emerald-600/10 text-emerald-700 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="text-xs leading-tight min-w-0">
                  <p className="font-bold text-slate-900 truncate max-w-[130px] sm:max-w-[160px]">
                    {company.trade_name}
                  </p>
                  <p className="text-slate-500 font-mono text-[10px] truncate">{company.cnpj}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/configuracoes')}
                className="text-[11px] text-slate-600 hover:text-slate-900 shrink-0 h-7 px-2"
              >
                Editar
              </Button>
            </div>
          )}

          {/* Botão de Destaque para Tutorial no Dashboard */}
          <Button
            onClick={() => handleOpenDashboardHelp()}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold h-9 px-3 shrink-0 flex items-center gap-1.5 shadow-2xs"
            title="Aprenda como operar cada funcionalidade"
          >
            <HelpCircle className="w-4 h-4 text-emerald-600" />
            <span>Guia & Tutorial</span>
          </Button>
        </div>
      </div>

      {/* Help Modal Integrado ao Dashboard */}
      <HelpModal
        open={helpModalOpen}
        onOpenChange={setHelpModalOpen}
        initialTopicId={selectedHelpTopic}
      />

      {/* Quick Actions Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        <Button
          onClick={() => navigate('/vendas')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9 px-3.5 shadow-xs flex items-center gap-1.5 shrink-0"
        >
          <ShoppingCart className="w-4 h-4" /> + Nova Venda
        </Button>
        <Button
          onClick={() => navigate('/pedidos-em-aberto')}
          variant="outline"
          className="border-slate-300 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 text-xs font-semibold h-9 px-3.5 shrink-0"
        >
          <Clock className="w-4 h-4 text-emerald-600" /> Pedidos em Aberto (
          {openOrdersSummary.count})
        </Button>
        <Button
          onClick={() => navigate('/agenda')}
          variant="outline"
          className="border-slate-300 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 text-xs font-semibold h-9 px-3.5 shrink-0"
        >
          <CalendarDays className="w-4 h-4 text-emerald-600" /> Agenda de Entregas
        </Button>
        <Button
          onClick={() => navigate('/metas')}
          variant="outline"
          className="border-slate-300 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 text-xs font-semibold h-9 px-3.5 shrink-0"
        >
          <Target className="w-4 h-4 text-emerald-600" /> Sistema de Metas
        </Button>
        <Button
          onClick={() => navigate('/relatorios')}
          variant="outline"
          className="border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold h-9 px-3.5 shrink-0"
        >
          <FileSpreadsheet className="w-4 h-4 text-slate-600" /> Relatórios
        </Button>
        <Button
          onClick={() => navigate('/receitas')}
          variant="outline"
          className="border-slate-300 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 text-xs font-semibold h-9 px-3.5 shrink-0"
        >
          <ArrowDownLeft className="w-4 h-4 text-emerald-600" /> + Receita
        </Button>
        <Button
          onClick={() => navigate('/despesas')}
          variant="outline"
          className="border-slate-300 text-slate-700 hover:bg-red-50 hover:text-red-700 hover:border-red-300 text-xs font-semibold h-9 px-3.5 shrink-0"
        >
          <ArrowUpRight className="w-4 h-4 text-red-600" /> + Despesa
        </Button>
      </div>

      {/* 5 Metric Cards (Incluindo Pedidos em Aberto) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Pedidos em Aberto (Novo) */}
        <div
          onClick={() => navigate('/pedidos-em-aberto')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-emerald-300 hover:shadow-sm transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 group-hover:text-emerald-700 transition">
              Pedidos em Aberto
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
              {formatCurrency(openOrdersSummary.totalAmount)}
            </p>
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium mt-1">
              <span>{openOrdersSummary.count} aguardando</span>
              <span className="text-emerald-600 font-semibold group-hover:underline">
                Ver todos →
              </span>
            </div>
          </div>
        </div>
        {/* Receitas do Mês */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Receitas do Mês
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
              {formatCurrency(totalReceitasMes)}
            </p>
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium mt-1">
              <span>{currentMonthEntries.length} lançamento(s)</span>
            </div>
          </div>
        </div>

        {/* Despesas do Mês */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Despesas do Mês
            </span>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
              {formatCurrency(totalDespesasMes)}
            </p>
            <div className="flex items-center gap-1 text-[11px] text-red-600 font-medium mt-1">
              <span>{currentMonthExpenses.length} lançamento(s)</span>
            </div>
          </div>
        </div>

        {/* Saldo Disponível */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Saldo Operacional Líquido
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p
              className={`text-2xl font-bold tracking-tight font-mono ${
                saldoDisponivel >= 0 ? 'text-emerald-700' : 'text-red-700'
              }`}
            >
              {formatCurrency(saldoDisponivel)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Receitas - Despesas no mês</p>
          </div>
        </div>

        {/* Contas a Receber */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              A Receber (Em Aberto)
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
              {formatCurrency(totalContasReceberPendentes)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Previsão futura de caixa</p>
          </div>
        </div>
      </div>

      {/* Resumo de Metas Ativas (Banner de Destaque) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-800 text-sm tracking-tight">
              Metas Ativas da Empresa (Réguas de Crescimento)
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/metas')}
            className="text-xs text-emerald-700 hover:text-emerald-800 h-8 px-2.5 font-medium"
          >
            Gerenciar Metas <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>

        {activeGoalsSummary.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <span>
              Você ainda não definiu metas para este período. Comece estabelecendo um objetivo de
              faturamento ou compra de equipamento!
            </span>
            <Button
              size="sm"
              onClick={() => navigate('/metas')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 shrink-0"
            >
              + Criar Meta
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {activeGoalsSummary.map((g) => (
              <div
                key={g.id}
                onClick={() => navigate('/metas')}
                className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 hover:border-emerald-300 transition cursor-pointer space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                    Régua {g.period}
                  </span>
                  <span className="text-xs font-bold text-emerald-700 font-mono">{g.percent}%</span>
                </div>
                <h4 className="font-bold text-xs text-slate-900 truncate">{g.title}</h4>
                <div className="space-y-1">
                  <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full transition-all"
                      style={{ width: `${g.percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                    <span>{formatCurrency(g.accumulated)}</span>
                    <span>{formatCurrency(g.target)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Seção Gráfica 1: Vendas por Mês (Barras) & Evolução de Saldo / Caixa (Linha) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Vendas & Receitas por Mês (Barras) */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-slate-800 text-sm tracking-tight">
                Vendas & Receitas por Mês
              </h3>
              <p className="text-xs text-slate-400">Histórico dos últimos 6 meses</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-emerald-500" />
                <span className="text-slate-600">Receitas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-blue-500" />
                <span className="text-slate-600">Vendas</span>
              </div>
            </div>
          </div>

          <div className="h-56 sm:h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={salesAndRevenueLast6Months}
                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={10} tickLine={false} />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={10}
                  tickLine={false}
                  tickFormatter={(val) => `R$${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`}
                />
                <Tooltip
                  formatter={(val: any) => formatCurrency(Number(val))}
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderRadius: '8px',
                    color: '#fff',
                    border: 'none',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="receitas" fill="#10B981" radius={[4, 4, 0, 0]} barSize={14} />
                <Bar dataKey="vendas" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Evolução de Saldo / Caixa (Linha com gradiente) */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-sm tracking-tight">
                Evolução de Saldo / Caixa Líquido
              </h3>
              <p className="text-xs text-slate-400">Receitas menos despesas realizadas</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
              Fluxo Real
            </span>
          </div>

          <div className="h-56 sm:h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={salesAndRevenueLast6Months}
                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={10} tickLine={false} />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={10}
                  tickLine={false}
                  tickFormatter={(val) => `R$${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`}
                />
                <Tooltip
                  formatter={(val: any) => formatCurrency(Number(val))}
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderRadius: '8px',
                    color: '#fff',
                    border: 'none',
                    fontSize: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="saldo"
                  stroke="#059669"
                  strokeWidth={3}
                  dot={{ r: 3, fill: '#059669' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Seção Gráfica 2: Pizzas (Despesas por Categoria & Receitas vs Despesas) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Pizza: Despesas por Categoria */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div>
              <h3 className="font-bold text-slate-800 text-sm tracking-tight flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-emerald-600" />
                Despesas por Categoria
              </h3>
              <p className="text-xs text-slate-400">Distribuição dos custos da empresa</p>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Total: {formatCurrency(totalDespesasMes)}
            </span>
          </div>

          {expensesByCategoryData.length === 0 ? (
            <div className="py-12 sm:py-16 text-center text-xs text-slate-400">
              Nenhuma despesa registrada para composição do gráfico.
            </div>
          ) : (
            <div className="h-60 sm:h-64 w-full min-w-0 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expensesByCategoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {expensesByCategoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => formatCurrency(Number(val))}
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderRadius: '8px',
                      color: '#fff',
                      border: 'none',
                      fontSize: '12px',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '10px', paddingTop: '6px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Donut: Receitas vs Despesas vs Saldo */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div>
              <h3 className="font-bold text-slate-800 text-sm tracking-tight">
                Receitas vs Despesas (Proporção)
              </h3>
              <p className="text-xs text-slate-400">Visão consolidada do mês corrente</p>
            </div>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full w-fit ${
                saldoDisponivel >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
              }`}
            >
              {saldoDisponivel >= 0 ? 'Superávit' : 'Déficit'}
            </span>
          </div>

          {totalReceitasMes === 0 && totalDespesasMes === 0 ? (
            <div className="py-12 sm:py-16 text-center text-xs text-slate-400">
              Sem dados financeiros suficientes no mês corrente.
            </div>
          ) : (
            <div className="h-60 sm:h-64 w-full min-w-0 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={receitasVsDespesasDonut}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {receitasVsDespesasDonut.map((entry, index) => (
                      <Cell key={`donut-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => formatCurrency(Number(val))}
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderRadius: '8px',
                      color: '#fff',
                      border: 'none',
                      fontSize: '12px',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '10px', paddingTop: '6px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* 2-Columns: Próximos Vencimentos & Últimas Movimentações */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bloco Alertas: 5 Vencimentos Mais Urgentes */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm tracking-tight">
                    Alertas: Vencimentos Mais Urgentes
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    5 títulos prioritários a pagar ou receber
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                Atenção
              </span>
            </div>

            {proximosVencimentos.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Nenhum título vencido ou a vencer encontrado. Parabéns, seu caixa está em dia!
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {proximosVencimentos.map((v) => (
                  <div
                    key={`${v.kind}-${v.id}`}
                    onClick={() =>
                      navigate(v.kind === 'pagar' ? '/contas-a-pagar' : '/contas-a-receber')
                    }
                    className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 p-1.5 rounded-lg transition cursor-pointer group"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            v.kind === 'pagar'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {v.kind === 'pagar' ? 'A Pagar' : 'A Receber'}
                        </span>
                        <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-emerald-700 transition-colors">
                          {v.description}
                        </p>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                        {v.party} • Vencimento: {formatDatePtBr(v.dueDate)}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p
                        className={`text-xs font-bold font-mono ${
                          v.kind === 'pagar' ? 'text-red-700' : 'text-emerald-700'
                        }`}
                      >
                        {v.kind === 'pagar' ? '-' : '+'} {formatCurrency(v.amount)}
                      </p>
                      {v.isOverdue ? (
                        <span className="inline-block text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-0.2 rounded mt-0.5 animate-pulse">
                          Atrasado
                        </span>
                      ) : v.isToday ? (
                        <span className="inline-block text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded mt-0.5">
                          Vence Hoje
                        </span>
                      ) : (
                        <span className="inline-block text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded mt-0.5">
                          Em aberto
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400">Clique para abrir e quitar</span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/contas-a-pagar')}
                className="text-xs text-red-700 border-red-200 hover:bg-red-50 h-8"
              >
                Contas a Pagar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/contas-a-receber')}
                className="text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50 h-8"
              >
                Contas a Receber
              </Button>
            </div>
          </div>
        </div>

        {/* Últimas Movimentações */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm tracking-tight">
                Últimas Movimentações (Ledger)
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/entradas-saidas')}
                className="text-xs text-emerald-600 hover:text-emerald-700 h-7 px-2"
              >
                Ver todas
              </Button>
            </div>

            {recentMovements.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Nenhuma movimentação financeira registrada ainda.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentMovements.map((m) => (
                  <div key={m.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          m.type === 'entrada'
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-red-50 text-red-600'
                        }`}
                      >
                        {m.type === 'entrada' ? (
                          <ArrowDownLeft className="w-4 h-4" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">
                          {m.description}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {formatDatePtBr(m.movement_date)} • {m.category || 'Geral'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-xs font-bold font-mono ${
                          m.type === 'entrada' ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {m.type === 'entrada' ? '+' : '-'} {formatCurrency(m.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
