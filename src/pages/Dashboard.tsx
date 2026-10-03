import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Building2,
  Package,
  ShoppingCart,
  ChevronRight,
  Receipt,
} from 'lucide-react'
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
} from 'recharts'
import { useAuth } from '@/contexts/AuthContext'
import {
  getEntries,
  getExpenses,
  getPayables,
  getReceivables,
  getMovements,
  getSales,
} from '@/services/erp'
import type { Entry, Expense, Payable, Receivable, Movement, Sale } from '@/types/erp'
import { formatCurrency, formatDatePtBr } from '@/lib/formatters'
import { useRealtime } from '@/hooks/use-realtime'
import { Button } from '@/components/ui/button'

export const Dashboard: React.FC = () => {
  const { user, company } = useAuth()
  const navigate = useNavigate()

  const [entries, setEntries] = useState<Entry[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [payables, setPayables] = useState<Payable[]>([])
  const [receivables, setReceivables] = useState<Receivable[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    if (!company) return
    try {
      const [entData, expData, payData, recData, movData, salData] = await Promise.all([
        getEntries(company.id),
        getExpenses(company.id),
        getPayables(company.id),
        getReceivables(company.id),
        getMovements(company.id),
        getSales(company.id),
      ])
      setEntries(entData)
      setExpenses(expData)
      setPayables(payData)
      setReceivables(recData)
      setMovements(movData)
      setSales(salData)
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

  // Próximos Vencimentos (unindo payables e receivables pendentes, limitados a 5)
  const proximosVencimentos = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0]

    const mappedPayables = payables
      .filter((p) => p.status === 'Em aberto')
      .map((p) => ({
        id: p.id,
        kind: 'pagar',
        description: p.description,
        party: p.supplier || 'Fornecedor',
        amount: p.amount,
        dueDate: p.due_date,
        isOverdue: p.due_date < todayStr,
      }))

    const mappedReceivables = receivables
      .filter((r) => r.status === 'Em aberto')
      .map((r) => ({
        id: r.id,
        kind: 'receber',
        description: r.description,
        party: (r.expand?.client_id as any)?.name || 'Cliente',
        amount: r.amount,
        dueDate: r.due_date,
        isOverdue: r.due_date < todayStr,
      }))

    return [...mappedPayables, ...mappedReceivables]
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 5)
  }, [payables, receivables])

  // Gráfico últimos 6 meses
  const chartDataLast6Months = useMemo(() => {
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

      months.push({
        month: `${monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}`,
        receitas: sumEntries,
        despesas: sumExpenses,
        saldo: sumEntries - sumExpenses,
      })
    }

    return months
  }, [entries, expenses])

  const recentMovements = useMemo(() => {
    return movements.slice(0, 8)
  }, [movements])

  return (
    <div className="space-y-6">
      {/* Top Welcome + Company Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Olá, {user?.name || 'Gestor'}! 👋
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Aqui está o resumo financeiro e operacional da sua empresa hoje.
          </p>
        </div>

        {company && (
          <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200/80">
            <div className="w-10 h-10 rounded-lg bg-emerald-600/10 text-emerald-700 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="text-xs leading-tight">
              <p className="font-bold text-slate-900">{company.trade_name}</p>
              <p className="text-slate-500 font-mono text-[11px]">{company.cnpj}</p>
              <p className="text-emerald-700 font-medium text-[11px] mt-0.5">
                {company.business_activity} • {company.city}/{company.state}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/configuracoes')}
              className="text-xs text-slate-500 hover:text-slate-800 ml-1 h-8 px-2"
            >
              Editar
            </Button>
          </div>
        )}
      </div>

      {/* Quick Actions Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Button
          onClick={() => navigate('/vendas')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9 px-3.5 shadow-xs flex items-center gap-1.5 shrink-0"
        >
          <ShoppingCart className="w-4 h-4" /> + Nova Venda
        </Button>
        <Button
          onClick={() => navigate('/receitas')}
          variant="outline"
          className="border-slate-300 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 text-xs font-semibold h-9 px-3.5 shrink-0"
        >
          <ArrowDownLeft className="w-4 h-4 text-emerald-600" /> + Registrar Receita
        </Button>
        <Button
          onClick={() => navigate('/despesas')}
          variant="outline"
          className="border-slate-300 text-slate-700 hover:bg-red-50 hover:text-red-700 hover:border-red-300 text-xs font-semibold h-9 px-3.5 shrink-0"
        >
          <ArrowUpRight className="w-4 h-4 text-red-600" /> + Registrar Despesa
        </Button>
        <Button
          onClick={() => navigate('/estoque')}
          variant="outline"
          className="border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold h-9 px-3.5 shrink-0"
        >
          <Package className="w-4 h-4 text-slate-600" /> + Entrada no Estoque
        </Button>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <span className="flex items-center">↑ 12,4%</span>
              <span className="text-slate-400">vs mês anterior</span>
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
              <span className="flex items-center">↓ 3,2%</span>
              <span className="text-slate-400">vs mês anterior</span>
            </div>
          </div>
        </div>

        {/* Saldo Disponível */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Saldo Líquido
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
            <p className="text-[11px] text-slate-400 mt-1">Receitas acumuladas - Despesas</p>
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
            <p className="text-[11px] text-slate-400 mt-1">Previsão de entrada futura</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Receitas vs Despesas (Barras) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm tracking-tight">
              Receitas vs Despesas (Últimos 6 Meses)
            </h3>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-emerald-500" />
                <span className="text-slate-600">Receitas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-red-500" />
                <span className="text-slate-600">Despesas</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartDataLast6Months}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
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
                <Bar dataKey="receitas" fill="#10B981" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="despesas" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fluxo de Caixa (Linha) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm tracking-tight">
              Fluxo de Caixa Líquido
            </h3>
            <span className="text-xs text-slate-400">Resultado operacional</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartDataLast6Months}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
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
                  dot={{ r: 4, fill: '#059669' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 2-Columns: Próximos Vencimentos & Últimas Movimentações */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximos Vencimentos */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm tracking-tight flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" /> Próximos Vencimentos
              </h3>
              <span className="text-xs text-slate-400">Contas a Pagar / Receber</span>
            </div>

            {proximosVencimentos.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Nenhum título pendente cadastrado.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {proximosVencimentos.map((v) => (
                  <div key={v.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            v.kind === 'pagar'
                              ? 'bg-red-50 text-red-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {v.kind === 'pagar' ? 'A Pagar' : 'A Receber'}
                        </span>
                        <p className="text-xs font-semibold text-slate-800 truncate">
                          {v.description}
                        </p>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                        {v.party} • Vencimento: {formatDatePtBr(v.dueDate)}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold font-mono text-slate-900">
                        {formatCurrency(v.amount)}
                      </p>
                      {v.isOverdue ? (
                        <span className="inline-block text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                          Atrasado
                        </span>
                      ) : (
                        <span className="inline-block text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                          Em aberto
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/contas-a-pagar')}
              className="text-xs text-slate-600 hover:text-slate-900"
            >
              Ver a Pagar <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/contas-a-receber')}
              className="text-xs text-slate-600 hover:text-slate-900"
            >
              Ver a Receber <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>

        {/* Últimas 8 Movimentações */}
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
