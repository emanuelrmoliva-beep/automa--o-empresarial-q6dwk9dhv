import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
  CheckCircle2,
  Filter,
  DollarSign,
  TrendingUp,
  Receipt,
  CreditCard,
  Building2,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import { getPayables, getReceivables, getEntries, getExpenses, getSales } from '@/services/erp'
import type { Payable, Receivable, Entry, Expense, Sale } from '@/types/erp'
import { formatCurrency, formatDatePtBr } from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export const Relatorios: React.FC = () => {
  const { company } = useAuth()
  const { toast } = useToast()

  const [payables, setPayables] = useState<Payable[]>([])
  const [receivables, setReceivables] = useState<Receivable[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)

  // Filtro de mês para o resumo mensal
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth())

  const loadData = useCallback(async () => {
    if (!company) return
    try {
      const [payData, recData, entData, expData, salData] = await Promise.all([
        getPayables(company.id),
        getReceivables(company.id),
        getEntries(company.id),
        getExpenses(company.id),
        getSales(company.id),
      ])
      setPayables(payData)
      setReceivables(recData)
      setEntries(entData)
      setExpenses(expData)
      setSales(salData)
    } catch (err) {
      console.error('Erro ao carregar dados dos relatórios:', err)
    } finally {
      setLoading(false)
    }
  }, [company])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('payables', () => loadData(), !!company)
  useRealtime('receivables', () => loadData(), !!company)
  useRealtime('entries', () => loadData(), !!company)
  useRealtime('expenses', () => loadData(), !!company)
  useRealtime('sales', () => loadData(), !!company)

  // 1. Agrupamento de Vencimentos Futuros
  const vencimentosAgrupados = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayIso = today.toISOString().split('T')[0]

    // Datas de corte
    const day7 = new Date(today)
    day7.setDate(day7.getDate() + 7)
    const day7Iso = day7.toISOString().split('T')[0]

    const day15 = new Date(today)
    day15.setDate(day15.getDate() + 15)
    const day15Iso = day15.toISOString().split('T')[0]

    const day30 = new Date(today)
    day30.setDate(day30.getDate() + 30)
    const day30Iso = day30.toISOString().split('T')[0]

    const day60 = new Date(today)
    day60.setDate(day60.getDate() + 60)
    const day60Iso = day60.toISOString().split('T')[0]

    // Unifica e mapeia títulos em aberto
    const allTitles = [
      ...payables
        .filter((p) => p.status === 'Em aberto')
        .map((p) => ({
          id: p.id,
          tipo: 'A Pagar' as const,
          descricao: p.description,
          contraparte: p.supplier || 'Fornecedor',
          vencimento: p.due_date.split('T')[0],
          valor: Number(p.amount) || 0,
        })),
      ...receivables
        .filter((r) => r.status === 'Em aberto')
        .map((r) => ({
          id: r.id,
          tipo: 'A Receber' as const,
          descricao: r.description,
          contraparte: (r.expand?.client_id as any)?.name || 'Cliente',
          vencimento: r.due_date.split('T')[0],
          valor: Number(r.amount) || 0,
        })),
    ].sort((a, b) => a.vencimento.localeCompare(b.vencimento))

    const vencidas = allTitles.filter((t) => t.vencimento < todayIso)
    const hoje = allTitles.filter((t) => t.vencimento === todayIso)
    const estaSemana = allTitles.filter((t) => t.vencimento > todayIso && t.vencimento <= day7Iso)
    const proximos15Dias = allTitles.filter(
      (t) => t.vencimento > day7Iso && t.vencimento <= day15Iso,
    )
    const proximos30Dias = allTitles.filter(
      (t) => t.vencimento > day15Iso && t.vencimento <= day30Iso,
    )
    const proximos60Dias = allTitles.filter(
      (t) => t.vencimento > day30Iso && t.vencimento <= day60Iso,
    )
    const maisDe60Dias = allTitles.filter((t) => t.vencimento > day60Iso)

    const calcSum = (list: typeof allTitles) => {
      const pagar = list.filter((t) => t.tipo === 'A Pagar').reduce((s, t) => s + t.valor, 0)
      const receber = list.filter((t) => t.tipo === 'A Receber').reduce((s, t) => s + t.valor, 0)
      return { pagar, receber, saldo: receber - pagar, total: list.length }
    }

    return {
      vencidas: { items: vencidas, stats: calcSum(vencidas) },
      hoje: { items: hoje, stats: calcSum(hoje) },
      estaSemana: { items: estaSemana, stats: calcSum(estaSemana) },
      proximos15Dias: { items: proximos15Dias, stats: calcSum(proximos15Dias) },
      proximos30Dias: { items: proximos30Dias, stats: calcSum(proximos30Dias) },
      proximos60Dias: { items: proximos60Dias, stats: calcSum(proximos60Dias) },
      maisDe60Dias: { items: maisDe60Dias, stats: calcSum(maisDe60Dias) },
      todos: allTitles,
    }
  }, [payables, receivables])

  // 2. Resumo Mensal Consolidado (DRE Gerencial Simples)
  const monthlySummary = useMemo(() => {
    // Filtrar lançamentos pelo mês e ano selecionados
    const mEntries = entries.filter((e) => {
      const d = new Date(e.entry_date)
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear
    })

    const mExpenses = expenses.filter((e) => {
      const d = new Date(e.expense_date)
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear
    })

    const mSales = sales.filter((s) => {
      const d = new Date(s.sale_date)
      return (
        d.getMonth() === selectedMonth &&
        d.getFullYear() === selectedYear &&
        s.status === 'Concluída'
      )
    })

    const totalReceitas = mEntries.reduce((s, e) => s + (Number(e.amount) || 0), 0)
    const totalReceitasRecebidas = mEntries
      .filter((e) => e.status === 'Recebida')
      .reduce((s, e) => s + (Number(e.amount) || 0), 0)
    const totalReceitasPendentes = mEntries
      .filter((e) => e.status === 'Pendente')
      .reduce((s, e) => s + (Number(e.amount) || 0), 0)

    const totalDespesas = mExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)
    const totalDespesasPagas = mExpenses
      .filter((e) => e.status === 'Paga')
      .reduce((s, e) => s + (Number(e.amount) || 0), 0)
    const totalDespesasPendentes = mExpenses
      .filter((e) => e.status === 'Pendente')
      .reduce((s, e) => s + (Number(e.amount) || 0), 0)

    const totalVendas = mSales.reduce((s, e) => s + (Number(e.amount) || 0), 0)

    // Agrupamento de despesas por categoria no mês
    const expensesByCategory = new Map<string, number>()
    mExpenses.forEach((exp) => {
      const cat = exp.category || 'Outros'
      const val = Number(exp.amount) || 0
      expensesByCategory.set(cat, (expensesByCategory.get(cat) || 0) + val)
    })

    const resultadoOperacional = totalReceitasRecebidas - totalDespesasPagas
    const margemOperacional =
      totalReceitasRecebidas > 0 ? (resultadoOperacional / totalReceitasRecebidas) * 100 : 0

    return {
      totalReceitas,
      totalReceitasRecebidas,
      totalReceitasPendentes,
      totalDespesas,
      totalDespesasPagas,
      totalDespesasPendentes,
      totalVendas,
      resultadoOperacional,
      margemOperacional: Math.round(margemOperacional * 10) / 10,
      expensesByCategory: Array.from(expensesByCategory.entries()).sort((a, b) => b[1] - a[1]),
      mEntries,
      mExpenses,
      mSales,
    }
  }, [entries, expenses, sales, selectedMonth, selectedYear])

  // Função utilitária para exportação CSV (compatível com Excel pt-BR usando BOM e separador ;)
  const downloadCsv = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const csvContent =
      '\uFEFF' +
      [
        headers.join(';'),
        ...rows.map((r) =>
          r
            .map((val) => {
              if (typeof val === 'number') {
                return `"${val.toFixed(2).replace('.', ',')}"`
              }
              return `"${String(val).replace(/"/g, '""')}"`
            })
            .join(';'),
        ),
      ].join('\r\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${filename}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast({
      title: 'Relatório CSV exportado!',
      description: `Arquivo ${filename}.csv baixado com sucesso.`,
    })
  }

  // Exportar Vencimentos Futuros
  const handleExportVencimentos = () => {
    const headers = ['Tipo', 'Descrição', 'Fornecedor/Cliente', 'Vencimento', 'Valor (R$)']
    const rows = vencimentosAgrupados.todos.map((t) => [
      t.tipo,
      t.descricao,
      t.contraparte,
      formatDatePtBr(t.vencimento),
      t.valor,
    ])
    downloadCsv(`relatorio_vencimentos_${new Date().toISOString().split('T')[0]}`, headers, rows)
  }

  // Exportar Resumo Mensal
  const handleExportResumoMensal = () => {
    const mesFormatado = `${selectedYear}_${String(selectedMonth + 1).padStart(2, '0')}`
    const headers = ['Tipo', 'Data', 'Descrição', 'Categoria/Origem', 'Status', 'Valor (R$)']

    const rows: (string | number)[][] = [
      ...monthlySummary.mEntries.map((e) => [
        'Receita',
        formatDatePtBr(e.entry_date),
        e.description,
        e.category,
        e.status,
        e.amount,
      ]),
      ...monthlySummary.mExpenses.map((ex) => [
        'Despesa',
        formatDatePtBr(ex.expense_date),
        ex.description,
        ex.category,
        ex.status,
        ex.amount,
      ]),
    ]

    downloadCsv(`resumo_mensal_${mesFormatado}`, headers, rows)
  }

  const renderVencimentoGroup = (
    title: string,
    group: {
      items: any[]
      stats: { pagar: number; receber: number; saldo: number; total: number }
    },
    badgeColor: string,
  ) => {
    if (group.items.length === 0) return null

    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-2">
        <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${badgeColor}`} />
            <h4 className="font-bold text-xs sm:text-sm text-slate-800 tracking-tight">
              {title} ({group.stats.total})
            </h4>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200 text-[11px]">
              A Pagar: {formatCurrency(group.stats.pagar)}
            </span>
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
              A Receber: {formatCurrency(group.stats.receber)}
            </span>
            <span
              className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                group.stats.saldo >= 0
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              Saldo: {formatCurrency(group.stats.saldo)}
            </span>
          </div>
        </div>

        {/* Mobile items view */}
        <div className="md:hidden divide-y divide-slate-100 p-2 space-y-2">
          {group.items.map((item) => (
            <div
              key={`${item.tipo}-${item.id}`}
              className="p-2 space-y-1 bg-slate-50/40 rounded-lg"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      item.tipo === 'A Pagar'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {item.tipo}
                  </span>
                  <p className="font-semibold text-xs text-slate-900 mt-1">{item.descricao}</p>
                  <p className="text-[11px] text-slate-500">{item.contraparte}</p>
                </div>
                <div className="text-right shrink-0">
                  <span
                    className={`font-mono font-bold text-xs ${
                      item.tipo === 'A Pagar' ? 'text-red-700' : 'text-emerald-700'
                    }`}
                  >
                    {item.tipo === 'A Pagar' ? '-' : '+'} {formatCurrency(item.valor)}
                  </span>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {formatDatePtBr(item.vencimento)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-4">Tipo</th>
                <th className="py-2.5 px-4">Descrição</th>
                <th className="py-2.5 px-4">Fornecedor / Cliente</th>
                <th className="py-2.5 px-4">Vencimento</th>
                <th className="py-2.5 px-4 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {group.items.map((item) => (
                <tr key={`${item.tipo}-${item.id}`} className="hover:bg-slate-50/60 transition">
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.tipo === 'A Pagar'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {item.tipo}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-semibold text-slate-800 max-w-[240px] truncate">
                    {item.descricao}
                  </td>
                  <td className="py-2.5 px-4 text-slate-600 truncate max-w-[180px]">
                    {item.contraparte}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                    {formatDatePtBr(item.vencimento)}
                  </td>
                  <td
                    className={`py-2.5 px-4 font-mono font-bold text-right whitespace-nowrap ${
                      item.tipo === 'A Pagar' ? 'text-red-700' : 'text-emerald-700'
                    }`}
                  >
                    {item.tipo === 'A Pagar' ? '-' : '+'} {formatCurrency(item.valor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const MONTH_NAMES = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
            Central de Relatórios Gerenciais
          </h2>
          <p className="text-sm text-slate-500">
            Acompanhe vencimentos futuros, balanço mensal de resultados e exporte para CSV.
          </p>
        </div>
      </div>

      <Tabs defaultValue="vencimentos" className="w-full space-y-6">
        <TabsList className="bg-white border border-slate-200 p-1 rounded-xl shadow-xs">
          <TabsTrigger
            value="vencimentos"
            className="text-xs font-semibold data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-lg px-4"
          >
            Vencimentos Futuros
          </TabsTrigger>
          <TabsTrigger
            value="mensal"
            className="text-xs font-semibold data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-lg px-4"
          >
            Resumo Mensal Consolidado
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: VENCIMENTOS FUTUROS */}
        <TabsContent value="vencimentos" className="space-y-6 mt-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="font-bold text-sm text-slate-800">
                Relatório de Vencimentos em Aberto (Pagar & Receber)
              </h3>
              <p className="text-xs text-slate-500">
                Agrupados por prazo: vencidos, hoje, próxima semana, 15, 30 e 60 dias.
              </p>
            </div>

            <Button
              onClick={handleExportVencimentos}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9 px-4 shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Download className="w-4 h-4" /> Exportar CSV
            </Button>
          </div>

          {vencimentosAgrupados.todos.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
              Nenhuma conta a pagar ou a receber em aberto encontrada.
            </div>
          ) : (
            <div className="space-y-4">
              {renderVencimentoGroup(
                '🚨 Títulos Vencidos (Atrasados)',
                vencimentosAgrupados.vencidas,
                'bg-red-500',
              )}
              {renderVencimentoGroup('⏰ Vencendo Hoje', vencimentosAgrupados.hoje, 'bg-amber-500')}
              {renderVencimentoGroup(
                '📅 Esta Semana (Próximos 7 Dias)',
                vencimentosAgrupados.estaSemana,
                'bg-blue-500',
              )}
              {renderVencimentoGroup(
                '📆 Próximos 15 Dias',
                vencimentosAgrupados.proximos15Dias,
                'bg-teal-500',
              )}
              {renderVencimentoGroup(
                '🗓️ Próximos 30 Dias',
                vencimentosAgrupados.proximos30Dias,
                'bg-emerald-500',
              )}
              {renderVencimentoGroup(
                '📊 Próximos 60 Dias',
                vencimentosAgrupados.proximos60Dias,
                'bg-indigo-500',
              )}
              {renderVencimentoGroup(
                '🔭 Longo Prazo (> 60 Dias)',
                vencimentosAgrupados.maisDe60Dias,
                'bg-slate-500',
              )}
            </div>
          )}
        </TabsContent>

        {/* ABA 2: RESUMO MENSAL */}
        <TabsContent value="mensal" className="space-y-6 mt-0">
          {/* Seletor de Período e Exportação */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2">
              <Select
                value={String(selectedMonth)}
                onValueChange={(val) => setSelectedMonth(Number(val))}
              >
                <SelectTrigger className="w-36 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((m, idx) => (
                    <SelectItem key={m} value={String(idx)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={String(selectedYear)}
                onValueChange={(val) => setSelectedYear(Number(val))}
              >
                <SelectTrigger className="w-28 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleExportResumoMensal}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9 px-4 shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Download className="w-4 h-4" /> Exportar Movimentos do Mês (CSV)
            </Button>
          </div>

          {/* Cards DRE Gerencial */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase">Receitas Totais</span>
                <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold font-mono text-emerald-700 mt-2">
                {formatCurrency(monthlySummary.totalReceitas)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Efetivadas: {formatCurrency(monthlySummary.totalReceitasRecebidas)}
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase">Despesas / Custos</span>
                <ArrowUpRight className="w-4 h-4 text-red-600" />
              </div>
              <p className="text-2xl font-bold font-mono text-red-700 mt-2">
                {formatCurrency(monthlySummary.totalDespesas)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Pagas: {formatCurrency(monthlySummary.totalDespesasPagas)}
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase">Resultado Operacional</span>
                <DollarSign className="w-4 h-4 text-blue-600" />
              </div>
              <p
                className={`text-2xl font-bold font-mono mt-2 ${
                  monthlySummary.resultadoOperacional >= 0 ? 'text-emerald-700' : 'text-red-700'
                }`}
              >
                {formatCurrency(monthlySummary.resultadoOperacional)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Margem líquida: {monthlySummary.margemOperacional}%
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase">Vendas Concluídas</span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold font-mono text-slate-900 mt-2">
                {formatCurrency(monthlySummary.totalVendas)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {monthlySummary.mSales.length} venda(s) no mês
              </p>
            </div>
          </div>

          {/* Breakdown de Despesas por Categoria no Mês */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h4 className="font-bold text-sm text-slate-800">
              Detalhamento de Despesas por Centro de Custo no Mês
            </h4>

            {monthlySummary.expensesByCategory.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">Nenhuma despesa registrada neste mês.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {monthlySummary.expensesByCategory.map(([cat, val]) => {
                  const pct =
                    monthlySummary.totalDespesas > 0
                      ? ((val / monthlySummary.totalDespesas) * 100).toFixed(1)
                      : '0'

                  return (
                    <div key={cat} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-700">{cat}</span>
                        <span className="text-[11px] text-slate-400 font-mono">({pct}%)</span>
                      </div>
                      <span className="font-mono font-bold text-red-700">
                        {formatCurrency(val)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default Relatorios
