import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Plus,
  Search,
  ReceiptText,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Check,
  Loader2,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import {
  getReceivables,
  createReceivable,
  updateReceivable,
  deleteReceivable,
  getCustomers,
  createMovement,
} from '@/services/erp'
import type { Receivable, Customer } from '@/types/erp'
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

export const ContasAReceber: React.FC = () => {
  const { company } = useAuth()
  const { toast } = useToast()

  const [receivables, setReceivables] = useState<Receivable[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('Todas')

  // Modal Novo / Editar
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingReceivable, setEditingReceivable] = useState<Receivable | null>(null)
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')
  const [clientId, setClientId] = useState('')
  const [amount, setAmount] = useState('')
  const [status, setStatus] = useState<'Em aberto' | 'Recebida'>('Em aberto')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Confirmação de baixa ("Marcar como Recebida")
  const [markReceivedTarget, setMarkReceivedTarget] = useState<Receivable | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!company) return
    try {
      const [recData, custData] = await Promise.all([
        getReceivables(company.id),
        getCustomers(company.id),
      ])
      setReceivables(recData)
      setCustomers(custData)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [company])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('receivables', () => loadData(), !!company)

  const openCreateModal = () => {
    setEditingReceivable(null)
    setDueDate(new Date().toISOString().split('T')[0])
    setDescription('')
    setClientId('')
    setAmount('')
    setStatus('Em aberto')
    setNotes('')
    setIsModalOpen(true)
  }

  const openEditModal = (r: Receivable) => {
    setEditingReceivable(r)
    setDueDate(r.due_date.split('T')[0])
    setDescription(r.description)
    setClientId(r.client_id || '')
    setAmount(r.amount.toString())
    setStatus(r.status)
    setNotes(r.notes || '')
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
      if (editingReceivable) {
        await updateReceivable(editingReceivable.id, {
          due_date: dueDate,
          description,
          client_id: clientId || undefined,
          amount: numAmount,
          status,
          notes,
        })
        toast({ title: 'Conta a receber atualizada!' })
      } else {
        const created = await createReceivable({
          company_id: company.id,
          due_date: dueDate,
          description,
          client_id: clientId || undefined,
          amount: numAmount,
          status,
          notes,
        })

        // Se já criada como Recebida
        if (status === 'Recebida') {
          try {
            await createMovement({
              company_id: company.id,
              movement_date: dueDate,
              type: 'entrada',
              description: `Recebimento: ${description}`,
              category: 'Contas a Receber',
              amount: numAmount,
              reference: `receivables/${created.id}`,
            })
          } catch {
            /* intentionally ignored */
          }
        }

        toast({ title: 'Conta a receber cadastrada!' })
      }
      setIsModalOpen(false)
      await loadData()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: err?.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmReceived = async () => {
    if (!markReceivedTarget || !company) return
    try {
      await updateReceivable(markReceivedTarget.id, { status: 'Recebida' })

      // Registra entrada correspondente no caixa
      try {
        await createMovement({
          company_id: company.id,
          movement_date: new Date().toISOString().split('T')[0],
          type: 'entrada',
          description: `Quitação Conta a Receber: ${markReceivedTarget.description}`,
          category: 'Contas a Receber',
          amount: markReceivedTarget.amount,
          reference: `receivables/${markReceivedTarget.id}`,
        })
      } catch {
        /* intentionally ignored */
      }

      toast({
        title: 'Conta marcada como Recebida!',
        description: 'Movimentação de entrada registrada no livro caixa.',
      })
      setMarkReceivedTarget(null)
      await loadData()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao liquidar conta', description: err?.message })
    }
  }

  const handleDelete = async () => {
    if (!deleteTargetId) return
    try {
      await deleteReceivable(deleteTargetId)
      toast({ title: 'Conta removida com sucesso' })
      setDeleteTargetId(null)
      await loadData()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: err?.message })
    }
  }

  const todayStr = new Date().toISOString().split('T')[0]

  const filteredReceivables = useMemo(() => {
    return receivables.filter((r) => {
      const matchSearch =
        r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.expand?.client_id?.name || '').toLowerCase().includes(searchTerm.toLowerCase())

      const isOverdue = r.due_date < todayStr && r.status === 'Em aberto'

      let matchStatus = true
      if (statusFilter === 'Abertas') matchStatus = r.status === 'Em aberto' && !isOverdue
      else if (statusFilter === 'Recebidas') matchStatus = r.status === 'Recebida'
      else if (statusFilter === 'Vencidas') matchStatus = isOverdue

      return matchSearch && matchStatus
    })
  }, [receivables, searchTerm, statusFilter, todayStr])

  // Mini Stats
  const totalEmAberto = useMemo(() => {
    return receivables
      .filter((r) => r.status === 'Em aberto' && r.due_date >= todayStr)
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
  }, [receivables, todayStr])

  const totalAtrasado = useMemo(() => {
    return receivables
      .filter((r) => r.status === 'Em aberto' && r.due_date < todayStr)
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
  }, [receivables, todayStr])

  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()

  const totalRecebidoMes = useMemo(() => {
    return receivables
      .filter((r) => {
        const d = new Date(r.due_date)
        return (
          r.status === 'Recebida' &&
          d.getMonth() === currentMonth &&
          d.getFullYear() === currentYear
        )
      })
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
  }, [receivables, currentMonth, currentYear])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Contas a Receber
          </h2>
          <p className="text-sm text-slate-500">
            Acompanhe compromissos financeiros de clientes, faturas e cobranças pendentes.
          </p>
        </div>

        <Button
          onClick={openCreateModal}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9 px-4 shadow-sm flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Nova Conta a Receber
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">
            Total em Aberto (A Vencer)
          </span>
          <p className="text-xl font-bold font-mono text-amber-700 mt-1">
            {formatCurrency(totalEmAberto)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">
            Total Atrasado / Inadimplência
          </span>
          <p
            className={`text-xl font-bold font-mono mt-1 ${
              totalAtrasado > 0 ? 'text-red-700' : 'text-slate-800'
            }`}
          >
            {formatCurrency(totalAtrasado)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">
            Recebido no Mês Corrente
          </span>
          <p className="text-xl font-bold font-mono text-emerald-700 mt-1">
            {formatCurrency(totalRecebidoMes)}
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <Input
            placeholder="Buscar por descrição ou cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 border-slate-200 text-xs"
          />
        </div>

        <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val)}>
          <SelectTrigger className="w-44 h-10 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Todas">Todas as Contas</SelectItem>
            <SelectItem value="Abertas">Em Aberto (No Prazo)</SelectItem>
            <SelectItem value="Vencidas">Atrasadas / Vencidas</SelectItem>
            <SelectItem value="Recebidas">Recebidas (Quitadas)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List / Table */}
      {filteredReceivables.length === 0 ? (
        <EmptyState
          icon={<ReceiptText className="w-8 h-8" />}
          title="Nenhuma conta a receber encontrada"
          description="Cadastre previsões de recebimento para acompanhar sua liquidez."
          actionLabel="+ Nova Conta a Receber"
          onAction={openCreateModal}
        />
      ) : (
        <>
          {/* Mobile Cards (telas pequenas) */}
          <div className="md:hidden space-y-3">
            {filteredReceivables.map((item) => {
              const isOverdue = item.due_date < todayStr && item.status === 'Em aberto'

              return (
                <div
                  key={item.id}
                  className={`bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3 ${
                    isOverdue ? 'border-red-200 bg-red-50/15' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-medium text-slate-400">
                        Vencimento: {formatDatePtBr(item.due_date)}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 leading-tight mt-0.5">
                        {item.description}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Cliente: {item.expand?.client_id?.name || 'Cliente Avulso'}
                      </p>
                    </div>

                    <div>
                      {item.status === 'Recebida' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                          <CheckCircle2 className="w-3 h-3" /> Recebida
                        </span>
                      ) : isOverdue ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                          <AlertCircle className="w-3 h-3" /> Atrasada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800">
                          <Clock className="w-3 h-3" /> Em aberto
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase">Valor a Receber</span>
                      <p className="text-base font-bold font-mono text-slate-900">
                        {formatCurrency(item.amount)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      {item.status === 'Em aberto' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setMarkReceivedTarget(item)}
                          className="h-8 text-xs px-2.5 border-emerald-400 text-emerald-700 hover:bg-emerald-50 font-semibold"
                        >
                          <Check className="w-3.5 h-3.5 mr-1" /> Receber
                        </Button>
                      )}
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
              )
            })}
          </div>

          {/* Desktop Table (md ou superior) */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Vencimento</th>
                    <th className="py-3 px-4">Descrição</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4 text-right">Valor</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredReceivables.map((item) => {
                    const isOverdue = item.due_date < todayStr && item.status === 'Em aberto'

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-50/60 transition ${
                          isOverdue ? 'bg-red-50/30' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                          {formatDatePtBr(item.due_date)}
                        </td>

                        <td className="py-3 px-4 text-slate-800 font-semibold max-w-[200px] truncate">
                          {item.description}
                        </td>

                        <td className="py-3 px-4 text-slate-600 max-w-[160px] truncate">
                          {item.expand?.client_id?.name || 'Cliente Avulso'}
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-slate-900 text-right whitespace-nowrap">
                          {formatCurrency(item.amount)}
                        </td>

                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {item.status === 'Recebida' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                              <CheckCircle2 className="w-3 h-3" /> Recebida
                            </span>
                          ) : isOverdue ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                              <AlertCircle className="w-3 h-3" /> Atrasada
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800">
                              <Clock className="w-3 h-3" /> Em aberto
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {item.status === 'Em aberto' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setMarkReceivedTarget(item)}
                                className="h-7 text-[11px] px-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 font-semibold"
                              >
                                <Check className="w-3 h-3 mr-1" /> Marcar Recebida
                              </Button>
                            )}
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
                    )
                  })}
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
              {editingReceivable ? 'Editar Conta a Receber' : 'Nova Conta a Receber'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rDueDate" className="text-xs font-semibold text-slate-700">
                  Data de Vencimento <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="rDueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rAmount" className="text-xs font-semibold text-slate-700">
                  Valor (R$) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="rAmount"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-9 text-xs font-mono"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rDesc" className="text-xs font-semibold text-slate-700">
                Descrição do Título <span className="text-red-500">*</span>
              </Label>
              <Input
                id="rDesc"
                placeholder="Ex: Cobrança Contrato #102 / Parcela 1/3"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rClientId" className="text-xs font-semibold text-slate-700">
                Cliente
              </Label>
              <Select value={clientId} onValueChange={(val) => setClientId(val)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecione um cliente ou deixe avulso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="avulso">Cliente Avulso (Não vinculado)</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.document})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rStatus" className="text-xs font-semibold text-slate-700">
                Status
              </Label>
              <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Em aberto">Em aberto</SelectItem>
                  <SelectItem value="Recebida">Recebida</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rNotes" className="text-xs font-semibold text-slate-700">
                Observações
              </Label>
              <Textarea
                id="rNotes"
                placeholder="Detalhes adicionais do pagamento..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs resize-none h-16"
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
                  'Salvar Conta'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmar Recebimento */}
      <Dialog open={!!markReceivedTarget} onOpenChange={() => setMarkReceivedTarget(null)}>
        <DialogContent className="w-[92vw] sm:max-w-[420px] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Confirmar Recebimento
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-600">
            Deseja marcar o recebimento de <strong>"{markReceivedTarget?.description}"</strong> no
            valor de{' '}
            <strong className="text-emerald-700 font-mono">
              {formatCurrency(markReceivedTarget?.amount)}
            </strong>{' '}
            como RECEBIDO? Uma entrada de caixa será registrada no ledger.
          </p>
          <DialogFooter className="pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMarkReceivedTarget(null)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmReceived}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
            >
              Confirmar Recebimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <Dialog open={!!deleteTargetId} onOpenChange={() => setDeleteTargetId(null)}>
        <DialogContent className="w-[92vw] sm:max-w-[400px] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Excluir Conta a Receber?
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-500">
            Tem certeza de que deseja remover esta conta a receber do sistema?
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

export default ContasAReceber
