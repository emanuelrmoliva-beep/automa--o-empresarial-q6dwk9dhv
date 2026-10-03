import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Plus,
  Search,
  Download,
  Trash2,
  ShoppingCart,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import { getSales, createSale, deleteSale, getCustomers, createMovement } from '@/services/erp'
import type { Sale, Customer } from '@/types/erp'
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

export const Vendas: React.FC = () => {
  const { company } = useAuth()
  const { toast } = useToast()

  const [sales, setSales] = useState<Sale[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('Todos')
  const [periodFilter, setPeriodFilter] = useState('Todos')

  // Modal Nova Venda
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0])
  const [customerId, setCustomerId] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [status, setStatus] = useState<'Concluída' | 'Pendente' | 'Cancelada'>('Concluída')
  const [paymentMethod, setPaymentMethod] = useState<
    'À vista' | 'Pix' | 'Cartão' | 'Boleto' | 'Transferência'
  >('Pix')

  // Modal confirmação exclusão
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!company) return
    try {
      const [salesData, custData] = await Promise.all([
        getSales(company.id),
        getCustomers(company.id),
      ])
      setSales(salesData)
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

  useRealtime('sales', () => loadData(), !!company)

  // Submissão de nova venda
  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!company) return
    const numAmount = parseFloat(amount.replace(',', '.'))
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({
        variant: 'destructive',
        title: 'Valor inválido',
        description: 'Informe um valor válido maior que zero.',
      })
      return
    }

    try {
      setSubmitting(true)
      const newSale = await createSale({
        company_id: company.id,
        customer_id: customerId || undefined,
        sale_date: saleDate,
        description: description || 'Venda de Produtos/Serviços',
        amount: numAmount,
        status,
        payment_method: paymentMethod,
      })

      // Se a venda for concluída à vista/pix/cartão/transferência, registra no ledger de entradas
      if (status === 'Concluída') {
        await createMovement({
          company_id: company.id,
          movement_date: saleDate,
          type: 'entrada',
          description: `Venda: ${description || 'Venda Realizada'}`,
          category: 'Venda',
          amount: numAmount,
          reference: `sales/${newSale.id}`,
        })
      }

      toast({
        title: 'Venda cadastrada!',
        description: 'Registro incluído com sucesso.',
      })

      // Limpar formulário
      setDescription('')
      setAmount('')
      setCustomerId('')
      setStatus('Concluída')
      setIsModalOpen(false)
      await loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar venda',
        description: err?.message || 'Falha na gravação dos dados.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTargetId) return
    try {
      await deleteSale(deleteTargetId)
      toast({
        title: 'Venda excluída',
        description: 'O registro foi removido com sucesso.',
      })
      setDeleteTargetId(null)
      await loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: err?.message,
      })
    }
  }

  // Filtragem
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const matchSearch =
        s.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.expand?.customer_id?.name || '').toLowerCase().includes(searchTerm.toLowerCase())

      const matchStatus = statusFilter === 'Todos' || s.status === statusFilter

      let matchPeriod = true
      if (periodFilter !== 'Todos') {
        const today = new Date()
        const saleD = new Date(s.sale_date)
        if (periodFilter === 'Hoje') {
          matchPeriod = saleD.toISOString().split('T')[0] === today.toISOString().split('T')[0]
        } else if (periodFilter === '30dias') {
          const diffDays = (today.getTime() - saleD.getTime()) / (1000 * 3600 * 24)
          matchPeriod = diffDays <= 30 && diffDays >= 0
        } else if (periodFilter === 'Mes') {
          matchPeriod =
            saleD.getMonth() === today.getMonth() && saleD.getFullYear() === today.getFullYear()
        }
      }

      return matchSearch && matchStatus && matchPeriod
    })
  }, [sales, searchTerm, statusFilter, periodFilter])

  // Estatísticas rápidas
  const totalMes = useMemo(() => {
    const today = new Date()
    return sales
      .filter((s) => {
        const d = new Date(s.sale_date)
        return (
          d.getMonth() === today.getMonth() &&
          d.getFullYear() === today.getFullYear() &&
          s.status === 'Concluída'
        )
      })
      .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)
  }, [sales])

  const qtdeVendas = filteredSales.length
  const ticketMedio = qtdeVendas > 0 ? totalMes / (qtdeVendas || 1) : 0

  // Exportar CSV
  const handleExportCsv = () => {
    if (sales.length === 0) return
    const header = 'Data,Cliente,Descricao,Valor,Status,FormaPagamento\n'
    const rows = sales
      .map(
        (s) =>
          `"${formatDatePtBr(s.sale_date)}","${s.expand?.customer_id?.name || 'Cliente Avulso'}","${s.description}","${s.amount}","${s.status}","${s.payment_method || ''}"`,
      )
      .join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `vendas_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Vendas</h2>
          <p className="text-sm text-slate-500">
            Registre e acompanhe todas as vendas comerciais da sua empresa.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportCsv}
            className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold h-9"
          >
            <Download className="w-4 h-4 mr-1.5" /> Exportar CSV
          </Button>

          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9 px-4 shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Nova Venda
          </Button>
        </div>
      </div>

      {/* Mini Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">
            Total Concluído (Mês)
          </span>
          <p className="text-xl font-bold font-mono text-emerald-700 mt-1">
            {formatCurrency(totalMes)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">
            Quantidade de Vendas
          </span>
          <p className="text-xl font-bold font-mono text-slate-900 mt-1">{qtdeVendas}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">Ticket Médio</span>
          <p className="text-xl font-bold font-mono text-slate-900 mt-1">
            {formatCurrency(ticketMedio)}
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <Input
            placeholder="Buscar por cliente ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 border-slate-200 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val)}>
            <SelectTrigger className="w-36 h-10 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos os Status</SelectItem>
              <SelectItem value="Concluída">Concluída</SelectItem>
              <SelectItem value="Pendente">Pendente</SelectItem>
              <SelectItem value="Cancelada">Cancelada</SelectItem>
            </SelectContent>
          </Select>

          <Select value={periodFilter} onValueChange={(val) => setPeriodFilter(val)}>
            <SelectTrigger className="w-36 h-10 text-xs">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todo o período</SelectItem>
              <SelectItem value="Hoje">Hoje</SelectItem>
              <SelectItem value="30dias">Últimos 30 dias</SelectItem>
              <SelectItem value="Mes">Este Mês</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table / List */}
      {filteredSales.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart className="w-8 h-8" />}
          title="Nenhuma venda encontrada"
          description="Comece a registrar as vendas da sua empresa clicando no botão abaixo."
          actionLabel="+ Nova Venda"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <>
          {/* Mobile Cards (telas pequenas) */}
          <div className="md:hidden space-y-3">
            {filteredSales.map((sale) => (
              <div
                key={sale.id}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-medium text-slate-400">
                      {formatDatePtBr(sale.sale_date)}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 leading-tight mt-0.5">
                      {sale.expand?.customer_id?.name || 'Cliente Avulso'}
                    </h4>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
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
                </div>

                <p className="text-xs text-slate-600 line-clamp-2">{sale.description}</p>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                      {sale.payment_method || 'Pagamento não inf.'}
                    </span>
                    <p className="text-sm font-bold font-mono text-slate-900">
                      {formatCurrency(sale.amount)}
                    </p>
                  </div>
                  <button
                    onClick={() => setDeleteTargetId(sale.id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 active:bg-red-100 transition"
                    title="Excluir venda"
                    aria-label="Excluir venda"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
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
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Descrição</th>
                    <th className="py-3 px-4">Pagamento</th>
                    <th className="py-3 px-4 text-right">Valor</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                        {formatDatePtBr(sale.sale_date)}
                      </td>
                      <td className="py-3 px-4 text-slate-700 max-w-[160px] truncate">
                        {sale.expand?.customer_id?.name || 'Cliente Avulso'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-[200px] truncate">
                        {sale.description}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{sale.payment_method || '-'}</td>
                      <td className="py-3 px-4 font-bold font-mono text-slate-900 text-right whitespace-nowrap">
                        {formatCurrency(sale.amount)}
                      </td>
                      <td className="py-3 px-4 text-center">
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
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setDeleteTargetId(sale.id)}
                          className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                          title="Excluir venda"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal Nova Venda */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[480px] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Registrar Nova Venda
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateSale} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="saleDate" className="text-xs font-semibold text-slate-700">
                  Data da Venda <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="saleDate"
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="amount" className="text-xs font-semibold text-slate-700">
                  Valor Total (R$) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="amount"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-9 text-xs font-mono"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="customerId" className="text-xs font-semibold text-slate-700">
                Cliente (Opcional)
              </Label>
              <Select value={customerId} onValueChange={(val) => setCustomerId(val)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecione um cliente cadastrado ou deixe avulso" />
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
              <Label htmlFor="description" className="text-xs font-semibold text-slate-700">
                Descrição dos Itens / Serviços
              </Label>
              <Input
                id="description"
                placeholder="Ex: 2x Consultoria Financeira ou Produto X"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="status" className="text-xs font-semibold text-slate-700">
                  Status
                </Label>
                <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Concluída">Concluída</SelectItem>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="payMethod" className="text-xs font-semibold text-slate-700">
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
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsModalOpen(false)}
                className="text-xs text-slate-600"
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
                  'Confirmar Venda'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <Dialog open={!!deleteTargetId} onOpenChange={() => setDeleteTargetId(null)}>
        <DialogContent className="w-[92vw] sm:max-w-[400px] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">Excluir Venda?</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-500">
            Tem certeza de que deseja remover esta venda? Esta ação não pode ser desfeita.
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

export default Vendas
