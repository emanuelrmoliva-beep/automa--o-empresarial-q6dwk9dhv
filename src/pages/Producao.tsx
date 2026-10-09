import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Layers,
  Plus,
  Search,
  Download,
  Trash2,
  Edit2,
  Calendar,
  Package,
  CheckCircle2,
  Clock,
  Loader2,
  UploadCloud,
  X,
  FileText,
  File,
  Image as ImageIcon,
  AlertCircle,
  Eye,
  Barcode,
  ChevronRight,
  Filter,
  DollarSign,
  Globe,
  Copy,
  Check,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import {
  getProductionBatches,
  getProductionBatchItems,
  createProductionBatch,
  updateProductionBatch,
  deleteProductionBatch,
  createProductionBatchItem,
  updateProductionBatchItem,
  deleteProductionBatchItem,
  getProducts,
  getPbFileUrl,
} from '@/services/erp'
import { applyStockDeltas, validateProductionStockAvailability } from '@/services/stockSync'
import type { ProductionBatch, ProductionBatchItem, Product } from '@/types/erp'
import { formatDatePtBr, formatCurrency } from '@/lib/formatters'
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
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/EmptyState'
import { BatchDetailModal } from '@/components/BatchDetailModal'

const GRAMMAGE_OPTIONS = [
  'g/m² (Gramas por metro quadrado)',
  'g/m (Gramas por metro linear)',
  'micras (Espessura)',
  'mm (Milímetros)',
  'cm (Centímetros)',
  'm (Metros)',
  'kg (Quilogramas)',
  'g (Gramas)',
  'L (Litros)',
  'ml (Mililitros)',
  'un (Unidades)',
  'Outro',
]

interface DraftItem {
  id?: string
  product_id?: string
  item_name: string
  grammage_type: string
  grammage_value: string
  supplier_batch_number: string
  manufacture_date: string
  quantity_used: string
  unit_measure: string
  unit_cost: string
  notes: string
  existingFiles: string[]
  newFiles: File[]
}

