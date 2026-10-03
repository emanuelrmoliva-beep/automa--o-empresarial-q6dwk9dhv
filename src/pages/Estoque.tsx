import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Plus,
  Search,
  Package,
  AlertTriangle,
  Download,
  Trash2,
  Edit2,
  Minus,
  PlusCircle,
  Check,
  Loader2,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  createMovement,
} from '@/services/erp'
import type { Product } from '@/types/erp'
import { formatCurrency } from '@/lib/formatters'
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

const CATEGORIES = ['Todos', 'Produtos', 'Alimentos', 'Bebidas', 'Vestuário', 'Serviços', 'Outros']

export const Estoque: React.FC = () => {
  const { company } = useAuth()
  const { toast } = useToast()

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Todos')

  // Modal Novo / Editar
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [category, setCategory] = useState<any>('Produtos')
  const [costPrice, setCostPrice] = useState('')
  const [sellingPrice, setSellingPrice] = useState('')
  const [quantity, setQuantity] = useState('0')
  const [minStock, setMinStock] = useState('5')
  const [submitting, setSubmitting] = useState(false)

  // Modal Ajuste Rápido de Estoque
  const [adjustTarget, setAdjustTarget] = useState<Product | null>(null)
  const [adjustAmount, setAdjustAmount] = useState('1')
  const [adjustType, setAdjustType] = useState<'adicionar' | 'remover'>('adicionar')
  const [adjustReason, setAdjustReason] = useState('Ajuste de inventário')

  // Modal Exclusão
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!company) return
    try {
      const data = await getProducts(company.id)
      setProducts(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [company])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('products', () => loadData(), !!company)

  const openCreateModal = () => {
    setEditingProduct(null)
    setName('')
    setSku(`SKU-${Date.now().toString().slice(-6)}`)
    setCategory('Produtos')
    setCostPrice('')
    setSellingPrice('')
    setQuantity('0')
    setMinStock('5')
    setIsModalOpen(true)
  }

  const openEditModal = (p: Product) => {
    setEditingProduct(p)
    setName(p.name)
    setSku(p.sku)
    setCategory(p.category)
    setCostPrice(p.cost_price.toString())
    setSellingPrice(p.selling_price.toString())
    setQuantity(p.quantity.toString())
    setMinStock(p.min_stock?.toString() || '0')
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!company) return

    const numCost = parseFloat(costPrice.replace(',', '.')) || 0
    const numSell = parseFloat(sellingPrice.replace(',', '.')) || 0
    const numQty = parseInt(quantity, 10) || 0
    const numMin = parseInt(minStock, 10) || 0

    if (!name.trim()) {
      toast({ variant: 'destructive', title: 'Nome do produto é obrigatório' })
      return
    }

    try {
      setSubmitting(true)
      if (editingProduct) {
        await updateProduct(editingProduct.id, {
          name,
          sku: sku || `SKU-${Date.now().toString().slice(-6)}`,
          category,
          cost_price: numCost,
          selling_price: numSell,
          quantity: numQty,
          min_stock: numMin,
        })
        toast({ title: 'Produto atualizado com sucesso!' })
      } else {
        await createProduct({
          company_id: company.id,
          name,
          sku: sku || `SKU-${Date.now().toString().slice(-6)}`,
          category,
          cost_price: numCost,
          selling_price: numSell,
          quantity: numQty,
          min_stock: numMin,
        })
        toast({ title: 'Produto cadastrado com sucesso!' })
      }
      setIsModalOpen(false)
      await loadData()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar produto', description: err?.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleApplyAdjustment = async () => {
    if (!adjustTarget || !company) return
    const qtyChange = parseInt(adjustAmount, 10)
    if (isNaN(qtyChange) || qtyChange <= 0) return

    let newTotal = adjustTarget.quantity
    if (adjustType === 'adicionar') {
      newTotal += qtyChange
    } else {
      newTotal = Math.max(0, newTotal - qtyChange)
    }

    try {
      await updateProduct(adjustTarget.id, { quantity: newTotal })

      // Registrar movimentação de saída ou entrada no ledger
      await createMovement({
        company_id: company.id,
        movement_date: new Date().toISOString().split('T')[0],
        type: adjustType === 'adicionar' ? 'entrada' : 'saída',
        description: `Estoque (${adjustTarget.name}): ${adjustReason}`,
        category: 'Estoque',
        amount: qtyChange * adjustTarget.cost_price,
        reference: `products/${adjustTarget.id}`,
      })

      toast({
        title: 'Estoque atualizado!',
        description: `Novo saldo do produto: ${newTotal} un.`,
      })

      setAdjustTarget(null)
      await loadData()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao ajustar estoque', description: err?.message })
    }
  }

  const handleDelete = async () => {
    if (!deleteTargetId) return
    try {
      await deleteProduct(deleteTargetId)
      toast({ title: 'Produto removido com sucesso' })
      setDeleteTargetId(null)
      await loadData()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: err?.message })
    }
  }

  // Filtros
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
      const matchCat = selectedCategory === 'Todos' || p.category === selectedCategory
      return matchSearch && matchCat
    })
  }, [products, searchTerm, selectedCategory])

  // Métricas de Estoque
  const totalItens = useMemo(() => {
    return products.reduce((acc, p) => acc + (p.quantity || 0), 0)
  }, [products])

  const valorTotalEstoque = useMemo(() => {
    return products.reduce((acc, p) => acc + (p.quantity || 0) * (p.cost_price || 0), 0)
  }, [products])

  const itensEstoqueBaixo = useMemo(() => {
    return products.filter((p) => p.quantity <= (p.min_stock || 0)).length
  }, [products])

  // Exportar CSV
  const handleExportCsv = () => {
    if (products.length === 0) return
    const header = 'SKU,Nome,Categoria,PrecoCusto,PrecoVenda,Quantidade,EstoqueMinimo\n'
    const rows = products
      .map(
        (p) =>
          `"${p.sku}","${p.name}","${p.category}","${p.cost_price}","${p.selling_price}","${p.quantity}","${p.min_stock || 0}"`,
      )
      .join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `estoque_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Estoque</h2>
          <p className="text-sm text-slate-500">
            Controle de mercadorias, insumos, inventário e níveis de reposição.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportCsv}
            className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold h-9"
          >
            <Download className="w-4 h-4 mr-1.5" /> Relatório CSV
          </Button>

          <Button
            onClick={openCreateModal}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9 px-4 shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Novo Produto
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">Total de Unidades</span>
          <p className="text-xl font-bold font-mono text-slate-900 mt-1">{totalItens} un.</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">
            Valor em Estoque (Custo)
          </span>
          <p className="text-xl font-bold font-mono text-emerald-700 mt-1">
            {formatCurrency(valorTotalEstoque)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">
            Itens em Nível Baixo/Esgotado
          </span>
          <p
            className={`text-xl font-bold font-mono mt-1 ${
              itensEstoqueBaixo > 0 ? 'text-red-600' : 'text-slate-800'
            }`}
          >
            {itensEstoqueBaixo} itens
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <Input
            placeholder="Buscar por nome ou SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 border-slate-200 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={selectedCategory} onValueChange={(val) => setSelectedCategory(val)}>
            <SelectTrigger className="w-44 h-10 text-xs">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat === 'Todos' ? 'Todas Categorias' : cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Products List */}
      {filteredProducts.length === 0 ? (
        <EmptyState
          icon={<Package className="w-8 h-8" />}
          title="Nenhum produto em estoque"
          description="Cadastre produtos para controlar custos, preços e reposição."
          actionLabel="+ Novo Produto"
          onAction={openCreateModal}
        />
      ) : (
        <>
          {/* Mobile Cards (telas pequenas) */}
          <div className="md:hidden space-y-3">
            {filteredProducts.map((p) => {
              const isLow = p.quantity <= (p.min_stock || 0) && p.quantity > 0
              const isOut = p.quantity === 0

              return (
                <div
                  key={p.id}
                  className={`bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3 ${
                    isOut
                      ? 'border-red-200 bg-red-50/15'
                      : isLow
                        ? 'border-amber-200 bg-amber-50/15'
                        : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                          {p.category}
                        </span>
                        {p.sku && (
                          <span className="text-[10px] font-mono text-slate-400">{p.sku}</span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-1">{p.name}</h4>
                    </div>

                    <div>
                      {isOut ? (
                        <span className="inline-flex items-center text-[10px] font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                          Esgotado
                        </span>
                      ) : isLow ? (
                        <span className="inline-flex items-center text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                          Baixo
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                          OK
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Custo</span>
                      <span className="font-mono text-slate-600">
                        {formatCurrency(p.cost_price)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Venda</span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatCurrency(p.selling_price)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => setAdjustTarget(p)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-emerald-500 hover:text-emerald-700 active:bg-slate-50 transition text-xs font-semibold shadow-2xs"
                    >
                      <span>
                        Estoque: <strong className="font-mono">{p.quantity}</strong> un.
                      </span>
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                        ± Ajustar
                      </span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(p)}
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 active:bg-slate-200 transition"
                        title="Editar produto"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTargetId(p.id)}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 active:bg-red-100 transition"
                        title="Excluir produto"
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
                    <th className="py-3 px-4">Produto & SKU</th>
                    <th className="py-3 px-4">Categoria</th>
                    <th className="py-3 px-4 text-right">Preço de Custo</th>
                    <th className="py-3 px-4 text-right">Preço de Venda</th>
                    <th className="py-3 px-4 text-center">Quantidade</th>
                    <th className="py-3 px-4 text-center">Mínimo</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredProducts.map((p) => {
                    const isLow = p.quantity <= (p.min_stock || 0) && p.quantity > 0
                    const isOut = p.quantity === 0

                    return (
                      <tr
                        key={p.id}
                        className={`hover:bg-slate-50/70 transition ${
                          isLow ? 'bg-amber-50/30' : isOut ? 'bg-red-50/30' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          <div>{p.name}</div>
                          <div className="text-[11px] font-mono text-slate-400 font-normal">
                            {p.sku}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-slate-600">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                            {p.category}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right font-mono text-slate-600 whitespace-nowrap">
                          {formatCurrency(p.cost_price)}
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {formatCurrency(p.selling_price)}
                        </td>

                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => setAdjustTarget(p)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-slate-200 bg-white hover:border-emerald-500 hover:text-emerald-700 transition font-mono font-bold text-xs shadow-2xs"
                            title="Clique para ajustar estoque"
                          >
                            <span>{p.quantity} un.</span>
                            <span className="text-[10px] text-slate-400">±</span>
                          </button>
                        </td>

                        <td className="py-3 px-4 text-center text-slate-500 font-mono">
                          {p.min_stock || 0} un.
                        </td>

                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {isOut ? (
                            <span className="inline-flex items-center text-[10px] font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                              Esgotado
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex items-center text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                              Baixo
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                              OK
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(p)}
                              className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition"
                              title="Editar produto"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTargetId(p.id)}
                              className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                              title="Excluir produto"
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

      {/* Modal Novo / Editar Produto */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[480px] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              {editingProduct ? 'Editar Produto' : 'Novo Produto'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="prodName" className="text-xs font-semibold text-slate-700">
                Nome do Produto / Item <span className="text-red-500">*</span>
              </Label>
              <Input
                id="prodName"
                placeholder="Ex: Teclado Mecânico RGB"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sku" className="text-xs font-semibold text-slate-700">
                  Código SKU
                </Label>
                <Input
                  id="sku"
                  placeholder="SKU-12345"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cat" className="text-xs font-semibold text-slate-700">
                  Categoria
                </Label>
                <Select value={category} onValueChange={(val) => setCategory(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.filter((c) => c !== 'Todos').map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="costPrice" className="text-xs font-semibold text-slate-700">
                  Preço de Custo (R$) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="costPrice"
                  placeholder="0,00"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className="h-9 text-xs font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sellingPrice" className="text-xs font-semibold text-slate-700">
                  Preço de Venda (R$) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="sellingPrice"
                  placeholder="0,00"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  className="h-9 text-xs font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="qty" className="text-xs font-semibold text-slate-700">
                  Quantidade Atual
                </Label>
                <Input
                  id="qty"
                  type="number"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="min" className="text-xs font-semibold text-slate-700">
                  Estoque Mínimo (Alerta)
                </Label>
                <Input
                  id="min"
                  type="number"
                  min="0"
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>
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
                  'Salvar Produto'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Ajuste Rápido de Estoque (+/-) */}
      <Dialog open={!!adjustTarget} onOpenChange={() => setAdjustTarget(null)}>
        <DialogContent className="w-[92vw] sm:max-w-[400px] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Ajuste de Estoque: {adjustTarget?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-xs text-slate-500">
              Saldo atual:{' '}
              <strong className="text-slate-800">{adjustTarget?.quantity} unidades</strong>.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={adjustType === 'adicionar' ? 'default' : 'outline'}
                onClick={() => setAdjustType('adicionar')}
                className={`text-xs h-9 ${
                  adjustType === 'adicionar' ? 'bg-emerald-600 hover:bg-emerald-700' : ''
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5 mr-1.5" /> Adicionar (+)
              </Button>
              <Button
                type="button"
                variant={adjustType === 'remover' ? 'default' : 'outline'}
                onClick={() => setAdjustType('remover')}
                className={`text-xs h-9 ${
                  adjustType === 'remover' ? 'bg-red-600 hover:bg-red-700' : ''
                }`}
              >
                <Minus className="w-3.5 h-3.5 mr-1.5" /> Remover (-)
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Quantidade a {adjustType}
              </Label>
              <Input
                type="number"
                min="1"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Motivo do Ajuste (Registrado no Ledger)
              </Label>
              <Input
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Ex: Compra de fornecedor, perda ou avaria"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAdjustTarget(null)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleApplyAdjustment}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
            >
              Confirmar Ajuste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <Dialog open={!!deleteTargetId} onOpenChange={() => setDeleteTargetId(null)}>
        <DialogContent className="w-[92vw] sm:max-w-[400px] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Excluir Produto?
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-500">
            Tem certeza de que deseja remover este produto do catálogo?
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

export default Estoque
