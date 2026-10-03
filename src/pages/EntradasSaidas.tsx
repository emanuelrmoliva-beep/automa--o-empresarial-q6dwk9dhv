import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  History,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Loader2,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import { getMovements, createMovement } from '@/services/erp'
import type { Movement } from '@/types/erp'
import { formatCurrency, formatDatePtBr } from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

export const EntradasSaidas: React.FC = () => {
  const { company } = useAuth()
  const { toast } = useToast()

  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [typeFilter, setTypeFilter] = useState<'Todas' | 'entrada' | 'saída'>('Todas')
  const [periodFilter, setPeriodFilter] = useState('Todos')

  // Modal Novo Lançamento Manual
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [movDate, setMovDate] = useState(new Date().toISOString().split('T')[0])
  const [movType, setMovType] = useState<'entrada' | 'saída'>('entrada')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadData = useCallback(async () => {
    if (!company) return
    try {
      const data = await getMovements(company.id)
      setMovements(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [company])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('movements', () => loadData(), !!company)

  const handleCreateMovement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!company) return

    const numAmount = parseFloat(amount.replace(',', '.'))
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({ variant: 'destructive', title: 'Valor inválido' })
      return
    }

    try {
      setSubmitting(true)
      await createMovement({
        company_id: company.id,
        movement_date: movDate,
        type: movType,
        description,
        category: category || 'Avulso',
        amount: numAmount,
        reference: `manual/${Date.now()}`,
      })

      toast({
        title: 'Movimentação registrada!',
        description: `Lançamento de ${movType} incluído no livro caixa.`,
      })

      setIsModalOpen(false)
      setDescription('')
      setCategory('')
      setAmount('')
      await loadData()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao registrar', description: err?.message })
    } finally {
      setSubmitting(false)
    }
  }

  // Filtragem
  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      const matchType = typeFilter === 'Todas' || m.type === typeFilter

      let matchPeriod = true
      if (periodFilter !== 'Todos') {
        const today = new Date()
        const mDate = new Date(m.movement_date)
        if (periodFilter === 'Hoje') {
          matchPeriod = mDate.toISOString().split('T')[0] === today.toISOString().split('T')[0]
        } else if (periodFilter === '30dias') {
          const diff = (today.getTime() - mDate.getTime()) / (1000 * 3600 * 24)
          matchPeriod = diff <= 30 && diff >= 0
        } else if (periodFilter === 'Mes') {
          matchPeriod =
            mDate.getMonth() === today.getMonth() && mDate.getFullYear() === today.getFullYear()
        }
      }

      return matchType && matchPeriod
    })
  }, [movements, typeFilter, periodFilter])

  // Agrupamento por Data (Timeline)
  const groupedMovements = useMemo(() => {
    const groups: Record<string, Movement[]> = {}
    filteredMovements.forEach((m) => {
      const dateKey = m.movement_date ? m.movement_date.split('T')[0] : 'Data Desconhecida'
      if (!groups[dateKey]) groups[dateKey] = []
      groups[dateKey].push(m)
    })

    // Ordena as chaves por data decrescente
    const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a))
    return sortedDates.map((dateStr) => {
      const dayList = groups[dateStr]
      const totalEntradas = dayList
        .filter((item) => item.type === 'entrada')
        .reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
      const totalSaidas = dayList
        .filter((item) => item.type === 'saída')
        .reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
      const saldoDia = totalEntradas - totalSaidas

      return {
        dateStr,
        items: dayList,
        totalEntradas,
        totalSaidas,
        saldoDia,
      }
    })
  }, [filteredMovements])

  // Totais do período filtrado
  const totalEntradasPeriodo = useMemo(() => {
    return filteredMovements
      .filter((m) => m.type === 'entrada')
      .reduce((sum, m) => sum + (Number(m.amount) || 0), 0)
  }, [filteredMovements])

  const totalSaidasPeriodo = useMemo(() => {
    return filteredMovements
      .filter((m) => m.type === 'saída')
      .reduce((sum, m) => sum + (Number(m.amount) || 0), 0)
  }, [filteredMovements])

  const saldoPeriodo = totalEntradasPeriodo - totalSaidasPeriodo

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Entradas e Saídas (Ledger)
          </h2>
          <p className="text-sm text-slate-500">
            Livro caixa contábil com histórico cronológico de todas as transações financeiras.
          </p>
        </div>

        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9 px-4 shadow-sm flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Novo Lançamento Avulso
        </Button>
      </div>

      {/* Resumo do Período */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total de Entradas
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-700 mt-2">
            +{formatCurrency(totalEntradasPeriodo)}
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total de Saídas</span>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-red-700 mt-2">
            -{formatCurrency(totalSaidasPeriodo)}
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Saldo Líquido do Período
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p
            className={`text-2xl font-bold font-mono mt-2 ${
              saldoPeriodo >= 0 ? 'text-emerald-700' : 'text-red-700'
            }`}
          >
            {formatCurrency(saldoPeriodo)}
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <Button
            size="sm"
            variant={typeFilter === 'Todas' ? 'default' : 'outline'}
            onClick={() => setTypeFilter('Todas')}
            className={`text-xs h-8 sm:h-9 shrink-0 ${
              typeFilter === 'Todas' ? 'bg-slate-900 text-white hover:bg-slate-800' : ''
            }`}
          >
            Todas
          </Button>

          <Button
            size="sm"
            variant={typeFilter === 'entrada' ? 'default' : 'outline'}
            onClick={() => setTypeFilter('entrada')}
            className={`text-xs h-8 sm:h-9 shrink-0 ${
              typeFilter === 'entrada'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5 mr-1" /> Entradas
          </Button>

          <Button
            size="sm"
            variant={typeFilter === 'saída' ? 'default' : 'outline'}
            onClick={() => setTypeFilter('saída')}
            className={`text-xs h-8 sm:h-9 shrink-0 ${
              typeFilter === 'saída'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'text-red-700 hover:bg-red-50'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5 mr-1" /> Saídas
          </Button>
        </div>

        <Select value={periodFilter} onValueChange={(val) => setPeriodFilter(val)}>
          <SelectTrigger className="w-full sm:w-40 h-9 text-xs">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos">Todo o histórico</SelectItem>
            <SelectItem value="Hoje">Hoje</SelectItem>
            <SelectItem value="30dias">Últimos 30 dias</SelectItem>
            <SelectItem value="Mes">Este Mês</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Timeline agrupada por data */}
      {groupedMovements.length === 0 ? (
        <EmptyState
          icon={<History className="w-8 h-8" />}
          title="Nenhuma movimentação registrada"
          description="Quando receitas, vendas, despesas ou contas forem quitadas, o histórico aparecerá aqui."
          actionLabel="+ Lançamento Avulso"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="space-y-6">
          {groupedMovements.map((group) => (
            <div
              key={group.dateStr}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
            >
              {/* Header do Dia */}
              <div className="bg-slate-50/90 px-4 sm:px-5 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-bold text-slate-800">
                    {formatDatePtBr(group.dateStr)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-mono">
                  <span className="text-emerald-700 font-semibold text-[11px]">
                    +{formatCurrency(group.totalEntradas)}
                  </span>
                  <span className="text-slate-300 hidden sm:inline">•</span>
                  <span className="text-red-700 font-semibold text-[11px]">
                    -{formatCurrency(group.totalSaidas)}
                  </span>
                  <span className="text-slate-300 hidden sm:inline">•</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                      group.saldoDia >= 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    Saldo: {formatCurrency(group.saldoDia)}
                  </span>
                </div>
              </div>

              {/* Linhas de lançamentos */}
              <div className="divide-y divide-slate-100">
                {group.items.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 sm:p-4 flex items-center justify-between gap-2.5 sm:gap-4 hover:bg-slate-50/50 transition"
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          m.type === 'entrada'
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-red-50 text-red-600'
                        }`}
                      >
                        {m.type === 'entrada' ? (
                          <ArrowDownLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate max-w-[170px] sm:max-w-none">
                            {m.description}
                          </p>
                          <span
                            className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 sm:px-2 py-0.2 rounded-full shrink-0 ${
                              m.type === 'entrada'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-red-50 text-red-700'
                            }`}
                          >
                            {m.type}
                          </span>
                        </div>
                        <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">
                          {m.category || 'Geral'} {m.reference ? `• Ref: ${m.reference}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-xs sm:text-base font-mono font-bold whitespace-nowrap ${
                          m.type === 'entrada' ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {m.type === 'entrada' ? '+' : '-'} {formatCurrency(m.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Lançamento Manual */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[480px] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Novo Lançamento Avulso (Livro Caixa)
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateMovement} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={movType === 'entrada' ? 'default' : 'outline'}
                onClick={() => setMovType('entrada')}
                className={`text-xs h-9 ${
                  movType === 'entrada' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5 mr-1" /> Entrada (+)
              </Button>
              <Button
                type="button"
                variant={movType === 'saída' ? 'default' : 'outline'}
                onClick={() => setMovType('saída')}
                className={`text-xs h-9 ${
                  movType === 'saída' ? 'bg-red-600 hover:bg-red-700 text-white' : ''
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5 mr-1" /> Saída (-)
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mDate" className="text-xs font-semibold text-slate-700">
                  Data <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="mDate"
                  type="date"
                  value={movDate}
                  onChange={(e) => setMovDate(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mAmount" className="text-xs font-semibold text-slate-700">
                  Valor (R$) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="mAmount"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-9 text-xs font-mono"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mDesc" className="text-xs font-semibold text-slate-700">
                Descrição <span className="text-red-500">*</span>
              </Label>
              <Input
                id="mDesc"
                placeholder="Ex: Aporte de capital, retirada de pró-labore..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mCat" className="text-xs font-semibold text-slate-700">
                Categoria
              </Label>
              <Input
                id="mCat"
                placeholder="Ex: Financeiro, Caixa, Administrativo"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-9 text-xs"
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
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Registrando...
                  </>
                ) : (
                  'Registrar Lançamento'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default EntradasSaidas
