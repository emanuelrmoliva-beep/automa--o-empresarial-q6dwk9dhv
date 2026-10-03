import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Plus,
  Search,
  CreditCard,
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
  getPayables,
  createPayable,
  updatePayable,
  deletePayable,
  createMovement,
} from '@/services/erp'
import type { Payable } from '@/types/erp'
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

export const ContasAPagar: React.FC = () => {
  const { company } = useAuth()
  const { toast } = useToast()

  const [payables, setPayables] = useState<Payable[]>([])
  const [loading, setLoading] = useState(true)

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('Todas')

  // Modal Novo / Editar
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPayable, setEditingPayable] = useState<Payable | null>(null)
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')
  const [supplier, setSupplier] = useState('')
  const [amount, setAmount] = useState('')
  const [status, setStatus] = useState<'Em aberto' | 'Pago'>('Em aberto')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Confirmação de baixa ("Marcar como Pago")
  const [markPaidTarget, setMarkPaidTarget] = useState<Payable | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!company) return
    try {
      const data = await getPayables(company.id)
      setPayables(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [company])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('payables', () => loadData(), !!company)

  const openCreateModal = () => {
    setEditingPayable(null)
    setDueDate(new Date().toISOString().split('T')[0])
    setDescription('')
    setSupplier('')
    setAmount('')
    setStatus('Em aberto')
    setNotes('')
    setIsModalOpen(true)
  }

  const openEditModal = (p: Payable) => {
    setEditingPayable(p)
    setDueDate(p.due_date.split('T')[0])
    setDescription(p.description)
    setSupplier(p.supplier || '')
    setAmount(p.amount.toString())
    setStatus(p.status)
    setNotes(p.notes || '')
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
      if (editingPayable) {
        await updatePayable(editingPayable.id, {
          due_date: dueDate,
          description,
          supplier,
          amount: numAmount,
          status,
          notes,
        })
        toast({ title: 'Conta a pagar atualizada!' })
      } else {
        const created = await createPayable({
          company_id: company.id,
          due_date: dueDate,
          description,
          supplier,
          amount: numAmount,
          status,
          notes,
        })

        // Se já cadastrada como Paga
        if (status === 'Pago') {
          try {
            await createMovement({
              company_id: company.id,
              movement_date: dueDate,
              type: 'saída',
              description: `Pagamento: ${description}`,
              category: 'Contas a Pagar',
              amount: numAmount,
              reference: `payables/${created.id}`,
            })
          } catch {
            /* intentionally ignored */
          }
        }

        toast({ title: 'Conta a pagar cadastrada!' })
      }
      setIsModalOpen(false)
      await loadData()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: err?.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmPay = async () => {
    if (!markPaidTarget || !company) return
    try {
      await updatePayable(markPaidTarget.id, { status: 'Pago' })

      // Registra saída correspondente
      try {
        await createMovement({
          company_id: company.id,
          movement_date: new Date().toISOString().split('T')[0],
          type: 'saída',
          description: `Quitação Conta a Pagar: ${markPaidTarget.description}`,
          category: 'Contas a Pagar',
          amount: markPaidTarget.amount,
          reference: `payables/${markPaidTarget.id}`,
        })
      } catch {
        /* intentionally ignored */
      }

      toast({
        title: 'Conta marcada como Paga!',
        description: 'Movimentação de saída registrada no livro caixa.',
      })
      setMarkPaidTarget(null)
      await loadData()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao liquidar conta', description: err?.message })
    }
  }

  const handleDelete = async () => {
    if (!deleteTargetId) return
    try {
      await deletePayable(deleteTargetId)
      toast({ title: 'Conta a pagar removida!' })
      setDeleteTargetId(null)
      await loadData()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: err?.message })
    }
  }

  const todayStr = new Date().toISOString().split('T')[0]

  const filteredPayables = useMemo(() => {
    return payables.filter((p) => {
      const matchSearch =
        p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.supplier || '').toLowerCase().includes(searchTerm.toLowerCase())

      const isOverdue = p.due_date < todayStr && p.status === 'Em aberto'

      let matchStatus = true
      if (statusFilter === 'Abertas') matchStatus = p.status === 'Em aberto' && !isOverdue
      else if (statusFilter === 'Pagas') matchStatus = p.status === 'Pago'
      else if (statusFilter === 'Vencidas') matchStatus = isOverdue

      return matchSearch && matchStatus
    })
  }, [payables, searchTerm, statusFilter, todayStr])

  // Mini Stats
  const totalEmAberto = useMemo(() => {
    return payables
      .filter((p) => p.status === 'Em aberto' && p.due_date >= todayStr)
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
  }, [payables, todayStr])

  const totalAtrasado = useMemo(() => {
    return payables
      .filter((p) => p.status === 'Em aberto' && p.due_date < todayStr)
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
  }, [payables, todayStr])

  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()

  const totalPagoMes = useMemo(() => {
    return payables
      .filter((p) => {
        const d = new Date(p.due_date)
        return (
          p.status === 'Pago' && d.getMonth() === currentMonth && d.getFullYear() === currentYear
        )
      })
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
  }, [payables, currentMonth, currentYear])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Contas a Pagar
          </h2>
          <p className="text-sm text-slate-500">
            Controle títulos, boletos, fornecedores e vencimentos futuros.
          </p>
        </div>

        <Button
          onClick={openCreateModal}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9 px-4 shadow-sm flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Nova Conta a Pagar
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
            Total Atrasado / Vencido
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
            Pago no Mês Corrente
          </span>
          <p className="text-xl font-bold font-mono text-emerald-700 mt-1">
            {formatCurrency(totalPagoMes)}
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <Input
            placeholder="Buscar por descrição ou fornecedor..."
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
            <SelectItem value="Pagas">Pagas (Quitadas)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filteredPayables.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="w-8 h-8" />}
          title="Nenhuma conta a pagar encontrada"
          description="Cadastre seus compromissos financeiros futuros para prever o fluxo de caixa."
          actionLabel="+ Nova Conta a Pagar"
          onAction={openCreateModal}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Vencimento</th>
                  <th className="py-3 px-4">Descrição</th>
                  <th className="py-3 px-4">Fornecedor</th>
                  <th className="py-3 px-4 text-right">Valor</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredPayables.map((item) => {
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
                        {item.supplier || '-'}
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-slate-900 text-right whitespace-nowrap">
                        {formatCurrency(item.amount)}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {item.status === 'Pago' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                            <CheckCircle2 className="w-3 h-3" /> Pago
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                            <AlertCircle className="w-3 h-3" /> Atrasado
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
                              onClick={() => setMarkPaidTarget(item)}
                              className="h-7 text-[11px] px-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 font-semibold"
                            >
                              <Check className="w-3 h-3 mr-1" /> Marcar Pago
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
      )}

      {/* Modal Criar / Editar */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              {editingPayable ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pDueDate" className="text-xs font-semibold text-slate-700">
                  Data de Vencimento <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="pDueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pAmount" className="text-xs font-semibold text-slate-700">
                  Valor (R$) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="pAmount"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-9 text-xs font-mono"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pDesc" className="text-xs font-semibold text-slate-700">
                Descrição do Título <span className="text-red-500">*</span>
              </Label>
              <Input
                id="pDesc"
                placeholder="Ex: Fatura Fornecedor XYZ / Energia Elétrica"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pSupplier" className="text-xs font-semibold text-slate-700">
                  Fornecedor / Beneficiário
                </Label>
                <Input
                  id="pSupplier"
                  placeholder="Nome do fornecedor"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pStatus" className="text-xs font-semibold text-slate-700">
                  Status
                </Label>
                <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Em aberto">Em aberto</SelectItem>
                    <SelectItem value="Pago">Pago</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pNotes" className="text-xs font-semibold text-slate-700">
                Observações / Código de Barras
              </Label>
              <Textarea
                id="pNotes"
                placeholder="Linha digitável, chave pix, etc..."
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

      {/* Modal Confirmar Pagamento */}
      <Dialog open={!!markPaidTarget} onOpenChange={() => setMarkPaidTarget(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Confirmar Pagamento
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-600">
            Deseja marcar a conta <strong>"{markPaidTarget?.description}"</strong> no valor de{' '}
            <strong className="text-emerald-700 font-mono">
              {formatCurrency(markPaidTarget?.amount)}
            </strong>{' '}
            como PAGA? Uma saída de caixa será registrada automaticamente no ledger.
          </p>
          <DialogFooter className="pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMarkPaidTarget(null)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmPay}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
            >
              Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <Dialog open={!!deleteTargetId} onOpenChange={() => setDeleteTargetId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Excluir Conta a Pagar?
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-500">
            Tem certeza de que deseja excluir este título do sistema?
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

export default ContasAPagar
