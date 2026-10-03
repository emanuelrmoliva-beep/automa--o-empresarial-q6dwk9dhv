import React, { useState, useEffect, useMemo } from 'react'
import {
  Scale,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Trash2,
  Edit2,
  Loader2,
  TrendingDown,
  Building,
  Calendar,
  DollarSign,
  Package,
  ArrowRight,
  Info,
  Check,
  Tag,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import {
  getSupplierQuotes,
  createSupplierQuote,
  updateSupplierQuote,
  deleteSupplierQuote,
  getProducts,
  updateProduct,
} from '@/services/erp'
import type { SupplierQuote, SupplierOffer, Product } from '@/types/erp'
import { formatCurrency, formatDatePtBr } from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/EmptyState'

export function Cotacoes() {
  const { company } = useAuth()
  const { toast } = useToast()

  const [quotes, setQuotes] = useState<SupplierQuote[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingQuote, setEditingQuote] = useState<SupplierQuote | null>(null)
  const [saving, setSaving] = useState(false)

  // Formulário
  const [selectedProductId, setSelectedProductId] = useState('')
  const [itemName, setItemName] = useState('')
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().split('T')[0])
  const [quantityNeeded, setQuantityNeeded] = useState<number>(1)
  const [status, setStatus] = useState<SupplierQuote['status']>('Em Aberto')
  const [notes, setNotes] = useState('')
  const [suppliers, setSuppliers] = useState<SupplierOffer[]>([
    { supplier_name: '', contact: '', unit_price: 0, delivery_time: '3 dias', notes: '' },
    { supplier_name: '', contact: '', unit_price: 0, delivery_time: '5 dias', notes: '' },
  ])

  const loadData = async () => {
    if (!company) return
    try {
      setLoading(true)
      const [quotesData, productsData] = await Promise.all([
        getSupplierQuotes(company.id),
        getProducts(company.id),
      ])
      setQuotes(quotesData)
      setProducts(productsData)
    } catch (err: any) {
      console.error('Erro ao carregar cotações:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar cotações',
        description: err?.message || 'Tente novamente.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [company?.id])

  const openNewQuoteModal = () => {
    setEditingQuote(null)
    setSelectedProductId('')
    setItemName('')
    setQuoteDate(new Date().toISOString().split('T')[0])
    setQuantityNeeded(1)
    setStatus('Em Aberto')
    setNotes('')
    setSuppliers([
      { supplier_name: '', contact: '', unit_price: 0, delivery_time: '3 dias', notes: '' },
      { supplier_name: '', contact: '', unit_price: 0, delivery_time: '5 dias', notes: '' },
    ])
    setIsModalOpen(true)
  }

  const openEditQuoteModal = (quote: SupplierQuote) => {
    setEditingQuote(quote)
    setSelectedProductId(quote.product_id || '')
    setItemName(quote.item_name)
    setQuoteDate(quote.quote_date)
    setQuantityNeeded(quote.quantity_needed || 1)
    setStatus(quote.status)
    setNotes(quote.notes || '')
    setSuppliers(
      Array.isArray(quote.suppliers) && quote.suppliers.length > 0
        ? quote.suppliers
        : [{ supplier_name: '', contact: '', unit_price: 0, delivery_time: '' }],
    )
    setIsModalOpen(true)
  }

  const handleProductSelect = (prodId: string) => {
    setSelectedProductId(prodId)
    const prod = products.find((p) => p.id === prodId)
    if (prod) {
      setItemName(prod.name)
    }
  }

  const handleSupplierChange = (index: number, field: keyof SupplierOffer, value: any) => {
    const list = [...suppliers]
    list[index] = { ...list[index], [field]: value }
    setSuppliers(list)
  }

  const addSupplierRow = () => {
    setSuppliers([
      ...suppliers,
      { supplier_name: '', contact: '', unit_price: 0, delivery_time: '', notes: '' },
    ])
  }

  const removeSupplierRow = (index: number) => {
    if (suppliers.length <= 1) return
    setSuppliers(suppliers.filter((_, i) => i !== index))
  }

  // Identificar menor preço fornecido
  const findBestSupplierIndex = (supplierList: SupplierOffer[]) => {
    let minPrice = Infinity
    let bestIdx = -1
    supplierList.forEach((s, idx) => {
      const price = Number(s.unit_price) || 0
      if (price > 0 && price < minPrice) {
        minPrice = price
        bestIdx = idx
      }
    })
    return bestIdx
  }

  const handleSaveQuote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!company) return
    if (!itemName.trim()) {
      toast({ variant: 'destructive', title: 'Informe o item da cotação' })
      return
    }

    const validSuppliers = suppliers.filter((s) => s.supplier_name.trim().length > 0)
    if (validSuppliers.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Informe ao menos um fornecedor',
        description: 'Digite o nome e preço de pelo menos um fornecedor cotado.',
      })
      return
    }

    const bestIdx = findBestSupplierIndex(validSuppliers)

    try {
      setSaving(true)
      const payload: Partial<SupplierQuote> = {
        company_id: company.id,
        product_id: selectedProductId || undefined,
        item_name: itemName.trim(),
        quote_date: quoteDate,
        quantity_needed: Number(quantityNeeded) || 1,
        status,
        chosen_supplier_index: bestIdx >= 0 ? bestIdx : undefined,
        suppliers: validSuppliers,
        notes,
      }

      if (editingQuote) {
        await updateSupplierQuote(editingQuote.id, payload)
        toast({ title: 'Cotação atualizada!', description: 'Comparativo salvo com sucesso.' })
      } else {
        await createSupplierQuote(payload)
        toast({ title: 'Cotação registrada!', description: 'Novo comparativo adicionado.' })
      }

      setIsModalOpen(false)
      loadData()
    } catch (err: any) {
      console.error('Erro ao salvar cotação:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar cotação',
        description: err?.message || 'Verifique os dados informados.',
      })
    } finally {
      setSaving(false)
    }
  }

  // Aplicar preço do melhor fornecedor ao custo do produto no estoque
  const handleApplyToProductCost = async (quote: SupplierQuote, supplier: SupplierOffer) => {
    if (!quote.product_id) {
      toast({
        variant: 'destructive',
        title: 'Cotação sem produto vinculado',
        description: 'Vincule um produto do catálogo a esta cotação para atualizar o custo.',
      })
      return
    }

    const unitPrice = Number(supplier.unit_price) || 0
    if (unitPrice <= 0) {
      toast({ variant: 'destructive', title: 'Preço inválido' })
      return
    }

    if (
      !confirm(
        `Deseja atualizar o preço de custo do produto no estoque para ${formatCurrency(
          unitPrice,
        )} com base no fornecedor "${supplier.supplier_name}"?`,
      )
    ) {
      return
    }

    try {
      await updateProduct(quote.product_id, {
        cost_price: unitPrice,
      })
      await updateSupplierQuote(quote.id, {
        status: 'Concluída',
      })
      toast({
        title: 'Preço de custo atualizado!',
        description: `O produto agora tem o custo de ${formatCurrency(unitPrice)} no estoque.`,
      })
      loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar custo',
        description: err?.message || 'Não foi possível atualizar o produto.',
      })
    }
  }

  const handleDeleteQuote = async (quote: SupplierQuote) => {
    if (!confirm(`Deseja excluir a cotação de "${quote.item_name}"?`)) return
    try {
      await deleteSupplierQuote(quote.id)
      toast({ title: 'Cotação excluída com sucesso.' })
      loadData()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: err?.message })
    }
  }

  const filteredQuotes = quotes.filter((q) => {
    const matchesSearch =
      q.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.suppliers &&
        q.suppliers.some((s) => s.supplier_name.toLowerCase().includes(searchTerm.toLowerCase())))
    const matchesStatus = statusFilter === 'ALL' || q.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Scale className="w-6 h-6 text-emerald-600" />
            Cotações & Comparativo de Fornecedores
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Compare preços, prazos e condições entre fornecedores para comprar sempre pelo menor
            custo.
          </p>
        </div>

        <Button
          onClick={openNewQuoteModal}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-xs"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Nova Cotação
        </Button>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Buscar por item, insumo ou fornecedor cotado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-xs sm:text-sm bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs sm:text-sm border border-slate-200 rounded-md px-3 py-2 bg-white text-slate-700 focus:outline-emerald-600 font-medium"
          >
            <option value="ALL">Todos os status</option>
            <option value="Em Aberto">Em Aberto</option>
            <option value="Concluída">Concluída</option>
            <option value="Cancelada">Cancelada</option>
          </select>
        </div>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
          <p className="text-sm">Carregando comparativo de fornecedores...</p>
        </div>
      ) : filteredQuotes.length === 0 ? (
        <EmptyState
          icon={<Scale className="w-8 h-8" />}
          title="Nenhuma cotação cadastrada"
          description={
            searchTerm || statusFilter !== 'ALL'
              ? 'Tente ajustar os filtros de busca para encontrar cotações.'
              : 'Registre cotações de fornecedores para economizar nas compras e insumos da sua empresa.'
          }
          actionLabel={searchTerm ? undefined : 'Registrar Primeira Cotação'}
          onAction={searchTerm ? undefined : openNewQuoteModal}
        />
      ) : (
        <div className="space-y-4">
          {filteredQuotes.map((q) => {
            const suppliersList = Array.isArray(q.suppliers) ? q.suppliers : []
            const bestIdx = findBestSupplierIndex(suppliersList)
            const bestOffer = bestIdx >= 0 ? suppliersList[bestIdx] : null
            const linkedProduct = q.expand?.product_id

            return (
              <div
                key={q.id}
                className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden"
              >
                {/* Cabeçalho da Cotação */}
                <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-bold text-slate-900">{q.item_name}</span>
                      {linkedProduct && (
                        <span className="text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <Package className="w-3 h-3" /> Estoque: {linkedProduct.sku} (Custo Atual:{' '}
                          {formatCurrency(linkedProduct.cost_price)})
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          q.status === 'Concluída'
                            ? 'bg-emerald-100 text-emerald-800'
                            : q.status === 'Cancelada'
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {q.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" /> Cotação em{' '}
                        {formatDatePtBr(q.quote_date)}
                      </span>
                      {q.quantity_needed && (
                        <span>
                          Quantidade pretendida: <strong>{q.quantity_needed} un</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditQuoteModal(q)}
                      className="text-xs text-slate-600 hover:text-slate-900 h-8"
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1" /> Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteQuote(q)}
                      className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Tabela Comparativa de Fornecedores */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                      <tr>
                        <th className="py-2.5 px-4">Fornecedor</th>
                        <th className="py-2.5 px-4">Contato / Canal</th>
                        <th className="py-2.5 px-4 text-right">Preço Unitário</th>
                        <th className="py-2.5 px-4 text-right">
                          Total Est. ({q.quantity_needed || 1} un)
                        </th>
                        <th className="py-2.5 px-4">Prazo de Entrega</th>
                        <th className="py-2.5 px-4">Condição / Obs</th>
                        <th className="py-2.5 px-4 text-center">Status / Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {suppliersList.map((sup, idx) => {
                        const isBest = idx === bestIdx
                        const totalEst = (Number(sup.unit_price) || 0) * (q.quantity_needed || 1)

                        return (
                          <tr
                            key={idx}
                            className={`transition ${
                              isBest ? 'bg-emerald-50/40 font-medium' : 'hover:bg-slate-50/50'
                            }`}
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5">
                                <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="font-semibold text-slate-900">
                                  {sup.supplier_name}
                                </span>
                                {isBest && (
                                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.2 rounded-full inline-flex items-center gap-0.5">
                                    <TrendingDown className="w-3 h-3" /> Menor Preço
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-3 px-4 text-slate-600">{sup.contact || '—'}</td>

                            <td className="py-3 px-4 text-right">
                              <span
                                className={`font-mono text-sm ${
                                  isBest ? 'font-bold text-emerald-700' : 'text-slate-800'
                                }`}
                              >
                                {formatCurrency(sup.unit_price)}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-right font-mono text-slate-600">
                              {formatCurrency(totalEst)}
                            </td>

                            <td className="py-3 px-4 text-slate-600">{sup.delivery_time || '—'}</td>

                            <td
                              className="py-3 px-4 text-slate-500 max-w-xs truncate"
                              title={sup.notes}
                            >
                              {sup.notes || '—'}
                            </td>

                            <td className="py-3 px-4 text-center">
                              {q.product_id ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleApplyToProductCost(q, sup)}
                                  className={`text-[11px] h-7 px-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 ${
                                    isBest
                                      ? 'bg-emerald-600 text-white hover:bg-emerald-700 border-none'
                                      : ''
                                  }`}
                                  title="Atualizar preço de custo do produto no estoque"
                                >
                                  <Check className="w-3 h-3 mr-1" /> Usar este Custo
                                </Button>
                              ) : (
                                <span className="text-[10px] text-slate-400">
                                  Sem produto vinculado
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {q.notes && (
                  <div className="bg-slate-50/70 p-3 text-xs text-slate-600 border-t border-slate-100 flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <p>Observações gerais: {q.notes}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Criar / Editar Cotação */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-slate-900 text-lg flex items-center gap-2">
              <Scale className="w-5 h-5 text-emerald-600" />
              {editingQuote ? 'Editar Cotação de Fornecedores' : 'Nova Cotação de Fornecedores'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Cadastre as propostas recebidas de cada fornecedor. O sistema destacará o menor custo
              e permitirá atualizar o estoque automaticamente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveQuote} className="space-y-4 pt-1 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-medium text-slate-700 block mb-1">
                  Vincular a Produto do Estoque (Opcional)
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-md px-3 py-2 bg-white text-slate-800"
                >
                  <option value="">-- Insumo / Item Avulso --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) - Custo Atual: {formatCurrency(p.cost_price)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">
                  Nome do Item / Insumo <span className="text-red-500">*</span>
                </label>
                <Input
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="Ex: Embalagem Kraft 20x30cm"
                  className="text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-medium text-slate-700 block mb-1">Data da Cotação</label>
                <Input
                  type="date"
                  value={quoteDate}
                  onChange={(e) => setQuoteDate(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">
                  Quantidade Pretendida
                </label>
                <Input
                  type="number"
                  min="1"
                  value={quantityNeeded}
                  onChange={(e) => setQuantityNeeded(Number(e.target.value))}
                  className="text-xs font-mono"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as SupplierQuote['status'])}
                  className="w-full text-xs border border-slate-200 rounded-md px-3 py-2 bg-white text-slate-800 font-medium"
                >
                  <option value="Em Aberto">Em Aberto</option>
                  <option value="Concluída">Concluída</option>
                  <option value="Cancelada">Cancelada</option>
                </select>
              </div>
            </div>

            {/* Linhas de Fornecedores */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">Fornecedores Cotados</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSupplierRow}
                  className="text-xs h-7 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Fornecedor
                </Button>
              </div>

              <div className="space-y-2">
                {suppliers.map((sup, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg space-y-2"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      <div className="sm:col-span-4">
                        <label className="text-[10px] text-slate-500 font-medium block">
                          Nome do Fornecedor *
                        </label>
                        <Input
                          placeholder="Ex: Distribuidora Silva"
                          value={sup.supplier_name}
                          onChange={(e) =>
                            handleSupplierChange(idx, 'supplier_name', e.target.value)
                          }
                          className="text-xs h-8 bg-white"
                          required
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="text-[10px] text-slate-500 font-medium block">
                          Contato (Tel/E-mail)
                        </label>
                        <Input
                          placeholder="Ex: (11) 98888-7777"
                          value={sup.contact}
                          onChange={(e) => handleSupplierChange(idx, 'contact', e.target.value)}
                          className="text-xs h-8 bg-white"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[10px] text-slate-500 font-medium block">
                          Preço Unit. (R$) *
                        </label>
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          placeholder="0,00"
                          value={sup.unit_price}
                          onChange={(e) =>
                            handleSupplierChange(idx, 'unit_price', Number(e.target.value))
                          }
                          className="text-xs h-8 bg-white font-mono"
                          required
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[10px] text-slate-500 font-medium block">
                          Prazo Entrega
                        </label>
                        <Input
                          placeholder="Ex: 5 dias úteis"
                          value={sup.delivery_time}
                          onChange={(e) =>
                            handleSupplierChange(idx, 'delivery_time', e.target.value)
                          }
                          className="text-xs h-8 bg-white"
                        />
                      </div>

                      <div className="sm:col-span-1 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSupplierRow(idx)}
                          disabled={suppliers.length <= 1}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 mt-3"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="font-medium text-slate-700 block mb-1">Observações Gerais</label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Pagamento faturado em 28 dias ou frete FOB"
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="text-xs h-9"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-4"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Salvando...
                  </>
                ) : (
                  'Salvar Cotação'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default Cotacoes
