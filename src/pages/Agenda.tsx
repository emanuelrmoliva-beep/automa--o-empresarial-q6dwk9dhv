import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Package,
  Truck,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Search,
  User,
  Trash2,
  Edit2,
  Loader2,
  DollarSign,
  CalendarDays,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import {
  getAgendaEvents,
  createAgendaEvent,
  updateAgendaEvent,
  deleteAgendaEvent,
  getCustomers,
} from '@/services/erp'
import type { AgendaEvent, AgendaEventType, AgendaEventStatus, Customer } from '@/types/erp'
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

const STATUS_LABELS: Record<
  AgendaEventStatus,
  { label: string; badge: string; icon: React.FC<{ className?: string }> }
> = {
  pendente: {
    label: 'Pendente',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Clock,
  },
  em_andamento: {
    label: 'Em Andamento',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: Clock,
  },
  concluido: {
    label: 'Concluído',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
  },
  cancelado: {
    label: 'Cancelado',
    badge: 'bg-slate-100 text-slate-500 border-slate-200',
    icon: XCircle,
  },
}

export const Agenda: React.FC = () => {
  const { company } = useAuth()
  const { toast } = useToast()

  const [events, setEvents] = useState<AgendaEvent[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)

  // Data do calendário em foco
  const [currentDate, setCurrentDate] = useState(new Date())
  // Dia selecionado (clique no calendário)
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    new Date().toISOString().split('T')[0],
  )

  // Filtros
  const [filterType, setFilterType] = useState<'Todos' | AgendaEventType>('Todos')
  const [filterStatus, setFilterStatus] = useState<'Todos' | AgendaEventStatus>('Todos')
  const [searchTerm, setSearchTerm] = useState('')

  // Modal Criar / Editar Evento
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<AgendaEvent | null>(null)
  const [formTitle, setFormTitle] = useState('')
  const [formType, setFormType] = useState<AgendaEventType>('Pedido')
  const [formCustomerId, setFormCustomerId] = useState<string>('none')
  const [formDate, setFormDate] = useState(selectedDateStr)
  const [formTime, setFormTime] = useState('09:00')
  const [formAmount, setFormAmount] = useState('')
  const [formStatus, setFormStatus] = useState<AgendaEventStatus>('pendente')
  const [formNotes, setFormNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Confirmação Exclusão
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    if (!company) return
    try {
      const [evData, custData] = await Promise.all([
        getAgendaEvents(company.id),
        getCustomers(company.id),
      ])
      setEvents(evData)
      setCustomers(custData)
    } catch (err) {
      console.error('Erro ao carregar dados da agenda:', err)
    } finally {
      setLoading(false)
    }
  }, [company])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  useRealtime('agenda_events', () => loadAll(), !!company)
  useRealtime('customers', () => loadAll(), !!company)

  // Navegação no calendário
  const prevMonth = () => {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  }

  const goToToday = () => {
    const today = new Date()
    setCurrentDate(today)
    setSelectedDateStr(today.toISOString().split('T')[0])
  }

  // Gera dias do calendário mensal
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const firstDayIndex = new Date(year, month, 1).getDay() // 0=Dom, 1=Seg...
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const daysInPrevMonth = new Date(year, month, 0).getDate()

    const days = []

    // Dias do mês anterior para preencher a primeira semana
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i
      const prevDate = new Date(year, month - 1, dayNum)
      const dateStr = prevDate.toISOString().split('T')[0]
      days.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
      })
    }

    // Dias do mês corrente
    for (let i = 1; i <= daysInMonth; i++) {
      const thisDate = new Date(year, month, i)
      // Ajuste de fuso: formatar YYYY-MM-DD
      const mm = String(month + 1).padStart(2, '0')
      const dd = String(i).padStart(2, '0')
      const dateStr = `${year}-${mm}-${dd}`
      days.push({
        dateStr,
        dayNum: i,
        isCurrentMonth: true,
      })
    }

    // Dias do próximo mês para completar 35 ou 42 células
    const remaining =
      35 - days.length > 0 ? 35 - days.length : 42 - days.length > 0 ? 42 - days.length : 0
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i)
      const mm = String(nextDate.getMonth() + 1).padStart(2, '0')
      const dd = String(i).padStart(2, '0')
      const dateStr = `${nextDate.getFullYear()}-${mm}-${dd}`
      days.push({
        dateStr,
        dayNum: i,
        isCurrentMonth: false,
      })
    }

    return days
  }, [currentDate])

  // Mapeia eventos por data
  const eventsByDate = useMemo(() => {
    const map = new Map<string, AgendaEvent[]>()
    events.forEach((ev) => {
      const key = ev.event_date.split('T')[0]
      const arr = map.get(key) || []
      arr.push(ev)
      map.set(key, arr)
    })
    return map
  }, [events])

  // Eventos do dia selecionado (para a coluna lateral / painel)
  const selectedDayEvents = useMemo(() => {
    const list = eventsByDate.get(selectedDateStr) || []
    return list.filter((ev) => {
      const matchType = filterType === 'Todos' || ev.event_type === filterType
      const matchStatus = filterStatus === 'Todos' || ev.status === filterStatus
      const matchSearch =
        ev.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ev.notes || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ev.expand?.customer_id?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
      return matchType && matchStatus && matchSearch
    })
  }, [eventsByDate, selectedDateStr, filterType, filterStatus, searchTerm])

  // Handlers Modal
  const openCreateForDay = (dateStr: string) => {
    setEditingEvent(null)
    setFormTitle('')
    setFormType('Pedido')
    setFormCustomerId('none')
    setFormDate(dateStr)
    setFormTime('09:00')
    setFormAmount('')
    setFormStatus('pendente')
    setFormNotes('')
    setIsModalOpen(true)
  }

  const openEditModal = (ev: AgendaEvent) => {
    setEditingEvent(ev)
    setFormTitle(ev.title)
    setFormType(ev.event_type)
    setFormCustomerId(ev.customer_id || 'none')
    setFormDate(ev.event_date.split('T')[0])
    setFormTime(ev.event_time || '09:00')
    setFormAmount(ev.amount !== undefined ? ev.amount.toString() : '')
    setFormStatus(ev.status)
    setFormNotes(ev.notes || '')
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!company) return

    const numAmount = formAmount ? parseFloat(formAmount.replace(',', '.')) : 0

    try {
      setSubmitting(true)
      const payload: Partial<AgendaEvent> = {
        title: formTitle,
        event_type: formType,
        customer_id: formCustomerId === 'none' ? undefined : formCustomerId,
        event_date: formDate,
        event_time: formTime,
        amount: numAmount || undefined,
        status: formStatus,
        notes: formNotes,
      }

      if (editingEvent) {
        await updateAgendaEvent(editingEvent.id, payload)
        toast({ title: 'Agendamento atualizado!' })
      } else {
        await createAgendaEvent({
          ...payload,
          company_id: company.id,
        })
        toast({ title: 'Agendado com sucesso!' })
      }
      setIsModalOpen(false)
      await loadAll()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar agendamento',
        description: err?.message,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTargetId) return
    try {
      await deleteAgendaEvent(deleteTargetId)
      toast({ title: 'Agendamento excluído' })
      setDeleteTargetId(null)
      await loadAll()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir agendamento',
        description: err?.message,
      })
    }
  }

  const handleUpdateStatus = async (ev: AgendaEvent, newStatus: AgendaEventStatus) => {
    try {
      await updateAgendaEvent(ev.id, { status: newStatus })
      toast({ title: `Status alterado para ${STATUS_LABELS[newStatus].label}` })
      await loadAll()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao atualizar status' })
    }
  }

  const todayStr = new Date().toISOString().split('T')[0]
  const monthName = currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })

  // Mini contadores do mês corrente
  const monthStats = useMemo(() => {
    const curYearMonth = `${currentDate.getFullYear()}-${String(
      currentDate.getMonth() + 1,
    ).padStart(2, '0')}`
    const inMonth = events.filter((e) => e.event_date.startsWith(curYearMonth))
    const pedidos = inMonth.filter((e) => e.event_type === 'Pedido').length
    const entregas = inMonth.filter((e) => e.event_type === 'Entrega').length
    const concluidos = inMonth.filter((e) => e.status === 'concluido').length
    return { pedidos, entregas, concluidos, total: inMonth.length }
  }, [events, currentDate])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-emerald-600" />
            Agenda de Pedidos e Entregas
          </h2>
          <p className="text-sm text-slate-500">
            Controle visual de pedidos agendados, prazos de entrega e compromissos operacionais.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={goToToday}
            variant="outline"
            className="text-xs h-9 border-slate-300 text-slate-700"
          >
            Hoje
          </Button>
          <Button
            onClick={() => openCreateForDay(selectedDateStr)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9 px-4 shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Novo Agendamento
          </Button>
        </div>
      </div>

      {/* Mini Stats do Mês */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Package className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-slate-500">Pedidos no Mês</span>
            <p className="text-lg font-bold text-slate-900">{monthStats.pedidos}</p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
            <Truck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-slate-500">Entregas no Mês</span>
            <p className="text-lg font-bold text-slate-900">{monthStats.entregas}</p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-slate-500">Concluídos</span>
            <p className="text-lg font-bold text-emerald-700">{monthStats.concluidos}</p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-slate-500">Total Geral</span>
            <p className="text-lg font-bold text-slate-900">{monthStats.total}</p>
          </div>
        </div>
      </div>

      {/* Layout Principal: Calendário (2/3) + Painel do Dia Selecionado (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Calendário Mensal */}
        <div className="lg:col-span-7 xl:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          {/* Navegação de Mês */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-lg capitalize tracking-tight">
                {monthName}
              </h3>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={prevMonth}
                className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900"
                title="Mês anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={nextMonth}
                className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900"
                title="Próximo mês"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Grid de Dias da Semana */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] text-slate-400 uppercase tracking-wider py-1 border-b border-slate-100">
            <div>Dom</div>
            <div>Seg</div>
            <div>Ter</div>
            <div>Qua</div>
            <div>Qui</div>
            <div>Sex</div>
            <div>Sáb</div>
          </div>

          {/* Grid de Dias do Mês */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {calendarDays.map((cell) => {
              const dayEvts = eventsByDate.get(cell.dateStr) || []
              const isSelected = cell.dateStr === selectedDateStr
              const isToday = cell.dateStr === todayStr

              const pedidosCount = dayEvts.filter((e) => e.event_type === 'Pedido').length
              const entregasCount = dayEvts.filter((e) => e.event_type === 'Entrega').length

              return (
                <div
                  key={cell.dateStr}
                  onClick={() => setSelectedDateStr(cell.dateStr)}
                  className={`min-h-[82px] sm:min-h-[96px] p-1.5 sm:p-2 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20 shadow-xs'
                      : cell.isCurrentMonth
                        ? 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                        : 'border-slate-100 bg-slate-50/50 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        isToday
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : isSelected
                            ? 'text-emerald-700 font-extrabold'
                            : cell.isCurrentMonth
                              ? 'text-slate-700'
                              : 'text-slate-300'
                      }`}
                    >
                      {cell.dayNum}
                    </span>

                    {dayEvts.length > 0 && (
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded-full">
                        {dayEvts.length}
                      </span>
                    )}
                  </div>

                  {/* Marcadores de Eventos */}
                  <div className="space-y-1 mt-1">
                    {pedidosCount > 0 && (
                      <div className="flex items-center gap-1 text-[10px] font-medium text-emerald-800 bg-emerald-100/90 px-1.5 py-0.5 rounded truncate">
                        <Package className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{pedidosCount} ped.</span>
                      </div>
                    )}
                    {entregasCount > 0 && (
                      <div className="flex items-center gap-1 text-[10px] font-medium text-teal-800 bg-teal-100/90 px-1.5 py-0.5 rounded truncate">
                        <Truck className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{entregasCount} entr.</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Pedido
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500" /> Entrega
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-2 ring-emerald-200" />{' '}
                Hoje
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              Clique em qualquer dia para ver e agendar
            </span>
          </div>
        </div>

        {/* Coluna Lateral: Eventos do Dia Selecionado */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide">
                {selectedDateStr === todayStr ? 'Hoje' : 'Dia Selecionado'}
              </span>
              <h3 className="font-bold text-slate-900 text-base">
                {formatDatePtBr(selectedDateStr)}
              </h3>
            </div>

            <Button
              size="sm"
              onClick={() => openCreateForDay(selectedDateStr)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-2.5 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Agendar
            </Button>
          </div>

          {/* Filtros rápidos do dia */}
          <div className="flex items-center gap-2">
            <Select value={filterType} onValueChange={(val: any) => setFilterType(val)}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos Tipos</SelectItem>
                <SelectItem value="Pedido">Pedidos</SelectItem>
                <SelectItem value="Entrega">Entregas</SelectItem>
                <SelectItem value="Outro">Outros</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={(val: any) => setFilterStatus(val)}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos Status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Lista de Eventos do Dia */}
          {selectedDayEvents.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 space-y-2">
              <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto" />
              <p>Nenhum agendamento para este dia.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openCreateForDay(selectedDateStr)}
                className="text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
              >
                + Criar Pedido / Entrega
              </Button>
            </div>
          ) : (
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {selectedDayEvents.map((ev) => {
                const statusInfo = STATUS_LABELS[ev.status] || STATUS_LABELS.pendente
                const StatusIcon = statusInfo.icon

                return (
                  <div
                    key={ev.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:shadow-xs transition space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            ev.event_type === 'Pedido'
                              ? 'bg-emerald-100 text-emerald-800'
                              : ev.event_type === 'Entrega'
                                ? 'bg-teal-100 text-teal-800'
                                : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {ev.event_type}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {ev.event_time || 'Horário livre'}
                        </span>
                      </div>

                      {/* Menu rápido de troca de status */}
                      <Select
                        value={ev.status}
                        onValueChange={(val: any) => handleUpdateStatus(ev, val)}
                      >
                        <SelectTrigger className="h-6 text-[10px] px-2 w-auto border-none bg-transparent font-semibold">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] ${statusInfo.badge}`}
                          >
                            <StatusIcon className="w-2.5 h-2.5" />
                            {statusInfo.label}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="em_andamento">Em Andamento</SelectItem>
                          <SelectItem value="concluido">Concluído</SelectItem>
                          <SelectItem value="cancelado">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <h4 className="font-bold text-xs text-slate-900 leading-snug">{ev.title}</h4>

                    {/* Cliente e Valor */}
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 truncate max-w-[180px]">
                        <User className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">
                          {ev.expand?.customer_id?.name || 'Cliente avulso'}
                        </span>
                      </div>

                      {ev.amount ? (
                        <span className="font-mono font-bold text-slate-800 text-xs">
                          {formatCurrency(ev.amount)}
                        </span>
                      ) : null}
                    </div>

                    {ev.notes && (
                      <p className="text-[11px] text-slate-500 bg-white p-2 rounded border border-slate-100 italic">
                        "{ev.notes}"
                      </p>
                    )}

                    {/* Ações */}
                    <div className="pt-1 flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditModal(ev)}
                        className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTargetId(ev.id)}
                        className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal Criar / Editar Evento */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-emerald-600" />
              {editingEvent ? 'Editar Agendamento' : 'Novo Pedido / Entrega'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="evTitle" className="text-xs font-semibold text-slate-700">
                Título do Agendamento <span className="text-red-500">*</span>
              </Label>
              <Input
                id="evTitle"
                placeholder="Ex: Entrega de lote #42, Pedido de Uniformes..."
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="evType" className="text-xs font-semibold text-slate-700">
                  Tipo <span className="text-red-500">*</span>
                </Label>
                <Select value={formType} onValueChange={(val: any) => setFormType(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pedido">Pedido</SelectItem>
                    <SelectItem value="Entrega">Entrega</SelectItem>
                    <SelectItem value="Outro">Outro Compromisso</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="evStatus" className="text-xs font-semibold text-slate-700">
                  Status Inicial
                </Label>
                <Select value={formStatus} onValueChange={(val: any) => setFormStatus(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="evCust" className="text-xs font-semibold text-slate-700">
                Cliente Vinculado (Opcional)
              </Label>
              <Select value={formCustomerId} onValueChange={(val) => setFormCustomerId(val)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecione um cliente..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum / Cliente avulso</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.client_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="evDate" className="text-xs font-semibold text-slate-700">
                  Data <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="evDate"
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="evTime" className="text-xs font-semibold text-slate-700">
                  Horário
                </Label>
                <Input
                  id="evTime"
                  type="time"
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="evAmount" className="text-xs font-semibold text-slate-700">
                Valor Total (R$) - Opcional
              </Label>
              <Input
                id="evAmount"
                placeholder="0,00"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="evNotes" className="text-xs font-semibold text-slate-700">
                Observações de Entrega / Detalhes do Pedido
              </Label>
              <Textarea
                id="evNotes"
                placeholder="Ex: Endereço de entrega alternativo, contato de recebimento..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
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
                  'Salvar Agendamento'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação Exclusão */}
      <Dialog open={!!deleteTargetId} onOpenChange={() => setDeleteTargetId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Excluir este Agendamento?
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-500">
            Deseja remover este evento da agenda? O registro será excluído permanentemente.
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

export default Agenda
