import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Clock,
  FileText,
  CalendarDays,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Truck,
  ArrowRight,
  ExternalLink,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  Phone,
  Mail,
  User,
  ShoppingBag,
  Send,
  Calendar,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import {
  getQuotes,
  updateQuote,
  getAgendaEvents,
  updateAgendaEvent,
  createSale,
} from '@/services/erp'
import type { Quote, AgendaEvent } from '@/types/erp'
import { formatCurrency, formatDatePtBr } from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/EmptyState'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

export type OpenItemType = 'orcamento' | 'agenda'

export interface OpenOrderItem {
  id: string
  originType: OpenItemType
  title: string
  referenceNumber?: string
  clientName: string
  clientContact?: string
  amount: number
  date: string // issue_date or event_date
  daysOpen: number
  statusOriginal: string
  statusLabel: string
  urgency: 'baixa' | 'media' | 'alta'
  rawQuote?: Quote
  rawAgenda?: AgendaEvent
}

export function PedidosEmAberto() {
  const { user, company } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [quotes, setQuotes] = useState<Quote[]>([])
  const [agendaEvents, setAgendaEvents] = useState<AgendaEvent[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros e ordenação
  const [searchTerm, setSearchTerm] = useState('')
  const [originFilter, setOriginFilter] = useState<'ALL' | OpenItemType>('ALL')
  const [sortBy, setSortBy] = useState<'oldest' | 'newest' | 'amount_desc' | 'amount_asc'>('oldest')

  // Modais de Ação Rápida
  const [respondingQuote, setRespondingQuote] = useState<Quote | null>(null)
  const [actionType, setActionType] = useState<'aprovar' | 'recusar' | 'converter' | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!company) return
    try {
      setLoading(true)
      const [quotesData, agendaData] = await Promise.all([
        getQuotes(company.id),
        getAgendaEvents(company.id),
      ])
      setQuotes(quotesData)
      setAgendaEvents(agendaData)
    } catch (err: any) {
      console.error('Erro ao carregar pedidos em aberto:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar dados',
        description: err?.message || 'Tente novamente.',
      })
    } finally {
      setLoading(false)
    }
  }, [company, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('quotes', () => loadData(), !!company)
  useRealtime('agenda_events', () => loadData(), !!company)

  // Calcular dias em aberto a partir de uma data YYYY-MM-DD
  const calculateDaysOpen = (dateStr: string): number => {
    if (!dateStr) return 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const targetDate = new Date(dateStr.split('T')[0] + 'T00:00:00')
    const diffTime = today.getTime() - targetDate.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  // Consolidar orçamentos com status "Enviado" (aguardando retorno)
  // e eventos de agenda (Pedido / Entrega) com status pendente ou em_andamento
  const consolidatedItems = useMemo<OpenOrderItem[]>(() => {
    const list: OpenOrderItem[] = []

    // 1. Orçamentos Enviados
    quotes
      .filter((q) => q.status === 'Enviado')
      .forEach((q) => {
        const days = calculateDaysOpen(q.issue_date)
        const client = q.customer_name || q.expand?.customer_id?.name || 'Cliente sem identificação'

        let urgency: 'baixa' | 'media' | 'alta' = 'baixa'
        if (days >= 7) urgency = 'alta'
        else if (days >= 3) urgency = 'media'

        list.push({
          id: `quote-${q.id}`,
          originType: 'orcamento',
          title: q.title,
          referenceNumber: q.quote_number || undefined,
          clientName: client,
          clientContact:
            q.customer_contact || q.expand?.customer_id?.phone || q.expand?.customer_id?.email,
          amount: Number(q.total_amount) || 0,
          date: q.issue_date,
          daysOpen: days,
          statusOriginal: q.status,
          statusLabel: 'Enviado (Aguardando Retorno)',
          urgency,
          rawQuote: q,
        })
      })

    // 2. Pedidos e Entregas da Agenda não concluídos
    agendaEvents
      .filter((ev) => ev.status === 'pendente' || ev.status === 'em_andamento')
      .forEach((ev) => {
        const days = calculateDaysOpen(ev.event_date)
        const client = ev.expand?.customer_id?.name || 'Cliente / Destinatário'

        let urgency: 'baixa' | 'media' | 'alta' = 'baixa'
        if (days >= 5) urgency = 'alta'
        else if (days >= 2) urgency = 'media'

        list.push({
          id: `agenda-${ev.id}`,
          originType: 'agenda',
          title: ev.title,
          clientName: client,
          clientContact: ev.expand?.customer_id?.phone || ev.expand?.customer_id?.email,
          amount: Number(ev.amount) || 0,
          date: ev.event_date,
          daysOpen: days,
          statusOriginal: ev.status,
          statusLabel:
            ev.status === 'pendente'
              ? `${ev.event_type} Pendente`
              : `${ev.event_type} Em Andamento`,
          urgency,
          rawAgenda: ev,
        })
      })

    return list
  }, [quotes, agendaEvents])

  // Filtragem e Ordenação
  const filteredAndSortedItems = useMemo(() => {
    let result = consolidatedItems.filter((item) => {
      const matchOrigin = originFilter === 'ALL' || item.originType === originFilter
      const q = searchTerm.toLowerCase().trim()
      const matchSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.clientName.toLowerCase().includes(q) ||
        (item.referenceNumber && item.referenceNumber.toLowerCase().includes(q)) ||
        (item.clientContact && item.clientContact.toLowerCase().includes(q))

      return matchOrigin && matchSearch
    })

    result.sort((a, b) => {
      if (sortBy === 'oldest') {
        return b.daysOpen - a.daysOpen // mais dias em aberto primeiro
      }
      if (sortBy === 'newest') {
        return a.daysOpen - b.daysOpen
      }
      if (sortBy === 'amount_desc') {
        return b.amount - a.amount
      }
      if (sortBy === 'amount_asc') {
        return a.amount - b.amount
      }
      return 0
    })

    return result
  }, [consolidatedItems, originFilter, searchTerm, sortBy])

  // Totais e Métricas
  const metrics = useMemo(() => {
    const totalCount = consolidatedItems.length
    const totalAmount = consolidatedItems.reduce((acc, curr) => acc + curr.amount, 0)
    const orcamentosCount = consolidatedItems.filter((i) => i.originType === 'orcamento').length
    const orcamentosAmount = consolidatedItems
      .filter((i) => i.originType === 'orcamento')
      .reduce((acc, curr) => acc + curr.amount, 0)
    const agendaCount = consolidatedItems.filter((i) => i.originType === 'agenda').length
    const agendaAmount = consolidatedItems
      .filter((i) => i.originType === 'agenda')
      .reduce((acc, curr) => acc + curr.amount, 0)
    const criticalUrgencyCount = consolidatedItems.filter((i) => i.urgency === 'alta').length

    return {
      totalCount,
      totalAmount,
      orcamentosCount,
      orcamentosAmount,
      agendaCount,
      agendaAmount,
      criticalUrgencyCount,
    }
  }, [consolidatedItems])

  // Ações Rápidas em Orçamentos
  const handleUpdateQuoteStatus = async (
    quote: Quote,
    newStatus: 'Aprovado' | 'Recusado' | 'Convertido',
  ) => {
    if (!company) return
    try {
      setProcessingId(quote.id)

      if (newStatus === 'Convertido') {
        await createSale({
          company_id: company.id,
          customer_id: quote.customer_id,
          description: `Venda - Orçamento ${quote.quote_number || quote.title}`,
          sale_date: new Date().toISOString().split('T')[0],
          amount: quote.total_amount,
          payment_method: 'Pix',
          status: 'Concluída',
        })
        await updateQuote(quote.id, { status: 'Convertido' })
        toast({
          title: 'Orçamento Aprovado & Convertido!',
          description: 'Venda criada automaticamente no módulo de Vendas.',
        })
      } else {
        await updateQuote(quote.id, { status: newStatus })
        toast({
          title: `Orçamento marcado como ${newStatus}`,
          description: `Status do orçamento ${quote.quote_number || quote.title} atualizado.`,
        })
      }

      await loadData()
    } catch (err: any) {
      console.error('Erro ao atualizar orçamento:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao processar',
        description: err?.message || 'Tente novamente.',
      })
    } finally {
      setProcessingId(null)
    }
  }

  // Ações Rápidas na Agenda (Concluir Pedido/Entrega)
  const handleCompleteAgendaEvent = async (agenda: AgendaEvent) => {
    try {
      setProcessingId(agenda.id)
      await updateAgendaEvent(agenda.id, { status: 'concluido' })
      toast({
        title: `${agenda.event_type} Concluído!`,
        description: `O agendamento "${agenda.title}" foi marcado como entregue/concluído.`,
      })
      await loadData()
    } catch (err: any) {
      console.error('Erro ao concluir evento da agenda:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao concluir',
        description: err?.message || 'Tente novamente.',
      })
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-emerald-600" />
            Controle de Pedidos em Aberto
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Acompanhe orçamentos enviados aguardando resposta do cliente e pedidos/entregas da
            agenda em andamento.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => loadData()}
            className="text-xs text-slate-700 h-9 border-slate-300 hover:bg-slate-50 flex items-center gap-1.5"
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            onClick={() => navigate('/orcamentos')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9 px-3.5 shadow-xs flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4" /> Novo Orçamento
          </Button>
        </div>
      </div>

      {/* 4 Cards de Resumo Consolidado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Consolidado em Aberto */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total em Aberto
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
              {formatCurrency(metrics.totalAmount)}
            </p>
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium mt-1">
              <span>{metrics.totalCount} pedido(s) aguardando</span>
              {metrics.criticalUrgencyCount > 0 && (
                <span className="text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded">
                  {metrics.criticalUrgencyCount} crítico(s)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Orçamentos Enviados */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Orçamentos Enviados
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
              {formatCurrency(metrics.orcamentosAmount)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {metrics.orcamentosCount} proposta(s) aguardando aprovação
            </p>
          </div>
        </div>

        {/* Pedidos & Entregas na Agenda */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Agenda & Entregas
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
              {formatCurrency(metrics.agendaAmount)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {metrics.agendaCount} compromisso(s) pendente(s)
            </p>
          </div>
        </div>

        {/* Média de Tempo / Atenção */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Acompanhamento Ativo
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
              {metrics.criticalUrgencyCount > 0 ? (
                <span className="text-amber-600">{metrics.criticalUrgencyCount} em alerta</span>
              ) : (
                <span className="text-emerald-600">Em dia</span>
              )}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Priorize propostas com mais de 3 dias sem resposta
            </p>
          </div>
        </div>
      </div>

      {/* Barra de Filtros, Busca e Ordenação */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Buscar por cliente, título da proposta ou contato..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-xs sm:text-sm bg-slate-50/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro de Origem */}
          <select
            value={originFilter}
            onChange={(e) => setOriginFilter(e.target.value as any)}
            className="text-xs sm:text-sm border border-slate-200 rounded-md px-3 py-2 bg-white text-slate-700 focus:outline-emerald-600 font-medium"
          >
            <option value="ALL">Todas as origens ({metrics.totalCount})</option>
            <option value="orcamento">Somente Orçamentos ({metrics.orcamentosCount})</option>
            <option value="agenda">Somente Agenda / Entregas ({metrics.agendaCount})</option>
          </select>

          {/* Ordenação */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs sm:text-sm border border-slate-200 rounded-md px-3 py-2 bg-white text-slate-700 focus:outline-emerald-600 font-medium"
          >
            <option value="oldest">Mais tempo em aberto (+ dias)</option>
            <option value="newest">Mais recentes (- dias)</option>
            <option value="amount_desc">Maior valor primeiro (R$)</option>
            <option value="amount_asc">Menor valor primeiro (R$)</option>
          </select>
        </div>
      </div>

      {/* Listagem de Itens */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
          <p className="mt-3 text-xs text-slate-500">Carregando pedidos e propostas em aberto...</p>
        </div>
      ) : filteredAndSortedItems.length === 0 ? (
        <EmptyState
          icon={<Clock className="w-8 h-8" />}
          title="Nenhum pedido ou orçamento em aberto"
          description={
            searchTerm || originFilter !== 'ALL'
              ? 'Nenhum registro corresponde aos filtros selecionados.'
              : 'Excelente! Todos os seus orçamentos já foram respondidos e os pedidos da agenda foram entregues.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAndSortedItems.map((item) => {
            const isOrcamento = item.originType === 'orcamento'
            const isProcessing =
              processingId === (isOrcamento ? item.rawQuote?.id : item.rawAgenda?.id)

            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs hover:shadow-md transition flex flex-col justify-between relative overflow-hidden"
              >
                {/* Faixa lateral de urgência */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                    item.urgency === 'alta'
                      ? 'bg-red-500'
                      : item.urgency === 'media'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                  }`}
                />

                <div className="space-y-3">
                  {/* Topo do Card: Badge de Origem + Dias em Aberto */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 ${
                        isOrcamento
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-teal-50 text-teal-700 border border-teal-200'
                      }`}
                    >
                      {isOrcamento ? (
                        <>
                          <FileText className="w-3 h-3" /> Orçamento
                        </>
                      ) : (
                        <>
                          <CalendarDays className="w-3 h-3" />{' '}
                          {item.rawAgenda?.event_type || 'Agenda'}
                        </>
                      )}
                    </span>

                    {/* Badge de Dias em Aberto */}
                    <div
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                        item.urgency === 'alta'
                          ? 'bg-red-100 text-red-800'
                          : item.urgency === 'media'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      <span>
                        {item.daysOpen === 0
                          ? 'Aberto hoje'
                          : item.daysOpen === 1
                            ? '1 dia em aberto'
                            : `${item.daysOpen} dias em aberto`}
                      </span>
                    </div>
                  </div>

                  {/* Título e Referência */}
                  <div>
                    {item.referenceNumber && (
                      <span className="text-[10px] font-mono font-semibold text-slate-400 block">
                        {item.referenceNumber}
                      </span>
                    )}
                    <h3 className="font-bold text-sm text-slate-900 line-clamp-1">{item.title}</h3>
                  </div>

                  {/* Dados do Cliente e Contato */}
                  <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-100 space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-800 font-medium truncate">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{item.clientName}</span>
                    </div>

                    {item.clientContact && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{item.clientContact}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 text-[11px] text-slate-400">
                      <span>Data de Envio/Registro:</span>
                      <span className="font-medium text-slate-600">
                        {formatDatePtBr(item.date)}
                      </span>
                    </div>
                  </div>

                  {/* Valor Total em Destaque */}
                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-xs font-semibold text-slate-500">Valor em Aberto:</span>
                    <span className="text-lg font-bold font-mono text-emerald-700">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                </div>

                {/* Ações Rápidas no Rodapé */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                  {isOrcamento && item.rawQuote ? (
                    <div className="flex flex-col gap-1.5">
                      <div className="grid grid-cols-2 gap-1.5">
                        <Button
                          size="sm"
                          disabled={isProcessing}
                          onClick={() => handleUpdateQuoteStatus(item.rawQuote!, 'Convertido')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-2 font-semibold shadow-2xs flex items-center justify-center gap-1"
                          title="Aprovar e transformar imediatamente em venda"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Aprovar & Vender</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isProcessing}
                          onClick={() => handleUpdateQuoteStatus(item.rawQuote!, 'Recusado')}
                          className="text-xs text-red-700 border-red-200 hover:bg-red-50 h-8 px-2 font-medium flex items-center justify-center gap-1"
                          title="Marcar como recusado pelo cliente"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Recusado</span>
                        </Button>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate('/orcamentos')}
                        className="w-full text-[11px] text-slate-600 hover:text-slate-900 h-7 flex items-center justify-center gap-1"
                      >
                        Abrir Orçamento Completo <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  ) : item.rawAgenda ? (
                    <div className="flex flex-col gap-1.5">
                      <Button
                        size="sm"
                        disabled={isProcessing}
                        onClick={() => handleCompleteAgendaEvent(item.rawAgenda!)}
                        className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs h-8 px-2 font-semibold shadow-2xs flex items-center justify-center gap-1"
                        title="Concluir entrega/pedido agendado"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Concluir {item.rawAgenda.event_type}</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate('/agenda')}
                        className="w-full text-[11px] text-slate-600 hover:text-slate-900 h-7 flex items-center justify-center gap-1"
                      >
                        Abrir Agenda de Entregas <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default PedidosEmAberto
