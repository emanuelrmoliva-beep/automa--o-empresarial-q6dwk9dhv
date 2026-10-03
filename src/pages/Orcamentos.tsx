import React, { useState, useEffect } from 'react'
import {
  FileText,
  Plus,
  Search,
  Filter,
  Share2,
  Download,
  Trash2,
  Edit2,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  User,
  Calendar,
  DollarSign,
  AlertCircle,
  Copy,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import {
  getQuotes,
  createQuote,
  updateQuote,
  deleteQuote,
  getCustomers,
  getProducts,
  createSale,
} from '@/services/erp'
import type { Quote, QuoteItem, Customer, Product } from '@/types/erp'
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
import { ShareQuoteModal } from '@/components/ShareQuoteModal'
import { generateQuotePdf } from '@/services/quotePdf'

export function Orcamentos() {
  const { user, company } = useAuth()
  const { toast } = useToast()

  const [quotes, setQuotes] = useState<Quote[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null)
  const [sharingQuote, setSharingQuote] = useState<Quote | null>(null)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)

  // Formulário de Orçamento
  const [quoteNumber, setQuoteNumber] = useState('')
  const [title, setTitle] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [customCustomerName, setCustomCustomerName] = useState('')
  const [customCustomerContact, setCustomCustomerContact] = useState('')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0])
  const [validUntil, setValidUntil] = useState('')
  const [status, setStatus] = useState<Quote['status']>('Rascunho')
  const [paymentTerms, setPaymentTerms] = useState('À vista via PIX ou em até 3x no cartão')
  const [notes, setNotes] = useState('')
  const [discount, setDiscount] = useState<number>(0)
  const [items, setItems] = useState<QuoteItem[]>([
    { name: '', quantity: 1, unit_price: 0, total: 0 },
  ])
  const [saving, setSaving] = useState(false)

  const loadData = async () => {
    if (!company) return
    try {
      setLoading(true)
      const [quotesData, customersData, productsData] = await Promise.all([
        getQuotes(company.id),
        getCustomers(company.id),
        getProducts(company.id),
      ])
      setQuotes(quotesData)
      setCustomers(customersData)
      setProducts(productsData)
    } catch (err: any) {
      console.error('Erro ao carregar orçamentos:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar orçamentos',
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
    const nextNum = `ORC-${new Date().getFullYear()}-${String(quotes.length + 1).padStart(3, '0')}`
    setEditingQuote(null)
    setQuoteNumber(nextNum)
    setTitle('')
    setCustomerId('')
    setCustomCustomerName('')
    setCustomCustomerContact('')
    setIssueDate(new Date().toISOString().split('T')[0])
    // Validade padrão: 15 dias
    const valDate = new Date()
    valDate.setDate(valDate.getDate() + 15)
    setValidUntil(valDate.toISOString().split('T')[0])
    setStatus('Rascunho')
    setPaymentTerms('À vista via PIX ou em até 3x no cartão')
    setNotes('Orçamento sujeito a confirmação de disponibilidade em estoque.')
    setDiscount(0)
    setItems([{ name: '', quantity: 1, unit_price: 0, total: 0 }])
    setIsModalOpen(true)
  }

  const openEditQuoteModal = (quote: Quote) => {
    setEditingQuote(quote)
    setQuoteNumber(quote.quote_number || '')
    setTitle(quote.title || '')
    setCustomerId(quote.customer_id || '')
    setCustomCustomerName(quote.customer_name || '')
    setCustomCustomerContact(quote.customer_contact || '')
    setIssueDate(quote.issue_date || new Date().toISOString().split('T')[0])
    setValidUntil(quote.valid_until || '')
    setStatus(quote.status || 'Rascunho')
    setPaymentTerms(quote.payment_terms || '')
    setNotes(quote.notes || '')
    setDiscount(quote.discount || 0)
    setItems(
      Array.isArray(quote.items) && quote.items.length > 0
        ? quote.items
        : [
            {
              name: quote.title,
              quantity: 1,
              unit_price: quote.total_amount,
              total: quote.total_amount,
            },
          ],
    )
    setIsModalOpen(true)
  }

  // Cálculos de itens
  const handleItemProductSelect = (index: number, prodId: string) => {
    const prod = products.find((p) => p.id === prodId)
    const newItems = [...items]
    if (prod) {
      newItems[index] = {
        ...newItems[index],
        product_id: prod.id,
        name: prod.name,
        sku: prod.sku,
        unit_price: prod.selling_price,
        total: (newItems[index].quantity || 1) * prod.selling_price,
      }
    } else {
      newItems[index] = {
        ...newItems[index],
        product_id: undefined,
      }
    }
    setItems(newItems)
  }

  const handleItemChange = (index: number, field: keyof QuoteItem, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    const qty = Number(newItems[index].quantity) || 0
    const price = Number(newItems[index].unit_price) || 0
    newItems[index].total = qty * price
    setItems(newItems)
  }

  const addItemRow = () => {
    setItems([...items, { name: '', quantity: 1, unit_price: 0, total: 0 }])
  }

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  const subtotal = items.reduce((acc, it) => acc + (it.total || 0), 0)
  const totalAmount = Math.max(0, subtotal - (Number(discount) || 0))

  const handleSaveQuote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!company) return
    if (!title.trim()) {
      toast({
        variant: 'destructive',
        title: 'Título obrigatório',
        description: 'Informe o título do orçamento.',
      })
      return
    }

    try {
      setSaving(true)
      const selectedCustomer = customers.find((c) => c.id === customerId)
      const payload: Partial<Quote> = {
        company_id: company.id,
        quote_number: quoteNumber,
        title: title.trim(),
        customer_id: customerId || undefined,
        customer_name: selectedCustomer ? selectedCustomer.name : customCustomerName,
        customer_contact: selectedCustomer
          ? selectedCustomer.phone || selectedCustomer.email
          : customCustomerContact,
        issue_date: issueDate,
        valid_until: validUntil || undefined,
        status,
        items,
        subtotal,
        discount: Number(discount) || 0,
        total_amount: totalAmount,
        payment_terms: paymentTerms,
        notes,
      }

      if (editingQuote) {
        await updateQuote(editingQuote.id, payload)
        toast({
          title: 'Orçamento atualizado',
          description: 'As alterações foram salvas com sucesso.',
        })
      } else {
        await createQuote(payload)
        toast({ title: 'Orçamento criado', description: 'Novo orçamento cadastrado com sucesso.' })
      }

      setIsModalOpen(false)
      loadData()
    } catch (err: any) {
      console.error('Erro ao salvar orçamento:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: err?.message || 'Verifique os dados informados.',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (quote: Quote) => {
    if (!confirm(`Deseja realmente excluir o orçamento "${quote.title}"?`)) return
    try {
      await deleteQuote(quote.id)
      toast({ title: 'Orçamento excluído', description: 'Registro removido com sucesso.' })
      loadData()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: err?.message })
    }
  }

  // Converter orçamento em venda realizada
  const handleConvertToSale = async (quote: Quote) => {
    if (!company) return
    if (!confirm(`Deseja converter o orçamento "${quote.title}" em uma Venda concluída?`)) return
    try {
      await createSale({
        company_id: company.id,
        customer_id: quote.customer_id,
        description: `Venda - Orçamento ${quote.quote_number || quote.title}`,
        sale_date: new Date().toISOString().split('T')[0],
        amount: quote.total_amount,
        payment_method: 'Pix',
        status: 'Concluída',
      })

      await updateQuote(quote.id, { status: 'Convertido' })
      toast({
        title: 'Orçamento convertido em Venda!',
        description: 'Venda gerada e status do orçamento atualizado para Convertido.',
      })
      loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro na conversão',
        description: err?.message || 'Não foi possível converter em venda.',
      })
    }
  }

  // Filtragem
  const filteredQuotes = quotes.filter((q) => {
    const matchesSearch =
      q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.quote_number && q.quote_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (q.customer_name && q.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (q.expand?.customer_id?.name &&
        q.expand.customer_id.name.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesStatus = statusFilter === 'ALL' || q.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (st: Quote['status']) => {
    switch (st) {
      case 'Rascunho':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
            Rascunho
          </span>
        )
      case 'Enviado':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800">
            Enviado
          </span>
        )
      case 'Aprovado':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
            Aprovado
          </span>
        )
      case 'Recusado':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-800">
            Recusado
          </span>
        )
      case 'Convertido':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-800">
            Convertido em Venda
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-600" />
            Orçamentos & Propostas
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Crie propostas comerciais detalhadas e compartilhe instantaneamente via WhatsApp, e-mail
            ou PDF.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={openNewQuoteModal}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Novo Orçamento
          </Button>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Buscar por título, nº do orçamento ou cliente..."
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
            <option value="Rascunho">Rascunho</option>
            <option value="Enviado">Enviado</option>
            <option value="Aprovado">Aprovado</option>
            <option value="Recusado">Recusado</option>
            <option value="Convertido">Convertido</option>
          </select>
        </div>
      </div>

      {/* Conteúdo: Lista ou Vazio */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
          <p className="text-sm">Carregando propostas e orçamentos...</p>
        </div>
      ) : filteredQuotes.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-8 h-8" />}
          title="Nenhum orçamento encontrado"
          description={
            searchTerm || statusFilter !== 'ALL'
              ? 'Tente ajustar os filtros de busca para encontrar o que procura.'
              : 'Comece criando sua primeira proposta comercial para clientes com itens e valores.'
          }
          actionLabel={searchTerm ? undefined : 'Criar Primeiro Orçamento'}
          onAction={searchTerm ? undefined : openNewQuoteModal}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredQuotes.map((q) => {
            const clientName = q.expand?.customer_id?.name || q.customer_name || 'Cliente Geral'
            const itemsCount = Array.isArray(q.items) ? q.items.length : 0

            return (
              <div
                key={q.id}
                className="bg-white rounded-xl border border-slate-200 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden"
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold">
                        {q.quote_number || q.id.slice(0, 8).toUpperCase()}
                      </span>
                      <h3 className="font-semibold text-slate-900 text-sm mt-1.5 line-clamp-1">
                        {q.title}
                      </h3>
                    </div>
                    {getStatusBadge(q.status)}
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5 truncate">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{clientName}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Emissão: {formatDatePtBr(q.issue_date)}</span>
                    </div>

                    {q.valid_until && (
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-600">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>Válido até: {formatDatePtBr(q.valid_until)}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      {itemsCount} {itemsCount === 1 ? 'item' : 'itens'}
                    </span>
                    <span className="text-base font-bold text-emerald-700">
                      {formatCurrency(q.total_amount)}
                    </span>
                  </div>
                </div>

                {/* Ações do Card */}
                <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200/80 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSharingQuote(q)
                        setIsShareModalOpen(true)
                      }}
                      className="text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 h-8 px-2 font-medium"
                      title="Compartilhar via WhatsApp, E-mail ou PDF"
                    >
                      <Share2 className="w-3.5 h-3.5 mr-1" /> Compartilhar
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => generateQuotePdf(q, company)}
                      className="text-xs text-slate-600 hover:text-slate-800 h-8 px-2"
                      title="Baixar PDF"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-1">
                    {q.status !== 'Convertido' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleConvertToSale(q)}
                        className="text-xs text-purple-700 hover:text-purple-800 hover:bg-purple-50 h-8 px-2 font-medium"
                        title="Converter em Venda"
                      >
                        <DollarSign className="w-3.5 h-3.5 mr-0.5" /> Vender
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditQuoteModal(q)}
                      className="text-xs text-slate-600 hover:text-slate-900 h-8 w-8 p-0"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(q)}
                      className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de Compartilhamento */}
      <ShareQuoteModal
        open={isShareModalOpen}
        onOpenChange={setIsShareModalOpen}
        quote={sharingQuote}
        company={company}
      />

      {/* Modal de Criação / Edição de Orçamento */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-slate-900 text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              {editingQuote ? 'Editar Orçamento' : 'Novo Orçamento Comercial'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Preencha os itens, valores e condições. Você poderá compartilhar via WhatsApp ou PDF
              imediatamente após salvar.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveQuote} className="space-y-4 pt-1 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-medium text-slate-700 block mb-1">Nº do Orçamento</label>
                <Input
                  value={quoteNumber}
                  onChange={(e) => setQuoteNumber(e.target.value)}
                  placeholder="Ex: ORC-2025-001"
                  className="text-xs font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-medium text-slate-700 block mb-1">
                  Título / Objeto do Orçamento <span className="text-red-500">*</span>
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Fornecimento de Materiais para Reforma"
                  className="text-xs font-medium"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-medium text-slate-700 block mb-1">Cliente Cadastrado</label>
                <select
                  value={customerId}
                  onChange={(e) => {
                    setCustomerId(e.target.value)
                    const cust = customers.find((c) => c.id === e.target.value)
                    if (cust) {
                      setCustomCustomerName(cust.name)
                      setCustomCustomerContact(cust.phone || cust.email || '')
                    }
                  }}
                  className="w-full text-xs border border-slate-200 rounded-md px-3 py-2 bg-white text-slate-800"
                >
                  <option value="">-- Cliente Avulso ou Não Cadastrado --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {!customerId && (
                <div>
                  <label className="font-medium text-slate-700 block mb-1">
                    Nome do Cliente Avulso
                  </label>
                  <Input
                    value={customCustomerName}
                    onChange={(e) => setCustomCustomerName(e.target.value)}
                    placeholder="Ex: Ana Clara Souza"
                    className="text-xs"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-medium text-slate-700 block mb-1">Data de Emissão</label>
                <Input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">
                  Validade da Proposta
                </label>
                <Input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Quote['status'])}
                  className="w-full text-xs border border-slate-200 rounded-md px-3 py-2 bg-white text-slate-800 font-medium"
                >
                  <option value="Rascunho">Rascunho</option>
                  <option value="Enviado">Enviado</option>
                  <option value="Aprovado">Aprovado</option>
                  <option value="Recusado">Recusado</option>
                  <option value="Convertido">Convertido</option>
                </select>
              </div>
            </div>

            {/* Tabela de Itens */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">Itens / Serviços do Orçamento</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItemRow}
                  className="text-xs h-7 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Item
                </Button>
              </div>

              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg space-y-2"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      <div className="sm:col-span-5">
                        <select
                          value={item.product_id || ''}
                          onChange={(e) => handleItemProductSelect(idx, e.target.value)}
                          className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 bg-white text-slate-800 mb-1"
                        >
                          <option value="">-- Selecionar do Estoque (Opcional) --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} - {formatCurrency(p.selling_price)}
                            </option>
                          ))}
                        </select>
                        <Input
                          placeholder="Descrição do item ou serviço *"
                          value={item.name}
                          onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                          className="text-xs h-8 bg-white"
                          required
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[10px] text-slate-500 font-medium block">Qtd</label>
                        <Input
                          type="number"
                          min="0.01"
                          step="any"
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(idx, 'quantity', Number(e.target.value))
                          }
                          className="text-xs h-8 bg-white"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[10px] text-slate-500 font-medium block">
                          Unitário (R$)
                        </label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) =>
                            handleItemChange(idx, 'unit_price', Number(e.target.value))
                          }
                          className="text-xs h-8 bg-white"
                        />
                      </div>

                      <div className="sm:col-span-2 text-right">
                        <label className="text-[10px] text-slate-500 font-medium block">
                          Total
                        </label>
                        <span className="font-semibold text-slate-800 text-xs block py-1.5">
                          {formatCurrency(item.total || 0)}
                        </span>
                      </div>

                      <div className="sm:col-span-1 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItemRow(idx)}
                          disabled={items.length <= 1}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totais & Desconto */}
            <div className="bg-slate-100/70 p-3 rounded-lg flex flex-col sm:flex-row items-end sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-600">Desconto (R$):</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="w-28 h-8 text-xs bg-white"
                />
              </div>

              <div className="text-right">
                <span className="text-[11px] text-slate-500 block">
                  Subtotal: {formatCurrency(subtotal)}
                </span>
                <span className="text-sm font-bold text-emerald-800">
                  Total Final: {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-medium text-slate-700 block mb-1">
                  Condições de Pagamento
                </label>
                <Input
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="Ex: 50% de entrada e restante em 30 dias"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">
                  Observações / Garantias
                </label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Prazo de entrega de 5 dias úteis."
                  className="text-xs"
                />
              </div>
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
                  'Salvar Orçamento'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default Orcamentos