export const Producao: React.FC = () => {
  const { company } = useAuth()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<'lotes' | 'relatorios'>('lotes')
  const [batches, setBatches] = useState<(ProductionBatch & { items?: ProductionBatchItem[] })[]>(
    [],
  )
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'aberto' | 'finalizado'>('Todos')
  const [periodFilter, setPeriodFilter] = useState<'Todos' | 'Hoje' | '30dias' | 'Mes'>('Todos')

  // Modal Novo / Editar Lote
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBatch, setEditingBatch] = useState<ProductionBatch | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState<string | null>(null)

  // Campos do Lote
  const [batchNumber, setBatchNumber] = useState('')
  const [productionDate, setProductionDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedProductId, setSelectedProductId] = useState<string>('livre')
  const [productName, setProductName] = useState('')
  const [quantityProduced, setQuantityProduced] = useState('1')
  const [status, setStatus] = useState<'aberto' | 'finalizado'>('finalizado')
  const [batchNotes, setBatchNotes] = useState('')

  // Insumos do Lote no formulário
  const [itemsDraft, setItemsDraft] = useState<DraftItem[]>([])

  // Modal Ficha Completa do Lote (Rastreabilidade)
  const [inspectBatch, setInspectBatch] = useState<
    (ProductionBatch & { items?: ProductionBatchItem[] }) | null
  >(null)
  const [isInspectOpen, setIsInspectOpen] = useState(false)

  // Confirmação de Exclusão
  const [deleteTargetBatch, setDeleteTargetBatch] = useState<ProductionBatch | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Estado para alternar consulta pública e copiar link
  const [togglingPublicId, setTogglingPublicId] = useState<string | null>(null)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  // Função auxiliar para calcular custo do lote a partir dos itens ou de total_cost
  const getBatchCostInfo = useCallback((b: ProductionBatch & { items?: ProductionBatchItem[] }) => {
    const items = b.items || []
    const calculatedItemsCost = items.reduce(
      (sum, it) =>
        sum +
        (it.total_cost != null && it.total_cost > 0
          ? it.total_cost
          : (it.unit_cost || 0) * (it.quantity_used || 0)),
      0,
    )
    const totalCost = b.total_cost != null && b.total_cost > 0 ? b.total_cost : calculatedItemsCost
    const qty = b.quantity_produced || 0
    const unitCost = qty > 0 ? totalCost / qty : null
    return { totalCost, unitCost }
  }, [])

  // Ação rápida para alternar consulta pública diretamente na listagem
  const handleTogglePublic = async (batch: ProductionBatch & { items?: ProductionBatchItem[] }) => {
    try {
      setTogglingPublicId(batch.id)
      const nextIsPublic = !batch.is_public
      let nextToken = batch.public_token

      if (nextIsPublic && !nextToken) {
        nextToken =
          'lote_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 12)
      }

      await updateProductionBatch(batch.id, {
        is_public: nextIsPublic,
        public_token: nextIsPublic ? nextToken : '',
      })

      setBatches((prev) =>
        prev.map((b) =>
          b.id === batch.id
            ? {
                ...b,
                is_public: nextIsPublic,
                public_token: nextIsPublic ? nextToken : '',
              }
            : b,
        ),
      )

      toast({
        title: nextIsPublic ? 'Consulta Pública Ativada' : 'Consulta Pública Desativada',
        description: nextIsPublic
          ? 'O lote agora possui URL pública e QR Code ativos para clientes.'
          : 'O acesso público foi revogado. O link anterior não funcionará mais.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao alterar consulta pública',
        description: err?.message || 'Falha ao salvar preferências de visibilidade.',
        variant: 'destructive',
      })
    } finally {
      setTogglingPublicId(null)
    }
  }

  // Copiar link público
  const handleCopyPublicLink = async (token?: string) => {
    if (!token) return
    const url = `${window.location.origin}/consulta-lote/${token}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiedToken(token)
      toast({
        title: 'Link público copiado!',
        description: 'URL de consulta do lote copiada para a área de transferência.',
      })
      setTimeout(() => setCopiedToken(null), 2500)
    } catch {
      toast({
        title: 'Erro ao copiar',
        description: 'Não foi possível copiar o link automaticamente.',
        variant: 'destructive',
      })
    }
  }

  const loadData = useCallback(async () => {
    if (!company) return
    try {
      const [batchesData, productsData] = await Promise.all([
        getProductionBatches(company.id),
        getProducts(company.id),
      ])

      // Carregar os itens de cada lote para busca completa e rastreabilidade imediata
      const enriched = await Promise.all(
        batchesData.map(async (b) => {
          try {
            const items = await getProductionBatchItems(b.id)
            return { ...b, items }
          } catch {
            return { ...b, items: [] }
          }
        }),
      )

      setBatches(enriched)
      setProducts(productsData)
    } catch (err) {
      console.error('Erro ao carregar dados de produção:', err)
    } finally {
      setLoading(false)
    }
  }, [company])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('production_batches', () => loadData(), !!company)
  useRealtime('production_batch_items', () => loadData(), !!company)
  useRealtime('products', () => loadData(), !!company)

  // Gerador de número de lote sugerido: LOTE-YYYY-0001
  const generateSuggestedBatchNumber = useCallback(() => {
    const year = new Date().getFullYear()
    const thisYearBatches = batches.filter((b) => b.batch_number?.startsWith(`LOTE-${year}`))
    const nextSeq = thisYearBatches.length + 1
    const seqStr = String(nextSeq).padStart(4, '0')
    return `LOTE-${year}-${seqStr}`
  }, [batches])

  // Abrir Modal de Criação de Lote
  const handleOpenCreateModal = () => {
    setEditingBatch(null)
    setBatchNumber(generateSuggestedBatchNumber())
    setProductionDate(new Date().toISOString().split('T')[0])
    setSelectedProductId('livre')
    setProductName('')
    setQuantityProduced('1')
    setStatus('finalizado')
    setBatchNotes('')
    setItemsDraft([
      {
        item_name: '',
        grammage_type: 'g/m²',
        grammage_value: '',
        supplier_batch_number: '',
        manufacture_date: '',
        quantity_used: '1',
        unit_measure: 'un',
        unit_cost: '',
        notes: '',
        existingFiles: [],
        newFiles: [],
      },
    ])
    setFormErrors(null)
    setIsModalOpen(true)
  }

  // Abrir Modal de Edição de Lote
  const handleOpenEditModal = (batch: ProductionBatch & { items?: ProductionBatchItem[] }) => {
    setEditingBatch(batch)
    setBatchNumber(batch.batch_number)
    setProductionDate(batch.production_date ? batch.production_date.split('T')[0] : '')
    setSelectedProductId(batch.product_id || 'livre')
    setProductName(batch.product_name || '')
    setQuantityProduced(String(batch.quantity_produced ?? 1))
    setStatus(batch.status)
    setBatchNotes(batch.notes || '')

    const drafts: DraftItem[] = (batch.items || []).map((it) => ({
      id: it.id,
      product_id: it.product_id,
      item_name: it.item_name,
      grammage_type: it.grammage_type || 'g/m²',
      grammage_value: it.grammage_value ? String(it.grammage_value) : '',
      supplier_batch_number: it.supplier_batch_number || '',
      manufacture_date: it.manufacture_date ? it.manufacture_date.split('T')[0] : '',
      quantity_used: String(it.quantity_used),
      unit_measure: it.unit_measure || 'un',
      unit_cost: it.unit_cost != null && it.unit_cost > 0 ? String(it.unit_cost) : '',
      notes: it.notes || '',
      existingFiles: it.attachments || [],
      newFiles: [],
    }))

    setItemsDraft(
      drafts.length > 0
        ? drafts
        : [
            {
              item_name: '',
              grammage_type: 'g/m²',
              grammage_value: '',
              supplier_batch_number: '',
              manufacture_date: '',
              quantity_used: '1',
              unit_measure: 'un',
              unit_cost: '',
              notes: '',
              existingFiles: [],
              newFiles: [],
            },
          ],
    )
    setFormErrors(null)
    setIsModalOpen(true)
  }

  // Gerenciamento de Insumos no Formulário
  const handleAddDraftItem = () => {
    setItemsDraft((prev) => [
      ...prev,
      {
        item_name: '',
        grammage_type: 'g/m²',
        grammage_value: '',
        supplier_batch_number: '',
        manufacture_date: '',
        quantity_used: '1',
        unit_measure: 'un',
        unit_cost: '',
        notes: '',
        existingFiles: [],
        newFiles: [],
      },
    ])
  }

  const handleRemoveDraftItem = (index: number) => {
    setItemsDraft((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpdateDraftItem = (index: number, patch: Partial<DraftItem>) => {
    setItemsDraft((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], ...patch }
      return copy
    })
  }

  const handleSelectProductForDraftItem = (index: number, productId: string) => {
    if (productId === 'externo') {
      handleUpdateDraftItem(index, {
        product_id: undefined,
      })
      return
    }
    const prod = products.find((p) => p.id === productId)
    if (!prod) return
    handleUpdateDraftItem(index, {
      product_id: prod.id,
      item_name: prod.name,
      supplier_batch_number: prod.sku ? `SKU-${prod.sku}` : '',
      unit_cost: prod.cost_price != null && prod.cost_price > 0 ? String(prod.cost_price) : '',
    })
  }

  const handleFilesSelected = (index: number, files: FileList | null) => {
    if (!files) return
    const incoming = Array.from(files)
    setItemsDraft((prev) => {
      const copy = [...prev]
      copy[index] = {
        ...copy[index],
        newFiles: [...copy[index].newFiles, ...incoming],
      }
      return copy
    })
  }

  const handleRemoveNewFile = (itemIndex: number, fileIndex: number) => {
    setItemsDraft((prev) => {
      const copy = [...prev]
      copy[itemIndex] = {
        ...copy[itemIndex],
        newFiles: copy[itemIndex].newFiles.filter((_, i) => i !== fileIndex),
      }
      return copy
    })
  }

  const handleRemoveExistingFile = (itemIndex: number, fileName: string) => {
    setItemsDraft((prev) => {
      const copy = [...prev]
      copy[itemIndex] = {
        ...copy[itemIndex],
        existingFiles: copy[itemIndex].existingFiles.filter((f) => f !== fileName),
      }
      return copy
    })
  }

  // Submissão do Lote (Criação ou Edição com Baixa / Devolução de Estoque)
  const handleSubmitBatch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!company) return

    if (!batchNumber.trim()) {
      setFormErrors('O número/identificação do lote é obrigatório.')
      return
    }

    if (itemsDraft.length === 0) {
      setFormErrors('Cadastre pelo menos 1 insumo utilizado na fabricação do lote.')
      return
    }

    for (let i = 0; i < itemsDraft.length; i++) {
      const it = itemsDraft[i]
      if (!it.item_name.trim()) {
        setFormErrors(`Informe o nome do insumo #${i + 1}.`)
        return
      }
      const qty = parseFloat(it.quantity_used.replace(',', '.'))
      if (isNaN(qty) || qty <= 0) {
        setFormErrors(`Informe uma quantidade válida maior que zero para o insumo #${i + 1}.`)
        return
      }
    }

    // Se o lote for finalizado, valida estoque disponível dos insumos vinculados
    if (status === 'finalizado') {
      const itemsToValidate = itemsDraft.map((it) => ({
        product_id: it.product_id,
        quantity_used: parseFloat(it.quantity_used.replace(',', '.')) || 0,
        item_name: it.item_name,
      }))

      const previousItems = editingBatch
        ? (editingBatch.items || []).map((it) => ({
            product_id: it.product_id,
            quantity_used: it.quantity_used,
          }))
        : []

      const valResult = await validateProductionStockAvailability(
        itemsToValidate,
        previousItems,
        !!editingBatch,
        editingBatch?.status,
      )

      if (!valResult.valid) {
        setFormErrors(valResult.errorMessage || 'Estoque insuficiente de insumo.')
        toast({
          variant: 'destructive',
          title: 'Estoque insuficiente de insumo',
          description: valResult.errorMessage,
        })
        return
      }
    }

    try {
      setSubmitting(true)
      setFormErrors(null)

      const numProduced = parseInt(quantityProduced, 10) || 1
      const prodId = selectedProductId === 'livre' ? undefined : selectedProductId
      const prodName =
        selectedProductId !== 'livre'
          ? products.find((p) => p.id === selectedProductId)?.name || productName
          : productName

      // Calcular custo total do lote a partir dos insumos no formulário
      let calculatedBatchTotalCost = 0
      for (const it of itemsDraft) {
        const qVal = parseFloat(it.quantity_used.replace(',', '.')) || 0
        const uCost = parseFloat(it.unit_cost ? it.unit_cost.replace(',', '.') : '0') || 0
        calculatedBatchTotalCost += qVal * uCost
      }

      let savedBatchId = editingBatch?.id

      if (editingBatch) {
        // CÁLCULO DE DELTA DE ESTOQUE NA EDIÇÃO
        // Se era finalizado e agora é finalizado: ajusta a diferença
        // Se era finalizado e agora é aberto: devolve tudo
        // Se era aberto e agora é finalizado: baixa tudo
        // Se era aberto e agora é aberto: nada
        const stockDeltaMap = new Map<string, number>()
        const prevStatus = editingBatch.status
        const nextStatus = status
        const prevItems = editingBatch.items || []

        if (prevStatus === 'finalizado' && nextStatus === 'finalizado') {
          // Reverte o snapshot anterior
          for (const it of prevItems) {
            if (it.product_id) {
              stockDeltaMap.set(
                it.product_id,
                (stockDeltaMap.get(it.product_id) || 0) - (Number(it.quantity_used) || 0),
              )
            }
          }
          // Aplica novo
          for (const it of itemsDraft) {
            if (it.product_id) {
              const q = parseFloat(it.quantity_used.replace(',', '.')) || 0
              stockDeltaMap.set(it.product_id, (stockDeltaMap.get(it.product_id) || 0) + q)
            }
          }
        } else if (prevStatus === 'finalizado' && nextStatus === 'aberto') {
          // Devolve
          for (const it of prevItems) {
            if (it.product_id) {
              stockDeltaMap.set(
                it.product_id,
                (stockDeltaMap.get(it.product_id) || 0) - (Number(it.quantity_used) || 0),
              )
            }
          }
        } else if (prevStatus === 'aberto' && nextStatus === 'finalizado') {
          // Baixa
          for (const it of itemsDraft) {
            if (it.product_id) {
              const q = parseFloat(it.quantity_used.replace(',', '.')) || 0
              stockDeltaMap.set(it.product_id, (stockDeltaMap.get(it.product_id) || 0) + q)
            }
          }
        }

        const deltaRes = await applyStockDeltas(stockDeltaMap)
        if (!deltaRes.success) {
          toast({
            variant: 'destructive',
            title: 'Erro ao ajustar estoque dos insumos',
            description: deltaRes.errors.join('; '),
          })
          setSubmitting(false)
          return
        }

        await updateProductionBatch(editingBatch.id, {
          batch_number: batchNumber.trim(),
          production_date: productionDate,
          product_id: prodId,
          product_name: prodName,
          quantity_produced: numProduced,
          status,
          notes: batchNotes,
          total_cost: calculatedBatchTotalCost,
        })
      } else {
        // NOVO LOTE
        const newBatch = await createProductionBatch({
          company_id: company.id,
          batch_number: batchNumber.trim(),
          production_date: productionDate,
          product_id: prodId,
          product_name: prodName,
          quantity_produced: numProduced,
          status,
          notes: batchNotes,
          total_cost: calculatedBatchTotalCost,
        })
        savedBatchId = newBatch.id

        // Se criado como finalizado, baixa os insumos do estoque
        if (status === 'finalizado') {
          const stockDeltaMap = new Map<string, number>()
          for (const it of itemsDraft) {
            if (it.product_id) {
              const q = parseFloat(it.quantity_used.replace(',', '.')) || 0
              stockDeltaMap.set(it.product_id, (stockDeltaMap.get(it.product_id) || 0) + q)
            }
          }
          const deltaRes = await applyStockDeltas(stockDeltaMap)
          if (!deltaRes.success) {
            toast({
              variant: 'destructive',
              title: 'Erro na baixa de insumos',
              description: deltaRes.errors.join('; '),
            })
          }
        }
      }

      if (!savedBatchId) throw new Error('Falha ao obter ID do lote')

      // Sincronizar Insumos (criar / atualizar / remover)
      const existingItemIds = editingBatch?.items?.map((it) => it.id) || []
      const currentDraftIds = itemsDraft.map((it) => it.id).filter(Boolean) as string[]
      const toDeleteIds = existingItemIds.filter((id) => !currentDraftIds.includes(id))

      // Deletar itens removidos
      for (const delId of toDeleteIds) {
        await deleteProductionBatchItem(delId)
      }

      // Salvar cada item do draft
      for (const item of itemsDraft) {
        const formData = new FormData()
        formData.append('company_id', company.id)
        formData.append('batch_id', savedBatchId)
        if (item.product_id) formData.append('product_id', item.product_id)
        formData.append('item_name', item.item_name.trim())
        if (item.grammage_type) formData.append('grammage_type', item.grammage_type)
        if (item.grammage_value) {
          const gVal = parseFloat(item.grammage_value.replace(',', '.')) || 0
          formData.append('grammage_value', String(gVal))
        }
        if (item.supplier_batch_number) {
          formData.append('supplier_batch_number', item.supplier_batch_number.trim())
        }
        if (item.manufacture_date) {
          formData.append('manufacture_date', item.manufacture_date)
        }
        const qVal = parseFloat(item.quantity_used.replace(',', '.')) || 1
        formData.append('quantity_used', String(qVal))
        formData.append('unit_measure', item.unit_measure || 'un')

        // Custo Unitário e Custo Total do Item
        const uCost = parseFloat(item.unit_cost ? item.unit_cost.replace(',', '.') : '0') || 0
        const itemTotalCost = qVal * uCost
        formData.append('unit_cost', String(uCost))
        formData.append('total_cost', String(itemTotalCost))

        if (item.notes) formData.append('notes', item.notes)

        // Anexar novos arquivos (fotos/PDFs)
        for (const file of item.newFiles) {
          formData.append('attachments', file)
        }

        if (item.id) {
          await updateProductionBatchItem(item.id, formData)
        } else {
          await createProductionBatchItem(formData)
        }
      }

      toast({
        title: editingBatch
          ? 'Lote de produção atualizado!'
          : 'Lote de produção aberto com sucesso!',
        description:
          status === 'finalizado'
            ? 'Rastreabilidade salva e baixa automática aplicada aos insumos do estoque.'
            : 'Lote salvo com sucesso no estado aberto.',
      })

      setIsModalOpen(false)
      await loadData()
    } catch (err: any) {
      console.error(err)
      setFormErrors(err?.message || 'Falha ao salvar lote de produção.')
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar lote',
        description: err?.message,
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Excluir Lote (Devolve Insumos ao Estoque se estava finalizado)
  const handleDeleteBatch = async () => {
    if (!deleteTargetBatch) return
    try {
      setDeleting(true)

      // Se estava finalizado, devolve os insumos ao estoque
      if (deleteTargetBatch.status === 'finalizado' && Array.isArray(deleteTargetBatch.items)) {
        const returnMap = new Map<string, number>()
        for (const it of deleteTargetBatch.items) {
          if (it.product_id) {
            const q = Number(it.quantity_used) || 0
            returnMap.set(it.product_id, (returnMap.get(it.product_id) || 0) - q)
          }
        }
        await applyStockDeltas(returnMap)
      }

      await deleteProductionBatch(deleteTargetBatch.id)
      toast({
        title: 'Lote de produção excluído',
        description: 'Lote removido e insumos devolvidos ao estoque se aplicável.',
      })
      setDeleteTargetBatch(null)
      await loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir lote',
        description: err?.message,
      })
    } finally {
      setDeleting(false)
    }
  }

  // Filtragem completa com busca textual por qualquer campo
  const filteredBatches = useMemo(() => {
    const search = searchTerm.toLowerCase().trim()

    return batches.filter((b) => {
      // 1. Filtro por status
      if (statusFilter !== 'Todos' && b.status !== statusFilter) return false

      // 2. Filtro por período
      if (periodFilter !== 'Todos') {
        const today = new Date()
        const bDate = new Date(b.production_date)
        if (periodFilter === 'Hoje') {
          if (bDate.toISOString().split('T')[0] !== today.toISOString().split('T')[0]) return false
        } else if (periodFilter === '30dias') {
          const diffDays = (today.getTime() - bDate.getTime()) / (1000 * 3600 * 24)
          if (diffDays > 30 || diffDays < 0) return false
        } else if (periodFilter === 'Mes') {
          if (
            bDate.getMonth() !== today.getMonth() ||
            bDate.getFullYear() !== today.getFullYear()
          ) {
            return false
          }
        }
      }

      // 3. Busca textual abrangente em QUALQUER campo:
      // Número do lote, produto, observação do lote, insumos (nome, gramatura, lote do fornecedor, observação)
      if (!search) return true

      const matchBatchNumber = b.batch_number?.toLowerCase().includes(search)
      const matchProductName = (b.product_name || b.expand?.product_id?.name || '')
        .toLowerCase()
        .includes(search)
      const matchBatchNotes = b.notes?.toLowerCase().includes(search)
      const matchDate = formatDatePtBr(b.production_date).toLowerCase().includes(search)

      const matchItems = (b.items || []).some((it) => {
        const itemName = it.item_name?.toLowerCase().includes(search)
        const itemBatch = it.supplier_batch_number?.toLowerCase().includes(search)
        const grammage = `${it.grammage_value || ''} ${it.grammage_type || ''}`
          .toLowerCase()
          .includes(search)
        const itemNotes = it.notes?.toLowerCase().includes(search)
        return itemName || itemBatch || grammage || itemNotes
      })

      return matchBatchNumber || matchProductName || matchBatchNotes || matchDate || matchItems
    })
  }, [batches, searchTerm, statusFilter, periodFilter])

  // Métricas rápidas
  const totalLotes = batches.length
  const lotesFinalizados = batches.filter((b) => b.status === 'finalizado').length
  const totalInsumosUtilizados = batches.reduce((acc, b) => acc + (b.items?.length || 0), 0)

  // Exportar Relatório de Produção em CSV
  const handleExportCsv = () => {
    if (batches.length === 0) return

    const headers = [
      'DataProducao',
      'NumeroLote',
      'Status',
      'ConsultaPublica',
      'TokenPublico',
      'ProdutoFabricado',
      'QtdFabricada',
      'CustoTotalLote',
      'CustoUnitarioLote',
      'NomeInsumo',
      'MedidaGramatura',
      'ValorGramatura',
      'LoteInsumo',
      'DataFabricacaoInsumo',
      'QtdInsumoUtilizada',
      'UnidadeInsumo',
      'CustoUnitarioInsumo',
      'CustoTotalInsumo',
      'DetalhesObservacoesInsumo',
      'QtdAnexosInsumo',
    ].join(',')

    const rows: string[] = []

    filteredBatches.forEach((b) => {
      const items = b.items || []
      const { totalCost, unitCost } = getBatchCostInfo(b)
      const costLoteStr = totalCost > 0 ? totalCost.toFixed(2) : '0.00'
      const costUnitStr = unitCost != null ? unitCost.toFixed(2) : '0.00'
      const isPublicStr = b.is_public ? 'SIM' : 'NAO'
      const tokenStr = b.public_token || ''

      if (items.length === 0) {
        rows.push(
          [
            `"${formatDatePtBr(b.production_date)}"`,
            `"${b.batch_number}"`,
            `"${b.status}"`,
            `"${isPublicStr}"`,
            `"${tokenStr}"`,
            `"${b.product_name || b.expand?.product_id?.name || ''}"`,
            `"${b.quantity_produced ?? 0}"`,
            `"${costLoteStr}"`,
            `"${costUnitStr}"`,
            '""',
            '""',
            '""',
            '""',
            '""',
            '""',
            '""',
            '"0.00"',
            '"0.00"',
            `"${(b.notes || '').replace(/"/g, '""')}"`,
            '"0"',
          ].join(','),
        )
      } else {
        items.forEach((it) => {
          const itTotal =
            it.total_cost != null && it.total_cost > 0
              ? it.total_cost
              : (it.unit_cost || 0) * (it.quantity_used || 0)
          const itUnit = it.unit_cost || 0

          rows.push(
            [
              `"${formatDatePtBr(b.production_date)}"`,
              `"${b.batch_number}"`,
              `"${b.status}"`,
              `"${isPublicStr}"`,
              `"${tokenStr}"`,
              `"${b.product_name || b.expand?.product_id?.name || ''}"`,
              `"${b.quantity_produced ?? 0}"`,
              `"${costLoteStr}"`,
              `"${costUnitStr}"`,
              `"${it.item_name}"`,
              `"${it.grammage_type || ''}"`,
              `"${it.grammage_value ?? ''}"`,
              `"${it.supplier_batch_number || ''}"`,
              `"${it.manufacture_date ? formatDatePtBr(it.manufacture_date) : ''}"`,
              `"${it.quantity_used}"`,
              `"${it.unit_measure || 'un'}"`,
              `"${itUnit.toFixed(2)}"`,
              `"${itTotal.toFixed(2)}"`,
              `"${(it.notes || '').replace(/"/g, '""')}"`,
              `"${it.attachments?.length || 0}"`,
            ].join(','),
          )
        })
      }
    })

    const csvContent = headers + '\n' + rows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute(
      'download',
      `relatorio_producao_${new Date().toISOString().split('T')[0]}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Layers className="w-6 h-6 text-emerald-600" />
            Controle de Produção & Rastreabilidade de Lote
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Abertura de lotes com baixa no estoque de insumos, gramatura, anexos por foto e busca
            completa.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Alternador de Abas */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab('lotes')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                activeTab === 'lotes'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Lotes de Produção
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('relatorios')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                activeTab === 'relatorios'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Relatórios & Busca
            </button>
          </div>

          <Button
            variant="outline"
            onClick={handleExportCsv}
            disabled={batches.length === 0}
            className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold h-9"
            title="Exportar dados de produção e insumos para CSV"
          >
            <Download className="w-4 h-4 mr-1.5 text-emerald-600" /> Exportar CSV
          </Button>

          <Button
            onClick={handleOpenCreateModal}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold h-9 px-4 shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Abertura de Lote
          </Button>
        </div>
      </div>

      {/* Mini Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">
            Total de Lotes Registrados
          </span>
          <p className="text-xl font-bold font-mono text-slate-900 mt-1">{totalLotes}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">
            Lotes Finalizados (Estoque Baixado)
          </span>
          <p className="text-xl font-bold font-mono text-emerald-700 mt-1">{lotesFinalizados}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">Insumos Rastreados</span>
          <p className="text-xl font-bold font-mono text-slate-900 mt-1">
            {totalInsumosUtilizados}
          </p>
        </div>
      </div>

      {/* Filtros e Busca Completa */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <Input
            placeholder="Buscar por lote, insumo, lote do fornecedor, gramatura..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 border-slate-200 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
            <SelectTrigger className="w-36 h-10 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos os Status</SelectItem>
              <SelectItem value="finalizado">Finalizados</SelectItem>
              <SelectItem value="aberto">Abertos</SelectItem>
            </SelectContent>
          </Select>

          <Select value={periodFilter} onValueChange={(val: any) => setPeriodFilter(val)}>
            <SelectTrigger className="w-36 h-10 text-xs">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todo o Período</SelectItem>
              <SelectItem value="Hoje">Hoje</SelectItem>
              <SelectItem value="30dias">Últimos 30 dias</SelectItem>
              <SelectItem value="Mes">Este Mês</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Conteúdo Principal */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
          <p className="text-sm">Carregando lotes de produção...</p>
        </div>
      ) : filteredBatches.length === 0 ? (
        <EmptyState
          icon={<Layers className="w-8 h-8" />}
          title="Nenhum lote de produção encontrado"
          description={
            searchTerm
              ? 'Nenhum resultado corresponde à sua busca. Tente buscar por outro termo ou limpe os filtros.'
              : 'Registre seu primeiro lote de produção para rastrear insumos, medidas e anexos.'
          }
          actionLabel="+ Abertura de Lote"
          onAction={handleOpenCreateModal}
        />
      ) : activeTab === 'lotes' ? (
        /* ABA 1: VISÃO GERAL DE LOTES */
        <>
          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filteredBatches.map((batch) => {
              const items = batch.items || []
              const totalAttachments = items.reduce(
                (sum, it) => sum + (it.attachments?.length || 0),
                0,
              )
              const { totalCost, unitCost } = getBatchCostInfo(batch)

              return (
                <div
                  key={batch.id}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-medium text-slate-400">
                        {formatDatePtBr(batch.production_date)}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 font-mono mt-0.5">
                        {batch.batch_number}
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {batch.product_name || batch.expand?.product_id?.name || 'Produto Geral'}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <Badge
                        className={
                          batch.status === 'finalizado'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }
                      >
                        {batch.status === 'finalizado' ? 'Finalizado' : 'Aberto'}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => handleTogglePublic(batch)}
                        disabled={togglingPublicId === batch.id}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                          batch.is_public
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                        }`}
                        title="Alternar Consulta Pública"
                      >
                        <Globe className="w-3 h-3" />
                        {batch.is_public ? 'Pública: SIM' : 'Pública: NÃO'}
                      </button>
                    </div>
                  </div>

                  {/* Bloco de Custo do Lote */}
                  <div className="grid grid-cols-2 gap-2 bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200/80 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-emerald-800 block flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-emerald-600" /> Custo Total
                      </span>
                      <span className="font-mono font-bold text-emerald-700 text-sm">
                        {formatCurrency(totalCost)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                        Custo / Unidade
                      </span>
                      <span className="font-mono font-semibold text-emerald-900 text-xs">
                        {unitCost != null ? `${formatCurrency(unitCost)} / un` : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Resumo de Insumos */}
                  <div className="text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1">
                    <span className="font-semibold text-slate-600 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Package className="w-3.5 h-3.5 text-emerald-600" />
                        Insumos ({items.length}):
                      </span>
                      {totalAttachments > 0 && (
                        <span className="text-[10px] text-teal-700 font-mono">
                          {totalAttachments} anexo(s)
                        </span>
                      )}
                    </span>
                    <p className="text-slate-500 truncate text-[11px]">
                      {items.map((it) => it.item_name).join(', ') || 'Nenhum insumo'}
                    </p>
                  </div>

                  {/* Link público quando ativo */}
                  {batch.is_public && batch.public_token && (
                    <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-emerald-200 text-[11px]">
                      <span className="text-emerald-800 font-medium flex items-center gap-1">
                        <Globe className="w-3 h-3 text-emerald-600" /> Link de Consulta
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyPublicLink(batch.public_token)}
                          className="h-6 px-2 text-[10px] text-emerald-700 hover:bg-emerald-50"
                        >
                          {copiedToken === batch.public_token ? (
                            <>
                              <Check className="w-3 h-3 mr-1 text-emerald-600" /> Copiado!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 mr-1" /> Copiar Link
                            </>
                          )}
                        </Button>
                        <a
                          href={`/consulta-lote/${batch.public_token}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-6 px-2 inline-flex items-center text-[10px] text-emerald-700 hover:text-emerald-800"
                          title="Abrir página pública"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Ações */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setInspectBatch(batch)
                        setIsInspectOpen(true)
                      }}
                      className="text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 p-0 h-auto font-semibold flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> Ver Ficha Completa
                    </Button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(batch)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition"
                        title="Editar lote"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTargetBatch(batch)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                        title="Excluir lote"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Data Produção</th>
                    <th className="py-3 px-4">Lote Fabricado</th>
                    <th className="py-3 px-4">Produto & Quantidade</th>
                    <th className="py-3 px-4">Insumos Utilizados</th>
                    <th className="py-3 px-4 text-right">Custo Total / Unit.</th>
                    <th className="py-3 px-4 text-center">Consulta Pública</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredBatches.map((batch) => {
                    const items = batch.items || []
                    const totalAttachments = items.reduce(
                      (sum, it) => sum + (it.attachments?.length || 0),
                      0,
                    )
                    const { totalCost, unitCost } = getBatchCostInfo(batch)

                    return (
                      <tr key={batch.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                          {formatDatePtBr(batch.production_date)}
                        </td>

                        <td className="py-3 px-4 font-bold font-mono text-slate-900 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setInspectBatch(batch)
                              setIsInspectOpen(true)
                            }}
                            className="hover:text-emerald-700 hover:underline flex items-center gap-1.5"
                            title="Clique para ver a ficha completa de rastreabilidade"
                          >
                            <span>{batch.batch_number}</span>
                            <Eye className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                        </td>

                        <td className="py-3 px-4 text-slate-700 max-w-[190px]">
                          <p className="truncate font-medium">
                            {batch.product_name ||
                              batch.expand?.product_id?.name ||
                              'Produto Geral'}
                          </p>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {batch.quantity_produced ?? 0} un. produzidas
                          </span>
                        </td>

                        <td className="py-3 px-4 text-slate-600 max-w-[220px]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-semibold">
                              <Package className="w-2.5 h-2.5" /> {items.length} insumo(s)
                            </span>
                            {totalAttachments > 0 && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded font-mono">
                                <ImageIcon className="w-2.5 h-2.5" /> {totalAttachments} anexo(s)
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {items.map((it) => it.item_name).join(', ')}
                          </p>
                        </td>

                        {/* Coluna Custo Total / Unitário */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <span className="font-mono font-bold text-emerald-700 block">
                            {formatCurrency(totalCost)}
                          </span>
                          {unitCost != null ? (
                            <span className="text-[10px] text-slate-500 font-mono block">
                              {formatCurrency(unitCost)}/un
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 block">—</span>
                          )}
                        </td>

                        {/* Coluna Consulta Pública (Alternar SIM/NÃO + Copiar) */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex flex-col items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleTogglePublic(batch)}
                              disabled={togglingPublicId === batch.id}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                                batch.is_public
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                              }`}
                              title={
                                batch.is_public
                                  ? 'Clique para desativar o acesso público'
                                  : 'Clique para ativar a consulta pública'
                              }
                            >
                              {batch.is_public ? (
                                <>
                                  <ToggleRight className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>SIM</span>
                                </>
                              ) : (
                                <>
                                  <ToggleLeft className="w-3.5 h-3.5 text-slate-400" />
                                  <span>NÃO</span>
                                </>
                              )}
                            </button>

                            {batch.is_public && batch.public_token && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleCopyPublicLink(batch.public_token)}
                                  className="text-[10px] text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-0.5 hover:underline"
                                  title="Copiar URL pública do lote"
                                >
                                  {copiedToken === batch.public_token ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-600" /> Copiado!
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" /> Copiar link
                                    </>
                                  )}
                                </button>
                                <a
                                  href={`/consulta-lote/${batch.public_token}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-slate-400 hover:text-emerald-700"
                                  title="Abrir página pública em nova aba"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <Badge
                            className={
                              batch.status === 'finalizado'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }
                          >
                            {batch.status === 'finalizado' ? 'Finalizado' : 'Aberto'}
                          </Badge>
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setInspectBatch(batch)
                                setIsInspectOpen(true)
                              }}
                              className="p-1.5 rounded text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition"
                              title="Ver ficha completa do lote"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(batch)}
                              className="p-1.5 rounded text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition"
                              title="Editar lote"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTargetBatch(batch)}
                              className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                              title="Excluir lote"
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
      ) : (
        /* ABA 2: RELATÓRIO COMPLETO COM INSUMOS DETALHADOS LINHA A LINHA */
        <div className="space-y-4">
          <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3 flex items-start gap-2 text-xs text-emerald-900">
            <Layers className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Relatório de Rastreabilidade Total:</span>
              <span className="text-[11px] text-emerald-800">
                Lista detalhada de cada insumo utilizado em cada lote com número de série do
                fabricante, tipo de gramatura e valor, data de fabricação, quantidade consumida e
                anexos.
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Data / Lote Produção</th>
                    <th className="py-2.5 px-3">Insumo Utilizado</th>
                    <th className="py-2.5 px-3">Gramatura / Medida</th>
                    <th className="py-2.5 px-3">Lote Insumo</th>
                    <th className="py-2.5 px-3">Fabricação Insumo</th>
                    <th className="py-2.5 px-3 text-right">Qtd Consumida</th>
                    <th className="py-2.5 px-3 text-right">Custo Insumo</th>
                    <th className="py-2.5 px-3">Observações / Anexos</th>
                    <th className="py-2.5 px-3 text-right">Ficha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredBatches.flatMap((batch) => {
                    const items = batch.items || []
                    if (items.length === 0) {
                      return [
                        <tr key={batch.id} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="font-bold font-mono text-slate-900 block">
                              {batch.batch_number}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {formatDatePtBr(batch.production_date)}
                            </span>
                          </td>
                          <td colSpan={7} className="py-2.5 px-3 text-slate-400 italic">
                            Sem insumos cadastrados
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => {
                                setInspectBatch(batch)
                                setIsInspectOpen(true)
                              }}
                              className="text-emerald-700 hover:text-emerald-800"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>,
                      ]
                    }

                    return items.map((item, itemIdx) => (
                      <tr
                        key={`${batch.id}-${item.id || itemIdx}`}
                        className="hover:bg-slate-50/60"
                      >
                        {itemIdx === 0 ? (
                          <td
                            rowSpan={items.length}
                            className="py-2.5 px-3 whitespace-nowrap align-top border-r border-slate-100 bg-slate-50/30"
                          >
                            <span className="font-bold font-mono text-slate-900 block">
                              {batch.batch_number}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              {formatDatePtBr(batch.production_date)}
                            </span>
                            <Badge
                              className={`mt-1 text-[9px] ${
                                batch.status === 'finalizado'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {batch.status}
                            </Badge>

                            {/* Custo total do lote no agrupamento da linha */}
                            <div className="mt-2 pt-1 border-t border-slate-200/70 text-[10px]">
                              <span className="text-slate-400 uppercase font-semibold block text-[9px]">
                                Custo Lote:
                              </span>
                              <span className="font-mono font-bold text-emerald-700">
                                {formatCurrency(getBatchCostInfo(batch).totalCost)}
                              </span>
                            </div>

                            {/* Consulta pública badge */}
                            <div className="mt-1">
                              <span
                                className={`inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.2 rounded ${
                                  batch.is_public
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                <Globe className="w-2.5 h-2.5" />
                                {batch.is_public ? 'Pública' : 'Privada'}
                              </span>
                            </div>
                          </td>
                        ) : null}

                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {item.item_name}
                          {item.product_id && (
                            <span className="block text-[10px] font-normal text-emerald-700">
                              Baixa no Estoque
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-slate-700">
                          {item.grammage_value != null && item.grammage_value > 0
                            ? `${item.grammage_value} ${item.grammage_type || 'g/m²'}`
                            : item.grammage_type || '-'}
                        </td>

                        <td className="py-2.5 px-3 font-mono text-slate-700">
                          {item.supplier_batch_number || '-'}
                        </td>

                        <td className="py-2.5 px-3 text-slate-600">
                          {item.manufacture_date ? formatDatePtBr(item.manufacture_date) : '-'}
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {item.quantity_used} {item.unit_measure || 'un'}
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono text-slate-800 whitespace-nowrap">
                          <span className="block font-semibold">
                            {formatCurrency(
                              item.total_cost != null && item.total_cost > 0
                                ? item.total_cost
                                : (item.unit_cost || 0) * (item.quantity_used || 0),
                            )}
                          </span>
                          {item.unit_cost != null && item.unit_cost > 0 && (
                            <span className="block text-[10px] text-slate-400">
                              {formatCurrency(item.unit_cost)}/un
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-slate-600 max-w-[200px]">
                          {item.notes && <p className="truncate text-[11px]">{item.notes}</p>}
                          {item.attachments && item.attachments.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-teal-700 font-mono">
                              <ImageIcon className="w-2.5 h-2.5" /> {item.attachments.length}{' '}
                              anexo(s)
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => {
                              setInspectBatch(batch)
                              setIsInspectOpen(true)
                            }}
                            className="p-1 text-slate-400 hover:text-emerald-700 transition"
                            title="Ver ficha"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ficha Completa do Lote (Rastreabilidade) */}
      <BatchDetailModal
        batch={inspectBatch}
        isOpen={isInspectOpen}
        onClose={() => setIsInspectOpen(false)}
        company={company}
      />

      {/* Modal Abertura / Edição de Lote de Produção */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-[96vw] sm:max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white">
          <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-white">
                  {editingBatch ? 'Editar Lote de Produção' : 'Abertura de Lote de Produção'}
                </DialogTitle>
                <p className="text-xs text-slate-400 mt-0.5">
                  Cadastre a produção com baixa nos insumos do estoque e rastreabilidade
                  individualizada.
                </p>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSubmitBatch}
            className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs"
          >
            {formErrors && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <span>{formErrors}</span>
              </div>
            )}

            {/* SEÇÃO 1: CABEÇALHO DO LOTE */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                Identificação do Lote Fabricado
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="batchNumber" className="text-xs font-semibold text-slate-700">
                    Número do Lote <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="batchNumber"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    placeholder="Ex: LOTE-2025-0001"
                    className="h-9 text-xs font-mono font-bold"
                    required
                  />
                  <span className="text-[10px] text-slate-400">
                    Gerado automaticamente, mas totalmente editável.
                  </span>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="productionDate" className="text-xs font-semibold text-slate-700">
                    Data da Produção <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="productionDate"
                    type="date"
                    value={productionDate}
                    onChange={(e) => setProductionDate(e.target.value)}
                    className="h-9 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="batchStatus" className="text-xs font-semibold text-slate-700">
                    Status do Lote <span className="text-red-500">*</span>
                  </Label>
                  <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                    <SelectTrigger className="h-9 text-xs bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="finalizado">
                        Finalizado (Aplica baixa automática no estoque)
                      </SelectItem>
                      <SelectItem value="aberto">
                        Aberto (Rascunho de produção em andamento)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Produto Fabricado (Opcional - Apenas Rastreabilidade)
                  </Label>
                  <div className="flex gap-2">
                    <Select
                      value={selectedProductId}
                      onValueChange={(val) => {
                        setSelectedProductId(val)
                        if (val !== 'livre') {
                          const p = products.find((prod) => prod.id === val)
                          if (p) setProductName(p.name)
                        }
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs bg-white flex-1">
                        <SelectValue placeholder="Selecione um produto do catálogo ou personalize" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="livre">Digitar nome livremente</SelectItem>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} {p.sku ? `(SKU: ${p.sku})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {selectedProductId === 'livre' && (
                      <Input
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        placeholder="Nome do produto acabado"
                        className="h-9 text-xs flex-1 bg-white"
                      />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    * O produto fabricado NÃO entra no estoque automaticamente (serve apenas como
                    registro de rastreabilidade).
                  </span>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Quantidade Fabricada
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    value={quantityProduced}
                    onChange={(e) => setQuantityProduced(e.target.value)}
                    className="h-9 text-xs font-mono bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Observações Gerais da Produção
                </Label>
                <Input
                  value={batchNotes}
                  onChange={(e) => setBatchNotes(e.target.value)}
                  placeholder="Ex: Turno da manhã, máquina 02, operador João"
                  className="h-9 text-xs bg-white"
                />
              </div>
            </div>

            {/* SEÇÃO 2: INSUMOS UTILIZADOS PARA PRODUZIR O LOTE */}
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-emerald-600" />
                    Insumos Utilizados no Lote ({itemsDraft.length})
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Selecione insumos do estoque atual (com baixa automática) ou insumos externos,
                    informe medidas/gramatura, custo unitário e fotos/anexos.
                  </p>
                </div>

                {/* Resumo dinâmico do custo calculado no formulário */}
                <div className="flex items-center gap-3">
                  <div className="text-right bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                    <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                      Custo Total Calculado
                    </span>
                    <span className="font-mono font-bold text-emerald-700 text-sm">
                      {formatCurrency(
                        itemsDraft.reduce(
                          (sum, it) =>
                            sum +
                            (parseFloat(it.quantity_used.replace(',', '.')) || 0) *
                              (parseFloat(it.unit_cost ? it.unit_cost.replace(',', '.') : '0') ||
                                0),
                          0,
                        ),
                      )}
                    </span>
                  </div>

                  <Button
                    type="button"
                    onClick={handleAddDraftItem}
                    variant="outline"
                    size="sm"
                    className="text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 h-8"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Insumo
                  </Button>
                </div>
              </div>

              {/* Lista de Insumos */}
              <div className="space-y-4">
                {itemsDraft.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 sm:p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-2xs relative"
                  >
                    {/* Linha 1: Cabeçalho do Insumo e Seleção do Estoque */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center justify-center border border-emerald-200 shrink-0">
                          {idx + 1}
                        </span>

                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <Select
                              value={item.product_id || 'externo'}
                              onValueChange={(val) => handleSelectProductForDraftItem(idx, val)}
                            >
                              <SelectTrigger className="h-8 text-xs bg-slate-50">
                                <SelectValue placeholder="Puxar do Estoque Atual..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="externo">
                                  Insumo Avulso / Externo (Sem vínculo de estoque)
                                </SelectItem>
                                {products.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.name} — Estoque atual: {p.quantity} un.
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Input
                              value={item.item_name}
                              onChange={(e) =>
                                handleUpdateDraftItem(idx, { item_name: e.target.value })
                              }
                              placeholder="Nome do insumo *"
                              className="h-8 text-xs font-semibold"
                              required
                            />
                          </div>
                        </div>
                      </div>

                      {itemsDraft.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveDraftItem(idx)}
                          className="p-1 text-slate-400 hover:text-red-600 transition"
                          title="Remover este insumo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Linha 2: Gramatura, Lote do Insumo, Fabricação, Quantidade e Custo */}
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                      {/* Tipo de Gramatura */}
                      <div>
                        <Label className="text-[10px] font-semibold text-slate-600 uppercase">
                          Tipo de Gramatura
                        </Label>
                        <Select
                          value={item.grammage_type}
                          onValueChange={(val) =>
                            handleUpdateDraftItem(idx, { grammage_type: val })
                          }
                        >
                          <SelectTrigger className="h-8 text-xs bg-white mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {GRAMMAGE_OPTIONS.map((g) => (
                              <SelectItem key={g} value={g.split(' ')[0]}>
                                {g}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Valor Numérico da Gramatura */}
                      <div>
                        <Label className="text-[10px] font-semibold text-slate-600 uppercase">
                          Valor Medida
                        </Label>
                        <Input
                          type="number"
                          step="any"
                          value={item.grammage_value}
                          onChange={(e) =>
                            handleUpdateDraftItem(idx, { grammage_value: e.target.value })
                          }
                          placeholder="Ex: 250"
                          className="h-8 text-xs font-mono mt-1"
                        />
                      </div>

                      {/* Lote do Insumo / Fornecedor */}
                      <div>
                        <Label className="text-[10px] font-semibold text-slate-600 uppercase">
                          Lote do Insumo
                        </Label>
                        <Input
                          value={item.supplier_batch_number}
                          onChange={(e) =>
                            handleUpdateDraftItem(idx, {
                              supplier_batch_number: e.target.value,
                            })
                          }
                          placeholder="Ex: BOB-998"
                          className="h-8 text-xs font-mono mt-1"
                        />
                      </div>

                      {/* Data de Fabricação do Insumo */}
                      <div>
                        <Label className="text-[10px] font-semibold text-slate-600 uppercase">
                          Data Fabricação
                        </Label>
                        <Input
                          type="date"
                          value={item.manufacture_date}
                          onChange={(e) =>
                            handleUpdateDraftItem(idx, { manufacture_date: e.target.value })
                          }
                          className="h-8 text-xs mt-1"
                        />
                      </div>

                      {/* Quantidade Utilizada */}
                      <div>
                        <Label className="text-[10px] font-semibold text-slate-600 uppercase">
                          Qtd Utilizada <span className="text-red-500">*</span>
                        </Label>
                        <div className="flex gap-1 mt-1">
                          <Input
                            type="number"
                            step="any"
                            min="0.001"
                            value={item.quantity_used}
                            onChange={(e) =>
                              handleUpdateDraftItem(idx, { quantity_used: e.target.value })
                            }
                            placeholder="Qtd"
                            className="h-8 text-xs font-mono font-bold flex-1"
                            required
                          />
                          <Input
                            value={item.unit_measure}
                            onChange={(e) =>
                              handleUpdateDraftItem(idx, { unit_measure: e.target.value })
                            }
                            placeholder="un"
                            className="h-8 text-xs w-11 text-center"
                          />
                        </div>
                      </div>

                      {/* Custo Unitário do Insumo (R$) */}
                      <div>
                        <Label className="text-[10px] font-semibold text-slate-600 uppercase flex items-center justify-between">
                          <span>Custo Unit. (R$)</span>
                        </Label>
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          value={item.unit_cost}
                          onChange={(e) =>
                            handleUpdateDraftItem(idx, { unit_cost: e.target.value })
                          }
                          placeholder="0.00"
                          className="h-8 text-xs font-mono mt-1"
                        />
                        <span className="text-[9px] text-slate-400 font-mono block mt-0.5 text-right">
                          Total:{' '}
                          {formatCurrency(
                            (parseFloat(item.quantity_used.replace(',', '.')) || 0) *
                              (parseFloat(item.unit_cost.replace(',', '.')) || 0),
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Linha 3: Detalhes e Observações de Individualização */}
                    <div>
                      <Label className="text-[10px] font-semibold text-slate-600 uppercase">
                        Demais detalhes pertinentes para individualizar e reconhecer os dados
                        completos do lote utilizado:
                      </Label>
                      <Input
                        value={item.notes}
                        onChange={(e) => handleUpdateDraftItem(idx, { notes: e.target.value })}
                        placeholder="Ex: Bobina lacrada de bobinagem interna, certificado de procedência nº 489, tonalidade pantone 348C..."
                        className="h-8 text-xs mt-1"
                      />
                    </div>

                    {/* Linha 4: Upload de Arquivos / Fotos por Insumo */}
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-700 uppercase flex items-center gap-1">
                          <UploadCloud className="w-3.5 h-3.5 text-emerald-600" />
                          Anexos do Insumo (Fotos da Etiqueta/Bobina, Certificados, PDFs)
                        </span>

                        <label className="cursor-pointer text-[11px] font-medium text-emerald-700 bg-white hover:bg-emerald-50 px-2.5 py-1 rounded border border-emerald-300 inline-flex items-center gap-1 transition shadow-2xs">
                          <Plus className="w-3 h-3" />
                          <span>Anexar Arquivo/Foto</span>
                          <input
                            type="file"
                            multiple
                            accept="image/*, application/pdf, .doc, .docx, .txt"
                            onChange={(e) => handleFilesSelected(idx, e.target.files)}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {/* Listagem de arquivos existentes e novos */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {item.existingFiles.map((fileName, fIdx) => (
                          <div
                            key={`exist-${fIdx}`}
                            className="flex items-center gap-1.5 bg-white px-2 py-1 rounded border border-slate-200 text-[10px] font-mono text-slate-700 shadow-2xs"
                          >
                            <File className="w-3 h-3 text-emerald-600" />
                            <span className="max-w-[140px] truncate" title={fileName}>
                              {fileName}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveExistingFile(idx, fileName)}
                              className="text-slate-400 hover:text-red-600 transition"
                              title="Remover arquivo"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}

                        {item.newFiles.map((file, fIdx) => (
                          <div
                            key={`new-${fIdx}`}
                            className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-2 py-1 rounded border border-emerald-200 text-[10px] font-mono shadow-2xs"
                          >
                            <ImageIcon className="w-3 h-3 text-emerald-600" />
                            <span className="max-w-[140px] truncate" title={file.name}>
                              {file.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveNewFile(idx, fIdx)}
                              className="text-emerald-700 hover:text-red-600 transition"
                              title="Remover novo arquivo"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}

                        {item.existingFiles.length === 0 && item.newFiles.length === 0 && (
                          <span className="text-[10px] text-slate-400 italic">
                            Nenhum anexo incluído para este insumo.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="bg-slate-50 border-t border-slate-200 p-3 sm:px-4 flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Salvando Lote...
                  </>
                ) : editingBatch ? (
                  'Salvar Alterações do Lote'
                ) : (
                  'Confirmar Abertura do Lote'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão */}
      <Dialog open={!!deleteTargetBatch} onOpenChange={() => setDeleteTargetBatch(null)}>
        <DialogContent className="w-[92vw] sm:max-w-[400px] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Excluir Lote {deleteTargetBatch?.batch_number}?
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-500">
            Tem certeza de que deseja remover este lote de produção? Se o lote estava finalizado, as
            quantidades de insumos baixadas serão automaticamente devolvidas ao estoque atual.
          </p>
          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTargetBatch(null)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteBatch}
              disabled={deleting}
              className="text-xs"
            >
              {deleting ? 'Excluindo...' : 'Confirmar Exclusão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Producao
