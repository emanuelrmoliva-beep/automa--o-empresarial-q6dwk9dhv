import type { Customer, Sale, LoyaltyTier, LoyaltyCriterionType } from '@/types/erp'
import { formatCurrency } from './formatters'

export interface CustomerLoyaltyMetrics {
  totalSpent: number // Total de compras com status Concluída
  salesCount: number // Quantidade de vendas com status Concluída
  averageTicket: number // Ticket médio
  lastSaleDate?: string
  daysSinceLastSale?: number
}

export interface CustomerLoyaltyEvaluation {
  metrics: CustomerLoyaltyMetrics
  currentTier: LoyaltyTier | null
  nextTier: LoyaltyTier | null
  progressPercent: number
  remainingForNext: number
  progressText: string
  metricValueForNext: number
  currentTierValue: number
  nextTierValue: number
}

/**
 * Calcula as métricas de compra de um cliente a partir da lista de vendas concluídas
 */
export function calculateCustomerMetrics(sales: Sale[]): CustomerLoyaltyMetrics {
  const completedSales = sales.filter((s) => s.status === 'Concluída')
  const totalSpent = completedSales.reduce((acc, s) => acc + (Number(s.amount) || 0), 0)
  const salesCount = completedSales.length
  const averageTicket = salesCount > 0 ? totalSpent / salesCount : 0

  let lastSaleDate: string | undefined
  let daysSinceLastSale: number | undefined

  if (completedSales.length > 0) {
    const sorted = [...completedSales].sort(
      (a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime(),
    )
    lastSaleDate = sorted[0].sale_date

    if (lastSaleDate) {
      const now = new Date()
      const last = new Date(lastSaleDate)
      const diffTime = Math.max(0, now.getTime() - last.getTime())
      daysSinceLastSale = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    }
  }

  return {
    totalSpent,
    salesCount,
    averageTicket,
    lastSaleDate,
    daysSinceLastSale,
  }
}

/**
 * Retorna o valor numérico que um cliente atingiu para um critério específico
 */
export function getMetricValueByCriterion(
  metrics: CustomerLoyaltyMetrics,
  criterion: LoyaltyCriterionType,
): number {
  switch (criterion) {
    case 'total_spent':
      return metrics.totalSpent
    case 'sales_count':
      return metrics.salesCount
    case 'average_ticket':
      return metrics.averageTicket
    case 'days_recent':
      // Se nunca comprou, consideramos infinito ou número muito alto
      return metrics.daysSinceLastSale !== undefined ? metrics.daysSinceLastSale : 9999
    default:
      return 0
  }
}

/**
 * Formata um valor de critério com sua unidade correspondente
 */
export function formatCriterionValue(value: number, criterion: LoyaltyCriterionType): string {
  switch (criterion) {
    case 'total_spent':
    case 'average_ticket':
      return formatCurrency(value)
    case 'sales_count':
      return `${value} ${value === 1 ? 'compra' : 'compras'}`
    case 'days_recent':
      return `${value} dias`
    default:
      return String(value)
  }
}

/**
 * Rótulo amigável em Português para o critério
 */
export function getCriterionLabel(criterion: LoyaltyCriterionType): string {
  switch (criterion) {
    case 'total_spent':
      return 'Total Gasto em Compras'
    case 'sales_count':
      return 'Quantidade de Compras'
    case 'average_ticket':
      return 'Ticket Médio'
    case 'days_recent':
      return 'Recência (Dias desde a última compra)'
    default:
      return 'Critério de Entrada'
  }
}

/**
 * Avalia em qual faixa o cliente se enquadra de acordo com os critérios definidos pelo usuário
 */
export function evaluateCustomerLoyalty(
  metrics: CustomerLoyaltyMetrics,
  tiers: LoyaltyTier[],
): CustomerLoyaltyEvaluation {
  if (!tiers || tiers.length === 0) {
    return {
      metrics,
      currentTier: null,
      nextTier: null,
      progressPercent: 0,
      remainingForNext: 0,
      progressText: 'Nenhuma faixa de fidelidade configurada',
      metricValueForNext: 0,
      currentTierValue: 0,
      nextTierValue: 0,
    }
  }

  // Ordenar faixas crescentemente pela ordem ou pelo valor mínimo
  const sortedTiers = [...tiers].sort((a, b) => a.tier_order - b.tier_order)

  // Determinar qual a maior faixa que o cliente atinge
  let currentTier: LoyaltyTier | null = null
  let currentTierIndex = -1

  for (let i = 0; i < sortedTiers.length; i++) {
    const tier = sortedTiers[i]
    const metricVal = getMetricValueByCriterion(metrics, tier.criterion_type)

    let qualifies = false
    if (tier.criterion_type === 'days_recent') {
      // Recência: quanto MENOR os dias desde a última compra, melhor. Ex: comprou há 10 dias <= corte de 30 dias
      qualifies = metricVal <= tier.min_value
    } else {
      // Total gasto, contagem, ticket médio: quanto MAIOR ou igual, qualifica
      qualifies = metricVal >= tier.min_value
    }

    if (qualifies) {
      currentTier = tier
      currentTierIndex = i
    }
  }

  // Se o cliente não atingiu nem a primeira faixa com critério > 0,
  // mas há uma faixa de base (ex: ordem 1 com min_value 0), ela já é pega acima.
  // Caso não atinja nenhuma (ex: primeira faixa exige > 0), nextTier é a primeira
  const nextTierIndex = currentTierIndex === -1 ? 0 : currentTierIndex + 1
  const nextTier: LoyaltyTier | null = sortedTiers[nextTierIndex] || null

  // Calcular progresso para a próxima faixa
  let progressPercent = 100
  let remainingForNext = 0
  let progressText = 'Faixa máxima atingida!'
  let metricValueForNext = 0
  let currentTierValue = 0
  let nextTierValue = 0

  if (nextTier) {
    const currentMetric = getMetricValueByCriterion(metrics, nextTier.criterion_type)
    metricValueForNext = currentMetric
    nextTierValue = nextTier.min_value
    const prevMin = currentTier ? currentTier.min_value : 0
    currentTierValue = prevMin

    if (nextTier.criterion_type === 'days_recent') {
      // Recência
      remainingForNext = Math.max(0, currentMetric - nextTier.min_value)
      progressPercent =
        currentMetric <= nextTier.min_value
          ? 100
          : Math.max(10, Math.round(100 - (remainingForNext / (nextTier.min_value || 1)) * 100))
      progressText = `Compra há ${currentMetric} dias (alvo: ${nextTier.min_value} dias)`
    } else {
      // Valor cumulativo
      const range = Math.max(1, nextTier.min_value - prevMin)
      const progressInRange = Math.max(0, currentMetric - prevMin)
      progressPercent = Math.min(100, Math.max(0, Math.round((progressInRange / range) * 100)))
      remainingForNext = Math.max(0, nextTier.min_value - currentMetric)

      if (remainingForNext <= 0) {
        progressText = `Pronto para ${nextTier.name}!`
      } else {
        const formattedRemaining = formatCriterionValue(remainingForNext, nextTier.criterion_type)
        progressText = `Faltam ${formattedRemaining} para ${nextTier.name}`
      }
    }
  } else if (currentTier) {
    progressText = `Você é ${currentTier.name}! Nível mais alto do programa.`
  }

  return {
    metrics,
    currentTier,
    nextTier,
    progressPercent,
    remainingForNext,
    progressText,
    metricValueForNext,
    currentTierValue,
    nextTierValue,
  }
}
