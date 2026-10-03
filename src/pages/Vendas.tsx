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
import {
  getSales,
  createSale,
  updateSale,
  deleteSale,
  getCustomers,
  getProducts,
  createMovement,
} from '@/services/erp'
import {
  calculateStockDeltas,
  applyStockDeltas,
  validateStockAvailability,
} from '@/services/stockSync'
import type { Sale, Customer, Product, SaleItem } from '@/types/erp'
import { formatCurrency, formatDatePtBr } from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Edit2, Package, AlertCircle, X } from 'lucide-react'
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
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('Todos')
  const [periodFilter, setPeriodFilter] = useState('Todos')

  // Modal Nova / Edição de Venda
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSale, setEditingSale] = useState<Sale | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0])
  const [customerId, setCustomerId] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [status, setStatus] = useState<'Concluída' | 'Pendente' | 'Cancelada'>('Concluída')
  const [paymentMethod, setPaymentMethod] = useState<
    'À vista' | 'Pix' | 'Cartão' | 'Boleto' | 'Transferência'
  >('Pix')

  // Itens da venda vinculados ao estoque
  const [saleItems, setSaleItems] = useState<SaleItem[]>([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedProductQty, setSelectedProductQty] = useState('1')
  const [stockWarning, setStockWarning] = useState<string | null>(null)

  // Modal confirmação exclusão
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!company) return
    try {
      const [salesData, custData, prodData] = await Promise.all([
        getSales(company.id),
        getCustomers(company.id),
        getProducts(company.id),
      ])
      setSales(salesData)
      setCustomers(custData)
      setProducts(prodData)
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
  useRealtime('products', () => loadData(), !!company)

  // Abrir modal de criação
  const handleOpenCreateModal = () => {
    setEditingSale(null)
    setSaleDate(new Date().toISOString().split('T')[0])
    setCustomerId('')
    setDescription('')
    setAmount('')
    setStatus('Concluída')
    setPaymentMethod('Pix')
    setSaleItems([])
    setSelectedProductId('')
    setSelectedProductQty('1')
    setStockWarning(null)
    setIsModalOpen(true)
  }

  // Abrir modal de edição
  const handleOpenEditModal = (sale: Sale) => {
    setEditingSale(sale)
    setSaleDate(sale.sale_date.split('T')[0])
    setCustomerId(sale.customer_id || '')
    setDescription(sale.description)
    setAmount(sale.amount.toString())
    setStatus(sale.status)
    setPaymentMethod(sale.payment_method || 'Pix')
    setSaleItems(Array.isArray(sale.items) ? sale.items : [])
    setSelectedProductId('')
    setSelectedProductQty('1')
    setStockWarning(null)
    setIsModalOpen(true)
  }

  // Adicionar produto selecionado aos itens da venda
  const handleAddProductItem = () => {
    if (!selectedProductId) return
    const prod = products.find((p) => p.id === selectedProductId)
    if (!prod) return

    const qty = parseInt(selectedProductQty, 10)
    if (isNaN(qty) || qty <= 0) {
      setStockWarning('Informe uma quantidade válida maior que zero.')
      return
    }

    // Calcula quantidade total deste produto se já existir nos itens
    const existingIndex = saleItems.findIndex((it) => it.product_id === prod.id)
    const currentItemQty = existingIndex >= 0 ? saleItems[existingIndex].quantity : 0
    const totalDemanded = currentItemQty + qty

    // Se a venda for concluída, verifica se excede o estoque físico disponível
    // Se for edição de venda já concluída, a quantidade antiga do snapshot conta
    const previousQtyInThisSale =
      editingSale && editingSale.status === 'Concluída' && Array.isArray(editingSale.items)
        ? editingSale.items.find((it) => it.product_id === prod.id)?.quantity || 0
        : 0

    const availableStock = prod.quantity + previousQtyInThisSale

    if (status === 'Concluída' && totalDemanded > availableStock) {
      setStockWarning(
        `Estoque insuficiente: restam ${prod.quantity} unidades de "${prod.name}" (total exigido: ${totalDemanded}).`,
      )
      return
    }

    setStockWarning(null)

    let updatedList: SaleItem[]
    if (existingIndex >= 0) {
      updatedList = [...saleItems]
      const updatedQty = updatedList[existingIndex].quantity + qty
      updatedList[existingIndex] = {
        ...updatedList[existingIndex],
        quantity: updatedQty,
        total: updatedQty * updatedList[existingIndex].unit_price,
      }
    } else {
      const newItem: SaleItem = {
        product_id: prod.id,
        name: prod.name,
        sku: prod.sku,
        quantity: qty,
        unit_price: prod.selling_price,
        total: qty * prod.selling_price,
      }
      updatedList = [...saleItems, newItem]
    }

    setSaleItems(updatedList)

    // Recalcula o valor total da venda a partir dos itens
    const totalItemsValue = updatedList.reduce((sum, it) => sum + it.total, 0)
    setAmount(totalItemsValue.toFixed(2))

    // Se a descrição estiver vazia, preenche automaticamente
    if (!description || description === 'Venda de Produtos/Serviços') {
      const summaryDesc = updatedList.map((it) => `${it.quantity}x ${it.name}`).join(', ')
      setDescription(summaryDesc)
    }

    setSelectedProductId('')
    setSelectedProductQty('1')
  }

  const handleRemoveProductItem = (productId: string) => {
    const updated = saleItems.filter((it) => it.product_id !== productId)
    setSaleItems(updated)

    if (updated.length > 0) {
      const totalItemsValue = updated.reduce((sum, it) => sum + it.total, 0)
      setAmount(totalItemsValue.toFixed(2))
    }
  }

  // Submissão (Criar ou Atualizar)
  const handleSubmitSale = async (e: React.FormEvent) => {
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

    // Se status for Concluída e houver itens vinculados, valida disponibilidade de estoque
    if (status === 'Concluída' && saleItems.length > 0) {
      const validation = await validateStockAvailability(
        saleItems,
        editingSale?.items || [],
        !!editingSale,
        editingSale?.status,
      )

      if (!validation.valid) {
        setStockWarning(validation.errorMessage || 'Estoque insuficiente.')
        toast({
          variant: 'destructive',
          title: 'Estoque insuficiente',
          description: validation.errorMessage,
        })
        return
      }
    }

    try {
      setSubmitting(true)

      if (editingSale) {
        // EDICAO: Calcula deltas de estoque
        const previousStatus = editingSale.status
        const previousItems = Array.isArray(editingSale.items) ? editingSale.items : []
        const deltas = calculateStockDeltas(previousStatus, previousItems, status, saleItems)

        // Aplica deltas no estoque
        const stockResult = await applyStockDeltas(deltas)
        if (!stockResult.success) {
          toast({
            variant: 'destructive',
            title: 'Erro no estoque',
            description: stockResult.errors.join('; '),
          })
          setSubmitting(false)
          return
        }

        await updateSale(editingSale.id, {
          customer_id: customerId === 'avulso' || !customerId ? undefined : customerId,
          sale_date: saleDate,
          description: description || 'Venda de Produtos/Serviços',
          amount: numAmount,
          status,
          payment_method: paymentMethod,
          items: saleItems,
        })

        toast({
          title: 'Venda atualizada!',
          description:
            status === 'Concluída'
              ? 'Alterações salvas e estoque ajustado com sucesso.'
              : 'Venda atualizada.',
        })
      } else {
        // CRIACAO:
        // Se criada como Concluída, calcula baixa de estoque
        const deltas = calculateStockDeltas(null, [], status, saleItems)
        const stockResult = await applyStockDeltas(deltas)
        if (!stockResult.success) {
          toast({
            variant: 'destructive',
            title: 'Erro no estoque',
            description: stockResult.errors.join('; '),
          })
          setSubmitting(false)
          return
        }

        const newSale = await createSale({
          company_id: company.id,
          customer_id: customerId === 'avulso' || !customerId ? undefined : customerId,
          sale_date: saleDate,
          description: description || 'Venda de Produtos/Serviços',
          amount: numAmount,
          status,
          payment_method: paymentMethod,
          items: saleItems,
        })

        // Registra entrada no ledger de movimentações se concluída
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
          description:
            status === 'Concluída' && saleItems.length > 0
              ? 'Venda salva e baixa automática aplicada no estoque.'
              : 'Registro incluído com sucesso.',
        })
      }

      setIsModalOpen(false)
      await loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar venda',
        description: err?.message || 'Falha na gravação dos dados.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Excluir venda (estorna estoque se estava concluída)
  const handleDelete = async () => {
    if (!deleteTargetId) return
    try {
      const targetSale = sales.find((s) => s.id === deleteTargetId)
      if (
        targetSale &&
        targetSale.status === 'Concluída' &&
        Array.isArray(targetSale.items) &&
        targetSale.items.length > 0
      ) {
        // Devolve os itens ao estoque
        const deltas = calculateStockDeltas('Concluída', targetSale.items, 'Cancelada', [])
        await applyStockDeltas(deltas)
      }

      await deleteSale(deleteTargetId)
      toast({
        title: 'Venda excluída',
        description: 'Venda removida e estoque estornado se aplicável.',
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
            onClick={handleOpenCreateModal}
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
          onAction={handleOpenCreateModal}
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

                {Array.isArray(sale.items) && sale.items.length > 0 && (
                  <div className="text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-100 space-y-1">
                    <span className="font-semibold text-slate-600 flex items-center gap-1">
                      <Package className="w-3 h-3 text-emerald-600" /> Itens baixados no estoque:
                    </span>
                    <ul className="list-disc list-inside text-slate-500 text-[10px] space-y-0.5">
                      {sale.items.map((it, idx) => (
                        <li key={idx}>
                          {it.quantity}x {it.name} ({formatCurrency(it.unit_price)})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                      {sale.payment_method || 'Pagamento não inf.'}
                    </span>
                    <p className="text-sm font-bold font-mono text-slate-900">
                      {formatCurrency(sale.amount)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(sale)}
                      className="p-2 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100 transition"
                      title="Editar venda e itens"
                      aria-label="Editar venda"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
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
                      <td className="py-3 px-4 text-slate-600 max-w-[220px]">
                        <p className="truncate font-medium">{sale.description}</p>
                        {Array.isArray(sale.items) && sale.items.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-mono">
                            <Package className="w-2.5 h-2.5" /> {sale.items.length} item(ns)
                          </span>
                        )}
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
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditModal(sale)}
                            className="p-1.5 rounded text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition"
                            title="Editar venda"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTargetId(sale.id)}
                            className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                            title="Excluir venda"
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

      {/* Modal Nova / Editar Venda com baixa de estoque */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[560px] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-600" />
              {editingSale ? 'Editar Venda' : 'Registrar Nova Venda'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitSale} className="space-y-4 py-2">
            {/* Aviso de estoque insuficiente */}
            {stockWarning && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <span>{stockWarning}</span>
              </div>
            )}
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

            {/* Seletor de Produtos do Estoque com Baixa Automática */}
            <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-emerald-600" />
                  Vincular Produtos do Estoque (Baixa Automática)
                </Label>
                <span className="text-[10px] text-slate-400">Opcional por item</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 min-w-0">
                  <Select
                    value={selectedProductId}
                    onValueChange={(val) => {
                      setSelectedProductId(val)
                      setStockWarning(null)
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs bg-white">
                      <SelectValue placeholder="Selecione um produto para adicionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} — {formatCurrency(p.selling_price)} (Estoque: {p.quantity} un)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    placeholder="Qtd"
                    value={selectedProductQty}
                    onChange={(e) => setSelectedProductQty(e.target.value)}
                    className="w-16 h-9 text-xs bg-white text-center font-mono"
                  />
                  <Button
                    type="button"
                    onClick={handleAddProductItem}
                    disabled={!selectedProductId}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-3 shrink-0"
                  >
                    + Adicionar
                  </Button>
                </div>
              </div>

              {/* Lista de itens vinculados */}
              {saleItems.length > 0 && (
                <div className="mt-2 space-y-1.5 border-t border-slate-200/80 pt-2">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">
                    Itens incluídos nesta venda:
                  </span>
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {saleItems.map((item) => (
                      <div
                        key={item.product_id}
                        className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 truncate">{item.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {item.quantity} un x {formatCurrency(item.unit_price)} ={' '}
                            <strong className="text-slate-700">{formatCurrency(item.total)}</strong>
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveProductItem(item.product_id)}
                          className="p-1 text-slate-400 hover:text-red-600 transition"
                          title="Remover item"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-semibold text-slate-700">
                Descrição dos Itens / Serviços <span className="text-red-500">*</span>
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
                ) : editingSale ? (
                  'Atualizar Venda'
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
