import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Plus,
  Search,
  ArrowDownLeft,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  DollarSign,
  Loader2,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import { getEntries, createEntry, updateEntry, deleteEntry, createMovement } from '@/services/erp'
import type { Entry } from '@/types/erp'
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

const CATEGORIES = ['Venda', 'Serviço', 'Investimento', 'Outros']

export const Receitas: React.FC = () => {
  const { company } = useAuth()
  const { toast } = useToast()

  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('Todos')

  // Modal Novo / Editar
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null)
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<any>('Venda')
  const [source, setSource] = useState('')
  const [amount, setAmount] = useState('')
  const [status, setStatus] = useState<'Recebida' | 'Pendente'>('Recebida')
  const [paymentMethod, setPaymentMethod] = useState<
    'À vista' | 'Pix' | 'Cartão' | 'Boleto' | 'Transferência'
  >('Pix')
  const [submitting, setSubmitting] = useState(false)

  // Confirmação Exclusão
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!company) return
    try {
      const data = await getEntries(company.id)
      setEntries(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [company])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('entries', () => loadData(), !!company)

  const openCreateModal = () => {
    setEditingEntry(null)
    setEntryDate(new Date().toISOString().split('T')[0])
    setDescription('')
    setCategory('Venda')
    setSource('')
    setAmount('')
    setStatus('Recebida')
    setPaymentMethod('Pix')
    setIsModalOpen(true)
  }

  const openEditModal = (e: Entry) => {
    setEditingEntry(e)
    setEntryDate(e.entry_date.split('T')[0])
    setDescription(e.description)
    setCategory(e.category)
    setSource(e.source || '')
    setAmount(e.amount.toString())
    setStatus(e.status)
    setPaymentMethod(e.payment_method || 'Pix')
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!company) return

    const numAmount = parseFloat(amount.replace(',', '.'))
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({ variant: 'destructive', title: 'Valor inválido' })
      return
    }

    try {
      setSubmitting(true)
      if (editingEntry) {
        await updateEntry(editingEntry.id, {
          entry_date: entryDate,
          description,
          category,
          source,
          amount: numAmount,
          status,
          payment_method: paymentMethod,
        })
        toast({ title: 'Receita atualizada!' })
      } else {
        const created = await createEntry({
          company_id: company.id,
          entry_date: entryDate,
          description,
          category,
          source,
          amount: numAmount,
          status,
          payment_method: paymentMethod,
        })

        // Se recebida, registra no ledger (caso hook server-side não processe)
        if (status === 'Recebida') {
          try {
            await createMovement({
              company_id: company.id,
              movement_date: entryDate,
              type: 'entrada',
              description: `Receita: ${description}`,
              category,
              amount: numAmount,
              reference: `entries/${created.id}`,
            })
          } catch {
            /* intentionally ignored */
          }
        }
        toast({ title: 'Receita registrada!' })
      }
      setIsModalOpen(false)
      await loadData()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: err?.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTargetId) return
    try {
      await deleteEntry(deleteTargetId)
      toast({ title: 'Receita excluída' })
      setDeleteTargetId(null)
      await loadData()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: err?.message })
    }
  }

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      const matchSearch =
        e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.source || '').toLowerCase().includes(searchTerm.toLowerCase())
      const matchStatus = statusFilter === 'Todos' || e.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [entries, searchTerm, statusFilter])

  // Mini Stats
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()

  const totalMes = useMemo(() => {
    return entries
      .filter((e) => {
        const d = new Date(e.entry_date)
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear
      })
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
  }, [entries, currentMonth, currentYear])

  const totalRecebidas = useMemo(() => {
    return entries
      .filter((e) => e.status === 'Recebida')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
  }, [entries])

  const totalPendentes = useMemo(() => {
    return entries
      .filter((e) => e.status === 'Pendente')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
  }, [entries])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Receitas</h2>
          <p className="text-sm text-slate-500">
            Controle de entradas financeiras, aportes, prestações de serviço e vendas.
          </p>
        </div>

        <Button
          onClick={openCreateModal}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9 px-4 shadow-sm flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Nova Receita
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">Total do Mês Atual</span>
          <p className="text-xl font-bold font-mono text-slate-900 mt-1">
            {formatCurrency(totalMes)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">
            Total Recebido (Efetivado)
          </span>
          <p className="text-xl font-bold font-mono text-emerald-700 mt-1">
            {formatCurrency(totalRecebidas)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">
            Pendente de Recebimento
          </span>
          <p className="text-xl font-bold font-mono text-amber-700 mt-1">
            {formatCurrency(totalPendentes)}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <Input
            placeholder="Buscar por descrição ou origem..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 border-slate-200 text-xs"
          />
        </div>

        <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val)}>
          <SelectTrigger className="w-40 h-10 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos">Todos os Status</SelectItem>
            <SelectItem value="Recebida">Recebida</SelectItem>
            <SelectItem value="Pendente">Pendente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List / Table */}
      {filteredEntries.length === 0 ? (
        <EmptyState
          icon={<ArrowDownLeft className="w-8 h-8" />}
          title="Nenhuma receita registrada"
          description="Cadastre entradas financeiras para manter seu fluxo de caixa em dia."
          actionLabel="+ Nova Receita"
          onAction={openCreateModal}
        />
      ) : (
        <>
          {/* Mobile Cards (telas pequenas) */}
          <div className="md:hidden space-y-3">
            {filteredEntries.map((item) => (
              <div
                key={item.id}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-medium text-slate-400">
                      {formatDatePtBr(item.entry_date)}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 leading-tight mt-0.5">
                      {item.description}
                    </h4>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                      item.status === 'Recebida'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {item.status === 'Recebida' ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <Clock className="w-3 h-3" />
                    )}
                    {item.status}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                    {item.category}
                  </span>
                  <span>•</span>
                  <span>{item.payment_method || 'À vista'}</span>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <p className="text-base font-bold font-mono text-emerald-600">
                    +{formatCurrency(item.amount)}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(item)}
                      className="p-2 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 active:bg-slate-200 transition"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTargetId(item.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 active:bg-red-100 transition"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table (md ou superior) */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4">Descrição</th>
                    <th className="py-3 px-4">Categoria</th>
                    <th className="py-3 px-4">Pagamento</th>
                    <th className="py-3 px-4 text-right">Valor</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredEntries.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                        {formatDatePtBr(item.entry_date)}
                      </td>
                      <td className="py-3 px-4 text-slate-800 font-semibold max-w-[220px] truncate">
                        {item.description}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{item.payment_method || '-'}</td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-700 text-right whitespace-nowrap">
                        +{formatCurrency(item.amount)}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            item.status === 'Recebida'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {item.status === 'Recebida' ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <Clock className="w-3 h-3" />
                          )}
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTargetId(item.id)}
                            className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal Criar / Editar */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[480px] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              {editingEntry ? 'Editar Receita' : 'Nova Receita'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="eDate" className="text-xs font-semibold text-slate-700">
                  Data <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="eDate"
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="eAmount" className="text-xs font-semibold text-slate-700">
                  Valor (R$) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="eAmount"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-9 text-xs font-mono"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="eDesc" className="text-xs font-semibold text-slate-700">
                Descrição <span className="text-red-500">*</span>
              </Label>
              <Input
                id="eDesc"
                placeholder="Ex: Recebimento de Contrato Mensal"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="eCat" className="text-xs font-semibold text-slate-700">
                  Categoria
                </Label>
                <Select value={category} onValueChange={(val) => setCategory(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="eStatus" className="text-xs font-semibold text-slate-700">
                  Status
                </Label>
                <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Recebida">Recebida</SelectItem>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ePayMethod" className="text-xs font-semibold text-slate-700">
                Forma de Pagamento
              </Label>
              <Select value={paymentMethod} onValueChange={(val: any) => setPaymentMethod(val)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pix">Pix</SelectItem>
                  <SelectItem value="Cartão">Cartão</SelectItem>
                  <SelectItem value="Boleto">Boleto</SelectItem>
                  <SelectItem value="À vista">À vista (Dinheiro)</SelectItem>
                  <SelectItem value="Transferência">Transferência</SelectItem>
                </SelectContent>
              </Select>
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
                  'Salvar Receita'
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
              Excluir Receita?
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-500">
            Deseja excluir esta receita? O registro será removido permanentemente.
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

export default Receitas
