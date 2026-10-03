import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Building,
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  ShoppingCart,
  FileText,
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  Package,
  TrendingUp,
  Download,
  ExternalLink,
  ChevronRight,
  Layers,
  Sparkles,
  HelpCircle,
  Loader2,
} from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import { getCustomerHistory, type CustomerHistoryData } from '@/services/erp'
import { formatCurrency, formatDatePtBr } from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/EmptyState'

type PeriodFilter = 'all' | '30d' | '90d' | '180d' | '365d' | 'this_year'
type ActiveTab = 'timeline' | 'vendas' | 'orcamentos' | 'pagamentos'

interface TimelineItem {
  id: string
  kind: 'venda' | 'orcamento' | 'recebivel'
  date: string
  title: string
  subtitle?: string
  amount: number
  status: string
  statusType: 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  details?: React.ReactNode
  raw: any
}

export const ClienteHistorico: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { company } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<CustomerHistoryData | null>(null)

  // Filtros
  const [activeTab, setActiveTab] = useState<ActiveTab>('timeline')
  const [period, setPeriod] = useState<PeriodFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const loadCustomerData = useCallback(async () => {
    if (!company || !id) return
    try {
      setLoading(true)
      const res = await getCustomerHistory(company.id, id)
      setData(res)
    } catch (err: any) {
      console.error('Erro ao carregar histórico do cliente:', err)
      toast({
        variant: 'destructive',
        title: 'Cliente não encontrado',
        description: 'Não foi possível carregar os registros deste cliente.',
      })
    } finally {
      setLoading(false)
    }
  }, [company, id, toast])

  useEffect(() => {
    loadCustomerData()
  }, [loadCustomerData])

  // Realtime updates
  useRealtime('sales', () => loadCustomerData(), !!company)
  useRealtime('quotes', () => loadCustomerData(), !!company)
  useRealtime('receivables', () => loadCustomerData(), !!company)
  useRealtime('customers', () => loadCustomerData(), !!company)

  const customer = data?.customer

  // Filtro de data utilitário
  const isWithinPeriod = useCallback(
    (dateStr?: string) => {
      if (!dateStr || period === 'all') return true
      const targetDate = new Date(dateStr)
      if (isNaN(targetDate.getTime())) return true

      const now = new Date()
      if (period === 'this_year') {
        return targetDate.getFullYear() === now.getFullYear()
      }

      const diffMs = now.getTime() - targetDate.getTime()
      const diffDays = diffMs / (1000 * 60 * 60 * 24)

      if (period === '30d') return diffDays <= 30 && diffDays >= 0
      if (period === '90d') return diffDays <= 90 && diffDays >= 0
      if (period === '180d') return diffDays <= 180 && diffDays >= 0
      if (period === '365d') return diffDays <= 365 && diffDays >= 0
      return true
    },
    [period],
  )

  // Vendas filtradas
  const filteredSales = useMemo(() => {
    if (!data?.sales) return []
    const q = searchQuery.toLowerCase().trim()
    return data.sales.filter((s) => {
      const matchPeriod = isWithinPeriod(s.sale_date)
      if (!matchPeriod) return false
      if (!q) return true
      const desc = (s.description || '').toLowerCase()
      const pay = (s.payment_method || '').toLowerCase()
      const status = (s.status || '').toLowerCase()
      const itemsMatch = (s.items || []).some((it) => it.name.toLowerCase().includes(q))
      return desc.includes(q) || pay.includes(q) || status.includes(q) || itemsMatch
    })
  }, [data?.sales, searchQuery, isWithinPeriod])

  // Orçamentos filtrados
  const filteredQuotes = useMemo(() => {
    if (!data?.quotes) return []
    const q = searchQuery.toLowerCase().trim()
    return data.quotes.filter((qt) => {
      const matchPeriod = isWithinPeriod(qt.issue_date)
      if (!matchPeriod) return false
      if (!q) return true
      const num = (qt.quote_number || '').toLowerCase()
      const title = (qt.title || '').toLowerCase()
      const status = (qt.status || '').toLowerCase()
      const notes = (qt.notes || '').toLowerCase()
      const itemsMatch = (qt.items || []).some((it) => it.name.toLowerCase().includes(q))
      return (
        num.includes(q) ||
        title.includes(q) ||
        status.includes(q) ||
        notes.includes(q) ||
        itemsMatch
      )
    })
  }, [data?.quotes, searchQuery, isWithinPeriod])

  // Contas a receber filtradas
  const filteredReceivables = useMemo(() => {
    if (!data?.receivables) return []
    const q = searchQuery.toLowerCase().trim()
    return data.receivables.filter((r) => {
      const matchPeriod = isWithinPeriod(r.due_date)
      if (!matchPeriod) return false
      if (!q) return true
      const desc = (r.description || '').toLowerCase()
      const notes = (r.notes || '').toLowerCase()
      const status = (r.status || '').toLowerCase()
      return desc.includes(q) || notes.includes(q) || status.includes(q)
    })
  }, [data?.receivables, searchQuery, isWithinPeriod])

  // KPIs consolidados
  const kpis = useMemo(() => {
    const allSales = data?.sales || []
    const allQuotes = data?.quotes || []
    const allReceivables = data?.receivables || []

    // Concluídas
    const completedSales = allSales.filter((s) => s.status === 'Concluída')
    const totalSpent = completedSales.reduce((acc, s) => acc + (s.amount || 0), 0)
    const completedCount = completedSales.length
    const averageTicket = completedCount > 0 ? totalSpent / completedCount : 0

    // Datas primeira e última compra
    const sortedCompleted = [...completedSales].sort(
      (a, b) => new Date(a.sale_date).getTime() - new Date(b.sale_date).getTime(),
    )
    const firstSaleDate = sortedCompleted[0]?.sale_date
    const lastSaleDate = sortedCompleted[sortedCompleted.length - 1]?.sale_date

    // Orçamentos
    const totalQuotesAmount = allQuotes.reduce((acc, q) => acc + (q.total_amount || 0), 0)
    const openQuotes = allQuotes.filter((q) => q.status === 'Enviado' || q.status === 'Rascunho')
    const openQuotesAmount = openQuotes.reduce((acc, q) => acc + (q.total_amount || 0), 0)

    // Contas a Receber
    const today = new Date().toISOString().split('T')[0]
    const pendingReceivables = allReceivables.filter((r) => r.status === 'Em aberto')
    const totalPendingReceivables = pendingReceivables.reduce((acc, r) => acc + (r.amount || 0), 0)
    const overdueReceivables = pendingReceivables.filter((r) => r.due_date < today)
    const overdueReceivablesAmount = overdueReceivables.reduce((acc, r) => acc + (r.amount || 0), 0)

    return {
      totalSpent,
      completedCount,
      averageTicket,
      firstSaleDate,
      lastSaleDate,
      totalQuotesAmount,
      quotesCount: allQuotes.length,
      openQuotesCount: openQuotes.length,
      openQuotesAmount,
      totalPendingReceivables,
      pendingReceivablesCount: pendingReceivables.length,
      overdueReceivablesAmount,
      overdueReceivablesCount: overdueReceivables.length,
    }
  }, [data])

  // Gráfico mensal de evolução de compras do cliente (últimos 12 meses)
  const chartMonthlyData = useMemo(() => {
    const allSales = data?.sales || []
    const completed = allSales.filter((s) => s.status === 'Concluída')

    // Gerar últimos 12 meses
    const result: { monthKey: string; label: string; total: number; count: number }[] = []
    const now = new Date()

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const monthKey = `${year}-${month}`
      const monthName = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
      const label = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)}/${String(year).slice(2)}`
      result.push({ monthKey, label, total: 0, count: 0 })
    }

    completed.forEach((s) => {
      if (!s.sale_date) return
      const saleMonthKey = s.sale_date.slice(0, 7)
      const found = result.find((r) => r.monthKey === saleMonthKey)
      if (found) {
        found.total += Number(s.amount || 0)
        found.count += 1
      }
    })

    return result
  }, [data?.sales])

  // Timeline unificada
  const unifiedTimeline = useMemo(() => {
    const list: TimelineItem[] = []

    // Vendas
    filteredSales.forEach((s) => {
      let statusType: TimelineItem['statusType'] = 'info'
      if (s.status === 'Concluída') statusType = 'success'
      else if (s.status === 'Pendente') statusType = 'warning'
      else if (s.status === 'Cancelada') statusType = 'danger'

      list.push({
        id: `venda-${s.id}`,
        kind: 'venda',
        date: s.sale_date,
        title: s.description || 'Venda',
        subtitle: s.payment_method ? `Forma de pagamento: ${s.payment_method}` : undefined,
        amount: s.amount,
        status: s.status,
        statusType,
        details:
          Array.isArray(s.items) && s.items.length > 0 ? (
            <div className="mt-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5 text-[11px]">
                <Package className="w-3.5 h-3.5 text-emerald-600" />
                {s.items.length} item(ns) incluído(s):
              </span>
              <ul className="divide-y divide-slate-100 text-[11px] text-slate-600">
                {s.items.map((it, idx) => (
                  <li key={idx} className="py-1 flex items-center justify-between">
                    <span>
                      {it.quantity}x {it.name}
                    </span>
                    <span className="font-mono font-medium">{formatCurrency(it.total)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null,
        raw: s,
      })
    })

    // Orçamentos
    filteredQuotes.forEach((q) => {
      let statusType: TimelineItem['statusType'] = 'neutral'
      if (q.status === 'Aprovado' || q.status === 'Convertido') statusType = 'success'
      else if (q.status === 'Enviado') statusType = 'warning'
      else if (q.status === 'Recusado') statusType = 'danger'
      else if (q.status === 'Rascunho') statusType = 'neutral'

      list.push({
        id: `orcamento-${q.id}`,
        kind: 'orcamento',
        date: q.issue_date,
        title: q.title || `Orçamento ${q.quote_number || ''}`,
        subtitle: q.valid_until ? `Válido até ${formatDatePtBr(q.valid_until)}` : undefined,
        amount: q.total_amount,
        status: q.status,
        statusType,
        details:
          Array.isArray(q.items) && q.items.length > 0 ? (
            <div className="mt-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5 text-[11px]">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                {q.items.length} item(ns) cotado(s):
              </span>
              <ul className="divide-y divide-slate-100 text-[11px] text-slate-600">
                {q.items.map((it, idx) => (
                  <li key={idx} className="py-1 flex items-center justify-between">
                    <span>
                      {it.quantity}x {it.name}
                    </span>
                    <span className="font-mono font-medium">{formatCurrency(it.total)}</span>
                  </li>
                ))}
              </ul>
              {q.notes && (
                <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-100">
                  Obs: {q.notes}
                </p>
              )}
            </div>
          ) : null,
        raw: q,
      })
    })

    // Contas a Receber
    filteredReceivables.forEach((r) => {
      const today = new Date().toISOString().split('T')[0]
      const isOverdue = r.status === 'Em aberto' && r.due_date < today

      let statusType: TimelineItem['statusType'] = 'info'
      let statusLabel: string = r.status
      if (r.status === 'Recebida') {
        statusType = 'success'
      } else if (isOverdue) {
        statusType = 'danger'
        statusLabel = 'Vencido'
      } else {
        statusType = 'warning'
      }

      list.push({
        id: `recebivel-${r.id}`,
        kind: 'recebivel',
        date: r.due_date,
        title: r.description || 'Título a Receber',
        subtitle: r.notes ? `Obs: ${r.notes}` : undefined,
        amount: r.amount,
        status: statusLabel,
        statusType,
        raw: r,
      })
    })

    // Ordenar cronologicamente decrescente
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [filteredSales, filteredQuotes, filteredReceivables])

  // Avatar / Monograma
  const avatarInitials = customer?.name ? customer.name.slice(0, 2).toUpperCase() : 'CL'
  const getAvatarBg = (name: string) => {
    const colors = [
      'bg-emerald-600',
      'bg-blue-600',
      'bg-indigo-600',
      'bg-violet-600',
      'bg-teal-600',
      'bg-rose-600',
      'bg-amber-600',
    ]
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return colors[Math.abs(hash) % colors.length]
  }

  // Exportar histórico em CSV
  const handleExportCsv = () => {
    if (!customer) return
    const rows = [
      ['Tipo', 'Data', 'Identificador / Descrição', 'Valor (R$)', 'Status'],
      ...unifiedTimeline.map((item) => [
        item.kind === 'venda'
          ? 'Venda'
          : item.kind === 'orcamento'
            ? 'Orçamento'
            : 'Conta a Receber',
        item.date,
        `"${item.title.replace(/"/g, '""')}"`,
        item.amount.toFixed(2),
        item.status,
      ]),
    ]

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(';')).join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `historico-${customer.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast({ title: 'Histórico exportado com sucesso!' })
  }

  if (loading && !data) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Carregando histórico do cliente...</p>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/clientes')}
          className="text-xs text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Voltar para Clientes
        </Button>
        <EmptyState
          icon={<UserIcon className="w-8 h-8 text-slate-400" />}
          title="Cliente não encontrado"
          description="O cliente solicitado não existe ou foi removido do sistema."
          actionLabel="Ver todos os Clientes"
          onAction={() => navigate('/clientes')}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Navegação de Topo e Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/clientes')}
            className="text-xs text-slate-600 hover:text-slate-900 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Clientes
          </Button>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-semibold text-slate-900 truncate">
            Histórico do Cliente
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="text-xs h-8 border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" /> Exportar CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/vendas')}
            className="text-xs h-8 bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 flex items-center gap-1.5"
          >
            <ShoppingCart className="w-3.5 h-3.5" /> Nova Venda
          </Button>
        </div>
      </div>

      {/* Header do Cliente (Cartão Principal em Slate Escuro & Esmeralda) */}
      <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] text-white p-5 sm:p-6 rounded-2xl border border-slate-800 shadow-sm relative overflow-hidden">
        {/* Glow de fundo */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <div
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-lg border-2 border-white/10 ${getAvatarBg(
                customer.name,
              )}`}
            >
              {avatarInitials}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-white">
                  {customer.name}
                </h2>
                <Badge
                  variant="outline"
                  className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30 text-[10px] font-semibold uppercase tracking-wider"
                >
                  {customer.client_type === 'Pessoa Jurídica' ? (
                    <Building className="w-3 h-3 mr-1" />
                  ) : (
                    <UserIcon className="w-3 h-3 mr-1" />
                  )}
                  {customer.client_type}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                <span className="font-mono text-emerald-400 font-semibold">
                  Doc: {customer.document}
                </span>
                {customer.phone && (
                  <span className="flex items-center gap-1 text-slate-300">
                    <Phone className="w-3 h-3 text-slate-400" />
                    {customer.phone}
                  </span>
                )}
                {customer.email && (
                  <span className="flex items-center gap-1 text-slate-300">
                    <Mail className="w-3 h-3 text-slate-400" />
                    {customer.email}
                  </span>
                )}
              </div>

              {customer.address && (
                <p className="flex items-center gap-1.5 text-xs text-slate-400 pt-1">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate max-w-xl">{customer.address}</span>
                </p>
              )}
            </div>
          </div>

          {/* Resumo Rápido lateral */}
          <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-700/60 flex items-center gap-6 shrink-0 text-left">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                Total Comprado
              </span>
              <span className="text-lg font-bold font-mono text-emerald-400">
                {formatCurrency(kpis.totalSpent)}
              </span>
              <span className="text-[11px] text-slate-400 block">
                {kpis.completedCount} venda(s) concluída(s)
              </span>
            </div>
            <div className="border-l border-slate-700 pl-6">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                Pendente em Aberto
              </span>
              <span
                className={`text-lg font-bold font-mono ${
                  kpis.totalPendingReceivables > 0 ? 'text-amber-400' : 'text-slate-300'
                }`}
              >
                {formatCurrency(kpis.totalPendingReceivables)}
              </span>
              <span className="text-[11px] text-slate-400 block">
                {kpis.pendingReceivablesCount} título(s)
              </span>
            </div>
          </div>
        </div>

        {customer.notes && (
          <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-300 italic flex items-start gap-2">
            <span className="font-semibold text-slate-200 not-italic">Observações:</span>
            <span>{customer.notes}</span>
          </div>
        )}
      </div>

      {/* Grid de Cards de Resumo & KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Gasto */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total em Compras
            </span>
            <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShoppingCart className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base sm:text-lg font-bold font-mono text-slate-900">
            {formatCurrency(kpis.totalSpent)}
          </p>
          <p className="text-[11px] text-emerald-600 font-medium">
            {kpis.completedCount} pedido(s) faturado(s)
          </p>
        </div>

        {/* Ticket Médio */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Ticket Médio
            </span>
            <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base sm:text-lg font-bold font-mono text-slate-900">
            {formatCurrency(kpis.averageTicket)}
          </p>
          <p className="text-[11px] text-slate-500">Média por compra concluída</p>
        </div>

        {/* Orçamentos */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Orçamentos
            </span>
            <div className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base sm:text-lg font-bold font-mono text-slate-900">
            {formatCurrency(kpis.totalQuotesAmount)}
          </p>
          <p className="text-[11px] text-indigo-600 font-medium">
            {kpis.openQuotesCount} em aberto ({formatCurrency(kpis.openQuotesAmount)})
          </p>
        </div>

        {/* Contas a Receber Pendentes */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              A Receber (Aberto)
            </span>
            <div className="w-6 h-6 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base sm:text-lg font-bold font-mono text-slate-900">
            {formatCurrency(kpis.totalPendingReceivables)}
          </p>
          <p className="text-[11px] text-amber-600 font-medium">
            {kpis.pendingReceivablesCount} título(s) pendente(s)
          </p>
        </div>

        {/* Inadimplência / Vencidos */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Títulos Vencidos
            </span>
            <div
              className={`w-6 h-6 rounded-md flex items-center justify-center ${
                kpis.overdueReceivablesAmount > 0
                  ? 'bg-red-50 text-red-600'
                  : 'bg-slate-50 text-slate-400'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <p
            className={`text-base sm:text-lg font-bold font-mono ${
              kpis.overdueReceivablesAmount > 0 ? 'text-red-600' : 'text-slate-900'
            }`}
          >
            {formatCurrency(kpis.overdueReceivablesAmount)}
          </p>
          <p
            className={`text-[11px] font-medium ${
              kpis.overdueReceivablesCount > 0 ? 'text-red-600' : 'text-emerald-600'
            }`}
          >
            {kpis.overdueReceivablesCount > 0
              ? `${kpis.overdueReceivablesCount} título(s) em atraso`
              : 'Em dia (sem atrasos)'}
          </p>
        </div>

        {/* Primeira / Última Compra */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Ciclo do Cliente
            </span>
            <div className="w-6 h-6 rounded-md bg-teal-50 text-teal-600 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xs font-semibold text-slate-800">
            Última: {kpis.lastSaleDate ? formatDatePtBr(kpis.lastSaleDate) : 'Nunca'}
          </p>
          <p className="text-[11px] text-slate-400">
            Primeira: {kpis.firstSaleDate ? formatDatePtBr(kpis.firstSaleDate) : 'Nunca'}
          </p>
        </div>
      </div>

      {/* Gráfico de Evolução de Compras Mensais */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-slate-800 text-sm tracking-tight flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Evolução de Compras do Cliente (Últimos 12 Meses)
            </h3>
            <p className="text-xs text-slate-400">
              Frequência e volume financeiro faturado mês a mês
            </p>
          </div>
          <span className="text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
            Vendas Concluídas:{' '}
            <strong className="text-slate-800 font-mono">{kpis.completedCount}</strong>
          </span>
        </div>

        <div className="h-56 sm:h-64 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartMonthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="label" stroke="#94A3B8" fontSize={10} tickLine={false} />
              <YAxis
                stroke="#94A3B8"
                fontSize={10}
                tickLine={false}
                tickFormatter={(val) => `R$${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`}
              />
              <Tooltip
                formatter={(val: any, name: any) => [
                  formatCurrency(Number(val)),
                  name === 'total' ? 'Valor Faturado' : name,
                ]}
                labelFormatter={(label) => `Mês: ${label}`}
                contentStyle={{
                  backgroundColor: '#0F172A',
                  borderRadius: '8px',
                  color: '#fff',
                  border: 'none',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="total" name="Valor Comprado" fill="#059669" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Barra de Filtros (Período + Busca) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Seletor de Período */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <Filter className="w-4 h-4 text-slate-400 shrink-0 mr-1" />
          {[
            { id: 'all', label: 'Tudo' },
            { id: '30d', label: '30 dias' },
            { id: '90d', label: '90 dias' },
            { id: '180d', label: '6 meses' },
            { id: 'this_year', label: 'Este ano' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setPeriod(item.id as PeriodFilter)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
                period === item.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Busca dentro do histórico */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <Input
            placeholder="Buscar por descrição, produto ou status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs border-slate-200"
          />
        </div>
      </div>

      {/* Abas: Linha do Tempo Unificada vs Compras vs Orçamentos vs Pagamentos */}
      <div className="space-y-4">
        {/* Tab Headers */}
        <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition ${
              activeTab === 'timeline'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            Linha do Tempo Completa ({unifiedTimeline.length})
          </button>

          <button
            onClick={() => setActiveTab('vendas')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition ${
              activeTab === 'vendas'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            Compras / Vendas ({filteredSales.length})
          </button>

          <button
            onClick={() => setActiveTab('orcamentos')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition ${
              activeTab === 'orcamentos'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            Orçamentos & Propostas ({filteredQuotes.length})
          </button>

          <button
            onClick={() => setActiveTab('pagamentos')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition ${
              activeTab === 'pagamentos'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Pagamentos / Contas a Receber ({filteredReceivables.length})
          </button>
        </div>

        {/* Conteúdo da Aba Selecionada */}
        {activeTab === 'timeline' && (
          <div className="space-y-3">
            {unifiedTimeline.length === 0 ? (
              <EmptyState
                icon={<Clock className="w-8 h-8 text-slate-400" />}
                title="Nenhum registro histórico no período"
                description="Não há compras, propostas ou pagamentos vinculados a este cliente nos filtros selecionados."
              />
            ) : (
              <div className="relative pl-6 sm:pl-8 space-y-4 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                {unifiedTimeline.map((item) => {
                  const isVenda = item.kind === 'venda'
                  const isOrcamento = item.kind === 'orcamento'
                  const isRecebivel = item.kind === 'recebivel'

                  return (
                    <div
                      key={item.id}
                      className="relative bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition"
                    >
                      {/* Ponto / Ícone na Linha do Tempo */}
                      <div
                        className={`absolute -left-[31px] sm:-left-[39px] top-4 w-7 h-7 rounded-full flex items-center justify-center text-white border-2 border-white shadow-xs ${
                          isVenda ? 'bg-emerald-600' : isOrcamento ? 'bg-blue-600' : 'bg-amber-600'
                        }`}
                      >
                        {isVenda && <ShoppingCart className="w-3.5 h-3.5" />}
                        {isOrcamento && <FileText className="w-3.5 h-3.5" />}
                        {isRecebivel && <CreditCard className="w-3.5 h-3.5" />}
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                isVenda
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : isOrcamento
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {isVenda ? 'Venda' : isOrcamento ? 'Orçamento' : 'Conta a Receber'}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">
                              {formatDatePtBr(item.date)}
                            </span>
                          </div>

                          <h4 className="font-bold text-sm text-slate-900">{item.title}</h4>
                          {item.subtitle && (
                            <p className="text-xs text-slate-500">{item.subtitle}</p>
                          )}
                        </div>

                        <div className="text-left sm:text-right shrink-0 space-y-1">
                          <p className="text-base font-bold font-mono text-slate-900">
                            {formatCurrency(item.amount)}
                          </p>
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                              item.statusType === 'success'
                                ? 'bg-emerald-50 text-emerald-700'
                                : item.statusType === 'warning'
                                  ? 'bg-amber-50 text-amber-700'
                                  : item.statusType === 'danger'
                                    ? 'bg-red-50 text-red-700'
                                    : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {item.statusType === 'success' && <CheckCircle2 className="w-3 h-3" />}
                            {item.statusType === 'warning' && <Clock className="w-3 h-3" />}
                            {item.statusType === 'danger' && <XCircle className="w-3 h-3" />}
                            {item.status}
                          </span>
                        </div>
                      </div>

                      {item.details}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Aba: Compras / Vendas */}
        {activeTab === 'vendas' && (
          <div className="space-y-3">
            {filteredSales.length === 0 ? (
              <EmptyState
                icon={<ShoppingCart className="w-8 h-8 text-slate-400" />}
                title="Nenhuma compra encontrada"
                description="Este cliente ainda não possui compras registradas no período filtrado."
              />
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Data</th>
                        <th className="py-3 px-4">Descrição / Itens</th>
                        <th className="py-3 px-4">Forma Pagto</th>
                        <th className="py-3 px-4 text-right">Valor</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredSales.map((sale) => (
                        <tr key={sale.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                            {formatDatePtBr(sale.sale_date)}
                          </td>
                          <td className="py-3 px-4 text-slate-700 max-w-sm">
                            <p className="font-semibold text-slate-900">{sale.description}</p>
                            {Array.isArray(sale.items) && sale.items.length > 0 && (
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                {sale.items.map((it) => `${it.quantity}x ${it.name}`).join(', ')}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                            {sale.payment_method || '-'}
                          </td>
                          <td className="py-3 px-4 font-bold font-mono text-slate-900 text-right whitespace-nowrap">
                            {formatCurrency(sale.amount)}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                sale.status === 'Concluída'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : sale.status === 'Pendente'
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-red-50 text-red-700'
                              }`}
                            >
                              {sale.status === 'Concluída' && <CheckCircle2 className="w-3 h-3" />}
                              {sale.status === 'Pendente' && <Clock className="w-3 h-3" />}
                              {sale.status === 'Cancelada' && <XCircle className="w-3 h-3" />}
                              {sale.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Aba: Orçamentos */}
        {activeTab === 'orcamentos' && (
          <div className="space-y-3">
            {filteredQuotes.length === 0 ? (
              <EmptyState
                icon={<FileText className="w-8 h-8 text-slate-400" />}
                title="Nenhum orçamento encontrado"
                description="Este cliente não possui propostas registradas no período selecionado."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredQuotes.map((q) => (
                  <div
                    key={q.id}
                    className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3 hover:border-slate-300 transition"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-mono text-[10px] text-slate-400 font-semibold uppercase">
                            {q.quote_number || 'Proposta'}
                          </span>
                          <h4 className="font-bold text-sm text-slate-900">{q.title}</h4>
                        </div>
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            q.status === 'Aprovado' || q.status === 'Convertido'
                              ? 'bg-emerald-50 text-emerald-700'
                              : q.status === 'Enviado'
                                ? 'bg-amber-50 text-amber-700'
                                : q.status === 'Recusado'
                                  ? 'bg-red-50 text-red-700'
                                  : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {q.status}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 space-y-1 mt-2">
                        <p>Emitido em: {formatDatePtBr(q.issue_date)}</p>
                        {q.valid_until && <p>Validade: {formatDatePtBr(q.valid_until)}</p>}
                        {q.payment_terms && <p>Condições: {q.payment_terms}</p>}
                      </div>

                      {Array.isArray(q.items) && q.items.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-600 space-y-1">
                          <span className="font-semibold text-slate-700 block">
                            Itens da proposta:
                          </span>
                          <ul className="list-disc list-inside space-y-0.5 text-slate-500">
                            {q.items.slice(0, 3).map((it, idx) => (
                              <li key={idx} className="truncate">
                                {it.quantity}x {it.name} ({formatCurrency(it.total)})
                              </li>
                            ))}
                            {q.items.length > 3 && (
                              <li className="text-slate-400 italic">
                                + {q.items.length - 3} outro(s) item(ns)...
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-400">Total Proposta:</span>
                      <span className="text-base font-bold font-mono text-slate-900">
                        {formatCurrency(q.total_amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Aba: Pagamentos / Contas a Receber */}
        {activeTab === 'pagamentos' && (
          <div className="space-y-3">
            {filteredReceivables.length === 0 ? (
              <EmptyState
                icon={<CreditCard className="w-8 h-8 text-slate-400" />}
                title="Nenhum título a receber encontrado"
                description="Não há contas a receber ou pagamentos vinculados a este cliente."
              />
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Vencimento</th>
                        <th className="py-3 px-4">Descrição</th>
                        <th className="py-3 px-4">Observações</th>
                        <th className="py-3 px-4 text-right">Valor</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredReceivables.map((r) => {
                        const today = new Date().toISOString().split('T')[0]
                        const isOverdue = r.status === 'Em aberto' && r.due_date < today
                        return (
                          <tr key={r.id} className="hover:bg-slate-50/60 transition">
                            <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                              {formatDatePtBr(r.due_date)}
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-900 max-w-sm">
                              {r.description}
                            </td>
                            <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                              {r.notes || '-'}
                            </td>
                            <td className="py-3 px-4 font-bold font-mono text-slate-900 text-right whitespace-nowrap">
                              {formatCurrency(r.amount)}
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                  r.status === 'Recebida'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : isOverdue
                                      ? 'bg-red-50 text-red-700'
                                      : 'bg-amber-50 text-amber-700'
                                }`}
                              >
                                {r.status === 'Recebida' && <CheckCircle2 className="w-3 h-3" />}
                                {isOverdue && <AlertTriangle className="w-3 h-3" />}
                                {r.status === 'Em aberto' && !isOverdue && (
                                  <Clock className="w-3 h-3" />
                                )}
                                {isOverdue ? 'Vencido' : r.status}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ClienteHistorico
