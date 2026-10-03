import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Trophy,
  Medal,
  Award,
  Crown,
  Star,
  Shield,
  Gem,
  Plus,
  Trash2,
  Edit2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  HelpCircle,
  Users,
  ShoppingCart,
  TrendingUp,
  Info,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Percent,
  Sliders,
  DollarSign,
  Calendar,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import {
  getLoyaltyTiers,
  createLoyaltyTier,
  updateLoyaltyTier,
  deleteLoyaltyTier,
  createDefaultLoyaltyTiers,
  getCustomers,
  getSales,
} from '@/services/erp'
import type {
  LoyaltyTier,
  LoyaltyCriterionType,
  LoyaltyBadgeIcon,
  LoyaltyBadgeColor,
  Customer,
  Sale,
} from '@/types/erp'
import { formatCurrency } from '@/lib/formatters'
import {
  calculateCustomerMetrics,
  evaluateCustomerLoyalty,
  formatCriterionValue,
  getCriterionLabel,
} from '@/lib/loyalty'
import { LoyaltyBadge, LOYALTY_ICON_MAP } from '@/components/LoyaltyBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/EmptyState'
import { Badge } from '@/components/ui/badge'

const CRITERIA_OPTIONS: {
  value: LoyaltyCriterionType
  label: string
  description: string
  unit: string
  example: string
}[] = [
  {
    value: 'total_spent',
    label: 'Valor Total Gasto (R$)',
    description: 'Soma total em reais de todas as compras faturadas/concluídas.',
    unit: 'R$',
    example: 'Ex.: R$ 500 para Prata, R$ 1.500 para Ouro',
  },
  {
    value: 'sales_count',
    label: 'Quantidade de Compras Concluídas',
    description: 'Número de compras concluídas que o cliente já realizou na empresa.',
    unit: 'compras',
    example: 'Ex.: 3 compras para Prata, 10 compras para Diamante',
  },
  {
    value: 'average_ticket',
    label: 'Ticket Médio por Compra (R$)',
    description: 'Valor médio que o cliente gasta em cada pedido realizado.',
    unit: 'R$',
    example: 'Ex.: Média de R$ 200 por pedido para clientes Premium',
  },
  {
    value: 'days_recent',
    label: 'Recência de Compra (Últimos X dias)',
    description:
      'Garante a faixa para quem comprou recentemente (ex: última compra há no máximo 30 dias).',
    unit: 'dias',
    example: 'Ex.: Última compra há 30 dias ou menos',
  },
]

const ICON_OPTIONS: { value: LoyaltyBadgeIcon; label: string }[] = [
  { value: 'trophy', label: 'Troféu' },
  { value: 'medal', label: 'Medalha' },
  { value: 'award', label: 'Condecoração' },
  { value: 'crown', label: 'Coroa VIP' },
  { value: 'star', label: 'Estrela' },
  { value: 'shield', label: 'Escudo' },
  { value: 'gem', label: 'Diamante / Joia' },
]

const COLOR_OPTIONS: { value: LoyaltyBadgeColor; label: string; previewClass: string }[] = [
  { value: 'amber', label: 'Bronze / Âmbar', previewClass: 'bg-amber-500' },
  { value: 'slate', label: 'Prata / Cinza Metálico', previewClass: 'bg-slate-400' },
  { value: 'yellow', label: 'Ouro / Dourado', previewClass: 'bg-yellow-400' },
  { value: 'cyan', label: 'Diamante / Turquesa', previewClass: 'bg-cyan-400' },
  { value: 'emerald', label: 'Esmeralda / Platina', previewClass: 'bg-emerald-500' },
  { value: 'violet', label: 'Ametista / Roxo VIP', previewClass: 'bg-violet-500' },
  { value: 'rose', label: 'Rubi / Rosé', previewClass: 'bg-rose-500' },
  { value: 'blue', label: 'Safira / Azul Royal', previewClass: 'bg-blue-600' },
]

