import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Plus,
  Search,
  ArrowUpRight,
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
import {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  createMovement,
} from '@/services/erp'
import type { Expense } from '@/types/erp'
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

const EXPENSE_CATEGORIES = [
  'Aluguel',
  'Salários',
  'Impostos',
  'Fornecedores',
  'Transporte',
  'Marketing',
  'Utilidades',
  'Outros',
]

export const Despesas: React.FC = () => {
  const { company } = useAuth()
  const { toast } = useToast()

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('Todos')

  // Modal Novo / Editar
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<any>('Fornecedores')
  const [amount, setAmount] = useState('')
  const [status, setStatus] = useState<'Paga' | 'Pendente'>('Paga')
  const [paymentMethod, setPaymentMethod] = useState<
    'À vista' | 'Pix' | 'Cartão' | 'Boleto' | 'Transferência'
  >('Pix')
  const [submitting, setSubmitting] = useState(false)

  // Confirmação Exclusão
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!company) return
    try {
      const data = await getExpenses(company.id)
      setExpenses(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [company])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('expenses', () => loadData(), !!company)

  const openCreateModal = () => {
    setEditingExpense(null)
    setExpenseDate(new Date().toISOString().split('T')[0])
    setDescription('')
    setCategory('Fornecedores')
    setAmount('')
    setStatus('Paga')
    setPaymentMethod('Pix')
    setIsModalOpen(true)
  }

  const openEditModal = (exp: Expense) => {
    setEditingExpense(exp)
    setExpenseDate(exp.expense_date.split('T')[0])
    setDescription(exp.description)
    setCategory(exp.category)
    setAmount(exp.amount.toString())
    setStatus(exp.status)
    setPaymentMethod(exp.payment_method || 'Pix')
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
      if (editingExpense) {
        await updateExpense(editingExpense.id, {
          expense_date: expenseDate,
          description,
          category,
          amount: numAmount,
          status,
          payment_method: paymentMethod,
        })
        toast({ title: 'Despesa atualizada!' })
      } else {
        const created = await createExpense({
          company_id: company.id,
          expense_date: expenseDate,
          description,
          category,
          amount: numAmount,
          status,
          payment_method: paymentMethod,
        })

        // Se Paga, gera saída no ledger (caso hook server-side não processe)
        if (status === 'Paga') {
          try {
            await createMovement({
              company_id: company.id,
              movement_date: expenseDate,
              type: 'saída',
              description: `Despesa: ${description}`,
              category,
              amount: numAmount,
              reference: `expenses/${created.id}`,
            })
          } catch {
            /* intentionally ignored */
          }
        }
        toast({ title: 'Despesa registrada com sucesso!' })
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
      await deleteExpense(deleteTargetId)
      toast({ title: 'Despesa excluída' })
      setDeleteTargetId(null)
      await loadData()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: err?.message })
    }
  }

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchSearch =
        e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.category.toLowerCase().includes(searchTerm.toLowerCase())
      const matchStatus = statusFilter === 'Todos' || e.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [expenses, searchTerm, statusFilter])

  // Stats
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()

  const totalMes = useMemo(() => {
    return expenses
      .filter((e) => {
        const d = new Date(e.expense_date)
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear
      })
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
  }, [expenses, currentMonth, currentYear])

  const totalPagas = useMemo(() => {
    return expenses
      .filter((e) => e.status === 'Paga')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
  }, [expenses])

  const totalPendentes = useMemo(() => {
    return expenses
      .filter((e) => e.status === 'Pendente')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
  }, [expenses])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Despesas</h2>
          <p className="text-sm text-slate-500">
            Gerenciamento e controle de custos fixos, variáveis e operacionais.
          </p>
        </div>

        <Button
          onClick={openCreateModal}
          className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold h-9 px-4 shadow-sm flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Nova Despesa
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
            Total Pago (Efetivado)
          </span>
          <p className="text-xl font-bold font-mono text-red-700 mt-1">
            {formatCurrency(totalPagas)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">
            Pendente de Pagamento
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
            placeholder="Buscar por descrição ou categoria..."
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
            <SelectItem value="Paga">Paga</SelectItem>
            <SelectItem value="Pendente">Pendente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filteredExpenses.length === 0 ? (
        <EmptyState
          icon={<ArrowUpRight className="w-8 h-8 text-red-500" />}
          title="Nenhuma despesa registrada"
          description="Controle os custos do seu negócio adicionando uma nova despesa."
          actionLabel="+ Nova Despesa"
          onAction={openCreateModal}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
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
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                      {formatDatePtBr(exp.expense_date)}
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-semibold max-w-[220px] truncate">
                      {exp.description}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{exp.payment_method || '-'}</td>
                    <td className="py-3 px-4 font-mono font-bold text-red-700 text-right whitespace-nowrap">
                      -{formatCurrency(exp.amount)}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          exp.status === 'Paga'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {exp.status === 'Paga' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        {exp.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(exp)}
                          className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTargetId(exp.id)}
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
      )}

      {/* Modal Criar / Editar */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              {editingExpense ? 'Editar Despesa' : 'Nova Despesa'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="expDate" className="text-xs font-semibold text-slate-700">
                  Data <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="expDate"
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="expAmount" className="text-xs font-semibold text-slate-700">
                  Valor (R$) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="expAmount"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-9 text-xs font-mono"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expDesc" className="text-xs font-semibold text-slate-700">
                Descrição <span className="text-red-500">*</span>
              </Label>
              <Input
                id="expDesc"
                placeholder="Ex: Pagamento Fornecedor ABC / Aluguel do Galpão"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="expCat" className="text-xs font-semibold text-slate-700">
                  Categoria
                </Label>
                <Select value={category} onValueChange={(val) => setCategory(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="expStatus" className="text-xs font-semibold text-slate-700">
                  Status
                </Label>
                <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Paga">Paga</SelectItem>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expPayMethod" className="text-xs font-semibold text-slate-700">
                Forma de Pagamento
              </Label>
              <Select value={paymentMethod} onValueChange={(val: any) => setPaymentMethod(val)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pix">Pix</SelectItem>
                  <SelectItem value="Boleto">Boleto</SelectItem>
                  <SelectItem value="Cartão">Cartão</SelectItem>
                  <SelectItem value="Transferência">Transferência</SelectItem>
                  <SelectItem value="À vista">À vista (Dinheiro)</SelectItem>
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
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Salvando...
                  </>
                ) : (
                  'Salvar Despesa'
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
              Excluir Despesa?
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-500">
            Deseja excluir esta despesa? O registro será removido permanentemente.
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

export default Despesas