export const Fidelidade: React.FC = () => {
  const navigate = useNavigate()
  const { company } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [tiers, setTiers] = useState<LoyaltyTier[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [sales, setSales] = useState<Sale[]>([])

  // Modal de criação / edição de faixa
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTier, setEditingTier] = useState<LoyaltyTier | null>(null)
  const [name, setName] = useState('')
  const [criterionType, setCriterionType] = useState<LoyaltyCriterionType>('total_spent')
  const [minValue, setMinValue] = useState<number>(0)
  const [badgeIcon, setBadgeIcon] = useState<LoyaltyBadgeIcon>('trophy')
  const [badgeColor, setBadgeColor] = useState<LoyaltyBadgeColor>('amber')
  const [description, setDescription] = useState('')
  const [benefits, setBenefits] = useState('')
  const [discountPercent, setDiscountPercent] = useState<number>(0)
  const [submitting, setSubmitting] = useState(false)

  // Modal de exclusão
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  // Carregar dados
  const loadData = useCallback(async () => {
    if (!company) return
    try {
      setLoading(true)
      const [tiersData, custData, salesData] = await Promise.all([
        getLoyaltyTiers(company.id),
        getCustomers(company.id).catch(() => [] as Customer[]),
        getSales(company.id).catch(() => [] as Sale[]),
      ])
      setTiers(tiersData)
      setCustomers(custData)
      setSales(salesData)
    } catch (err: any) {
      console.error('Erro ao carregar programa de fidelidade:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar dados',
        description: err?.message,
      })
    } finally {
      setLoading(false)
    }
  }, [company, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('loyalty_tiers', () => loadData(), !!company)
  useRealtime('sales', () => loadData(), !!company)
  useRealtime('customers', () => loadData(), !!company)

  // Criar faixas padrão se não houver nenhuma
  const handleCreateDefaults = async () => {
    if (!company) return
    try {
      setSubmitting(true)
      await createDefaultLoyaltyTiers(company.id)
      toast({
        title: 'Faixas padrão criadas!',
        description: 'Bronze, Prata, Ouro e Diamante foram adicionadas com sucesso.',
      })
      await loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar faixas padrão',
        description: err?.message,
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Abrir modal para nova faixa
  const openCreateModal = () => {
    setEditingTier(null)
    const nextOrder = (tiers[tiers.length - 1]?.tier_order || 0) + 1
    setName(`Nível ${nextOrder}`)
    setCriterionType('total_spent')
    setMinValue(nextOrder * 500)
    setBadgeIcon(nextOrder === 1 ? 'shield' : nextOrder === 2 ? 'medal' : 'trophy')
    setBadgeColor(nextOrder === 1 ? 'amber' : nextOrder === 2 ? 'slate' : 'yellow')
    setDescription('')
    setBenefits('')
    setDiscountPercent(0)
    setIsModalOpen(true)
  }

  // Abrir modal para editar faixa
  const openEditModal = (t: LoyaltyTier) => {
    setEditingTier(t)
    setName(t.name)
    setCriterionType(t.criterion_type)
    setMinValue(t.min_value)
    setBadgeIcon(t.badge_icon)
    setBadgeColor(t.badge_color)
    setDescription(t.description || '')
    setBenefits(t.benefits || '')
    setDiscountPercent(t.discount_percent || 0)
    setIsModalOpen(true)
  }

  // Salvar faixa (criação ou edição)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!company) return

    if (!name.trim()) {
      toast({ variant: 'destructive', title: 'Nome da faixa é obrigatório' })
      return
    }

    try {
      setSubmitting(true)
      if (editingTier) {
        await updateLoyaltyTier(editingTier.id, {
          name: name.trim(),
          criterion_type: criterionType,
          min_value: Number(minValue) || 0,
          badge_icon: badgeIcon,
          badge_color: badgeColor,
          description: description.trim(),
          benefits: benefits.trim(),
          discount_percent: Number(discountPercent) || 0,
        })
        toast({ title: 'Faixa de fidelidade atualizada com sucesso!' })
      } else {
        const nextOrder = (tiers[tiers.length - 1]?.tier_order || 0) + 1
        await createLoyaltyTier({
          company_id: company.id,
          name: name.trim(),
          criterion_type: criterionType,
          min_value: Number(minValue) || 0,
          tier_order: nextOrder,
          badge_icon: badgeIcon,
          badge_color: badgeColor,
          description: description.trim(),
          benefits: benefits.trim(),
          discount_percent: Number(discountPercent) || 0,
        })
        toast({ title: 'Nova faixa adicionada com sucesso!' })
      }
      setIsModalOpen(false)
      await loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar faixa',
        description: err?.message,
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Excluir faixa
  const handleDelete = async () => {
    if (!deleteTargetId) return
    try {
      await deleteLoyaltyTier(deleteTargetId)
      toast({ title: 'Faixa removida com sucesso' })
      setDeleteTargetId(null)
      await loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao remover faixa',
        description: err?.message,
      })
    }
  }

  // Reordenar faixas
  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= tiers.length) return

    const current = tiers[index]
    const target = tiers[targetIndex]

    try {
      await Promise.all([
        updateLoyaltyTier(current.id, { tier_order: target.tier_order }),
        updateLoyaltyTier(target.id, { tier_order: current.tier_order }),
      ])
      await loadData()
    } catch (err: any) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao reordenar faixas',
        description: err?.message,
      })
    }
  }

  // Estatísticas de distribuição dos clientes nas faixas
  const distribution = React.useMemo(() => {
    if (tiers.length === 0 || customers.length === 0) {
      return { counts: {}, evaluatedCustomers: [] }
    }

    // Mapear vendas por cliente
    const salesByCustomer: Record<string, Sale[]> = {}
    sales.forEach((s) => {
      if (!s.customer_id) return
      if (!salesByCustomer[s.customer_id]) salesByCustomer[s.customer_id] = []
      salesByCustomer[s.customer_id].push(s)
    })

    const counts: Record<string, number> = { 'sem-faixa': 0 }
    tiers.forEach((t) => (counts[t.id] = 0))

    const evaluatedCustomers = customers.map((c) => {
      const cSales = salesByCustomer[c.id] || []
      const metrics = calculateCustomerMetrics(cSales)
      const evaluation = evaluateCustomerLoyalty(metrics, tiers)

      if (evaluation.currentTier) {
        counts[evaluation.currentTier.id] = (counts[evaluation.currentTier.id] || 0) + 1
      } else {
        counts['sem-faixa'] = (counts['sem-faixa'] || 0) + 1
      }

      return {
        customer: c,
        metrics,
        evaluation,
      }
    })

    return { counts, evaluatedCustomers }
  }, [tiers, customers, sales])

  return (
    <div className="space-y-6">
      {/* Header com Navegação e Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/clientes')}
              className="text-xs text-slate-600 hover:text-slate-900 -ml-2 h-7"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Clientes
            </Button>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Programa de Fidelidade
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-500" />
            Configuração do Programa de Fidelidade
          </h2>
          <p className="text-sm text-slate-500">
            Crie faixas e critérios personalizados para classificar clientes com medalhas e troféus
            automáticos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {tiers.length === 0 && (
            <Button
              onClick={handleCreateDefaults}
              disabled={submitting}
              variant="outline"
              className="text-xs h-9 border-emerald-300 text-emerald-700 hover:bg-emerald-50 flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Carregar Faixas Padrão
            </Button>
          )}

          <Button
            onClick={openCreateModal}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9 px-4 shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Nova Faixa
          </Button>
        </div>
      </div>

      {/* Banner Informativo Explicativo */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 rounded-2xl border border-slate-700/80 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20 uppercase tracking-wider">
                <Crown className="w-3 h-3 text-amber-400" /> Sistema Dinâmico
              </span>
              <span className="text-xs text-slate-300">Classificação 100% Automática</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              Como funciona o avanço de faixas dos seus clientes?
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Você define os critérios (ex.: <strong>total gasto</strong>,{' '}
              <strong>número de compras</strong> ou <strong>ticket médio</strong>) e o valor de
              corte de cada faixa. O sistema recalcula automaticamente a posição de cada cliente com
              base nas vendas concluídas, exibindo o <strong>troféu correspondente</strong> na lista
              de clientes e no histórico 360°.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-xs p-3.5 rounded-xl border border-white/10 flex items-center gap-4 shrink-0">
            <div className="text-center px-2">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                Faixas Ativas
              </span>
              <span className="text-xl font-bold font-mono text-emerald-400">{tiers.length}</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center px-2">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                Clientes Avaliados
              </span>
              <span className="text-xl font-bold font-mono text-white">{customers.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Faixas Configuradas */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm tracking-tight flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-600" />
            Faixas de Classificação e Critérios de Entrada ({tiers.length})
          </h3>
          {tiers.length > 0 && (
            <span className="text-xs text-slate-400">
              A maior faixa exige mais e confere mais prestígio
            </span>
          )}
        </div>

        {loading && tiers.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-7 h-7 text-emerald-600 animate-spin" />
            <p className="text-xs text-slate-500">Carregando programa de fidelidade...</p>
          </div>
        ) : tiers.length === 0 ? (
          <EmptyState
            icon={<Trophy className="w-10 h-10 text-amber-500" />}
            title="Nenhuma faixa de fidelidade cadastrada"
            description="Crie suas próprias faixas com os critérios que preferir ou carregue as faixas padrão pré-montadas (Bronze, Prata, Ouro e Diamante)."
            actionLabel="Carregar Faixas Padrão"
            onAction={handleCreateDefaults}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {tiers.map((tier, index) => {
              const clientsInTier = distribution.counts[tier.id] || 0
              const percentageOfTotal =
                customers.length > 0 ? Math.round((clientsInTier / customers.length) * 100) : 0

              return (
                <div
                  key={tier.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 hover:shadow-sm transition flex flex-col justify-between group relative overflow-hidden"
                >
                  {/* Ordem no topo */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                      Nível {tier.tier_order}
                    </span>
                    <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition">
                      <button
                        onClick={() => handleMoveOrder(index, 'up')}
                        disabled={index === 0}
                        className="p-1 rounded text-slate-400 hover:text-slate-800 disabled:opacity-20 hover:bg-slate-100"
                        title="Subir prioridade"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveOrder(index, 'down')}
                        disabled={index === tiers.length - 1}
                        className="p-1 rounded text-slate-400 hover:text-slate-800 disabled:opacity-20 hover:bg-slate-100"
                        title="Descer prioridade"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openEditModal(tier)}
                        className="p-1 rounded text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 ml-1"
                        title="Editar faixa"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTargetId(tier.id)}
                        className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                        title="Excluir faixa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Medalha & Nome da Faixa */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5">
                      <LoyaltyBadge tier={tier} size="lg" showLabel={false} />
                      <div>
                        <h4 className="font-bold text-base text-slate-900 tracking-tight leading-tight">
                          {tier.name}
                        </h4>
                        <span className="text-[11px] text-slate-400">
                          {clientsInTier} cliente(s) ({percentageOfTotal}%)
                        </span>
                      </div>
                    </div>

                    {/* Critério de Entrada */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Critério de Entrada:
                      </span>
                      <p className="text-xs font-semibold text-slate-800">
                        {getCriterionLabel(tier.criterion_type)}
                      </p>
                      <div className="flex items-baseline gap-1 text-emerald-700 font-bold font-mono text-sm pt-0.5">
                        <span>Exige:</span>
                        <span>{formatCriterionValue(tier.min_value, tier.criterion_type)}</span>
                      </div>
                    </div>

                    {/* Benefícios e Desconto */}
                    <div className="space-y-1.5 text-xs text-slate-600">
                      {tier.discount_percent ? (
                        <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-xs">
                          <Percent className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Desconto padrão: {tier.discount_percent}%</span>
                        </div>
                      ) : null}

                      {tier.benefits && (
                        <p className="text-[11px] text-slate-500 line-clamp-2">
                          <strong className="text-slate-700">Benefícios:</strong> {tier.benefits}
                        </p>
                      )}

                      {tier.description && (
                        <p className="text-[11px] text-slate-400 italic line-clamp-2">
                          {tier.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Barra de distribuição percentual de clientes nesta faixa */}
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                      <span>Presença na carteira</span>
                      <span className="font-mono font-bold text-slate-700">
                        {percentageOfTotal}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${percentageOfTotal}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Lista de Prévia: Clientes e Classificação Atual */}
      {customers.length > 0 && tiers.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-slate-800 text-sm tracking-tight flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                Classificação da Carteira de Clientes (Recálculo Automático)
              </h3>
              <p className="text-xs text-slate-400">
                Veja como seus clientes estão classificados com as regras atuais do programa.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/clientes')}
              className="text-xs h-8 text-slate-600 hover:text-slate-900 self-start sm:self-auto"
            >
              Ver Cadastro Completo de Clientes
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {distribution.evaluatedCustomers
              .slice(0, 9)
              .map(({ customer, metrics, evaluation }) => (
                <div
                  key={customer.id}
                  onClick={() => navigate(`/clientes/${customer.id}/historico`)}
                  className="p-3.5 rounded-xl border border-slate-100 hover:border-slate-300 hover:shadow-xs bg-slate-50/50 hover:bg-white transition cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-xs text-slate-900 truncate group-hover:text-emerald-700 transition">
                        {customer.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                      <span>{formatCurrency(metrics.totalSpent)}</span>
                      <span>•</span>
                      <span>{metrics.salesCount} compra(s)</span>
                    </div>
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-1">
                    {evaluation.currentTier ? (
                      <LoyaltyBadge tier={evaluation.currentTier} size="sm" />
                    ) : (
                      <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                        Sem faixa
                      </span>
                    )}
                    {evaluation.nextTier && (
                      <span className="text-[10px] text-slate-400">
                        Próx: {evaluation.nextTier.name} ({evaluation.progressPercent}%)
                      </span>
                    )}
                  </div>
                </div>
              ))}
          </div>

          {customers.length > 9 && (
            <p className="text-center text-xs text-slate-400 pt-2">
              Mostrando 9 de {customers.length} clientes.{' '}
              <button
                onClick={() => navigate('/clientes')}
                className="text-emerald-700 font-semibold hover:underline"
              >
                Ver todos os clientes com seus troféus e medalhas
              </button>
            </p>
          )}
        </div>
      )}

      {/* Modal Criar / Editar Faixa */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[550px] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              {editingTier ? 'Editar Faixa de Fidelidade' : 'Nova Faixa de Fidelidade'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {/* Nome da Faixa */}
            <div className="space-y-1.5">
              <Label htmlFor="tierName" className="text-xs font-semibold text-slate-700">
                Nome da Faixa <span className="text-red-500">*</span>
              </Label>
              <Input
                id="tierName"
                placeholder="Ex.: Bronze, Prata, Ouro, Diamante, VIP Plus..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            {/* Escolha do Critério */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Critério de Entrada (Qual métrica usar?) <span className="text-red-500">*</span>
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CRITERIA_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCriterionType(opt.value)}
                    className={`p-2.5 rounded-xl border text-left transition text-xs ${
                      criterionType === opt.value
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 font-semibold ring-1 ring-emerald-500/30'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold">{opt.label}</span>
                      {criterionType === opt.value && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 font-normal leading-tight">
                      {opt.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Valor de Corte */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="minValue" className="text-xs font-semibold text-slate-700">
                  Valor Mínimo Exigido <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="minValue"
                    type="number"
                    step={
                      criterionType === 'sales_count' || criterionType === 'days_recent' ? 1 : 0.01
                    }
                    min="0"
                    placeholder="0"
                    value={minValue}
                    onChange={(e) => setMinValue(Number(e.target.value))}
                    className="h-9 text-xs font-mono pl-3"
                    required
                  />
                </div>
                <span className="text-[10px] text-slate-400">
                  {CRITERIA_OPTIONS.find((c) => c.value === criterionType)?.example}
                </span>
              </div>

              {/* Desconto Opcional */}
              <div className="space-y-1.5">
                <Label htmlFor="discountPercent" className="text-xs font-semibold text-slate-700">
                  Desconto Automático da Faixa (%)
                </Label>
                <div className="relative">
                  <Input
                    id="discountPercent"
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    placeholder="Ex: 5"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Number(e.target.value))}
                    className="h-9 text-xs font-mono"
                  />
                </div>
                <span className="text-[10px] text-slate-400">
                  Benefício opcional sugerido nas vendas desta faixa
                </span>
              </div>
            </div>

            {/* Ícone e Cor da Medalha/Troféu */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <Label className="text-xs font-semibold text-slate-700">
                Ícone da Insígnia (Troféu / Medalha)
              </Label>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {ICON_OPTIONS.map((opt) => {
                  const Icon = LOYALTY_ICON_MAP[opt.value]
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setBadgeIcon(opt.value)}
                      className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
                        badgeIcon === opt.value
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-[9px] font-medium truncate w-full text-center">
                        {opt.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Cor do Selo */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">
                Cor e Acabamento da Faixa
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {COLOR_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setBadgeColor(opt.value)}
                    className={`p-2 rounded-xl border flex items-center gap-2 transition text-left ${
                      badgeColor === opt.value
                        ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20 font-semibold'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${opt.previewClass}`} />
                    <span className="text-[11px] text-slate-800 truncate">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Prévia do Selo */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Prévia da Medalha/Troféu:</span>
              <LoyaltyBadge
                tierName={name || 'Nome da Faixa'}
                icon={badgeIcon}
                color={badgeColor}
                size="md"
              />
            </div>

            {/* Descrição e Benefícios */}
            <div className="space-y-1.5">
              <Label htmlFor="tierBenefits" className="text-xs font-semibold text-slate-700">
                Benefícios da Faixa (Visível ao cliente e na equipe)
              </Label>
              <Input
                id="tierBenefits"
                placeholder="Ex: 5% de desconto, frete grátis, atendimento VIP, brinde de aniversário..."
                value={benefits}
                onChange={(e) => setBenefits(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tierDesc" className="text-xs font-semibold text-slate-700">
                Descrição ou Regras Adicionais (Opcional)
              </Label>
              <Textarea
                id="tierDesc"
                placeholder="Observações internas sobre como aplicar os benefícios desta faixa..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
                ) : editingTier ? (
                  'Atualizar Faixa'
                ) : (
                  'Salvar Faixa'
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
            <DialogTitle className="text-base font-bold text-slate-900">
              Excluir Faixa de Fidelidade?
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-500">
            Deseja remover esta faixa de fidelidade? Os clientes atualmente enquadrados nela serão
            reclassificados automaticamente para a faixa anterior compatível.
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
              Excluir Faixa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Fidelidade
