import pb from '@/lib/pocketbase/client'
import type { SaleItem } from '@/types/erp'

/**
 * Aplica baixa ou devolução de estoque com base nos itens da venda.
 * deltaMap: Map<productId, quantityDelta>
 * Se quantityDelta > 0, significa que o estoque físico diminui (foi vendido).
 * Se quantityDelta < 0, significa que o estoque físico aumenta (devolução/estorno).
 */
export async function applyStockDeltas(
  deltaMap: Map<string, number>,
): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = []

  for (const [productId, delta] of deltaMap.entries()) {
    if (delta === 0) continue

    try {
      const prodRecord = await pb.collection('products').getOne(productId)
      const currentStock = Number(prodRecord.quantity) || 0
      const newStock = currentStock - delta

      if (newStock < 0) {
        errors.push(
          `Estoque insuficiente para "${prodRecord.name}": restam ${currentStock} unidades e a operação exigiu ${delta}.`,
        )
        continue
      }

      await pb.collection('products').update(productId, {
        quantity: Math.max(0, newStock),
      })
    } catch (err: any) {
      console.error(`Erro ao atualizar estoque do produto ${productId}:`, err)
      errors.push(`Erro ao atualizar estoque: ${err?.message || 'Falha no banco de dados'}`)
    }
  }

  return {
    success: errors.length === 0,
    errors,
  }
}

/**
 * Calcula os deltas de estoque necessários quando uma venda é criada, editada ou cancelada.
 *
 * Regras:
 * - Status "Concluída" baixa o estoque dos itens.
 * - Status "Cancelada" ou "Pendente" não consome estoque.
 *
 * Parâmetros:
 * - previousStatus: status antes da alteração (ou null se for criação)
 * - previousItems: lista de itens antes da alteração
 * - newStatus: novo status da venda
 * - newItems: nova lista de itens
 */
export function calculateStockDeltas(
  previousStatus: 'Concluída' | 'Pendente' | 'Cancelada' | null,
  previousItems: SaleItem[] = [],
  newStatus: 'Concluída' | 'Pendente' | 'Cancelada',
  newItems: SaleItem[] = [],
): Map<string, number> {
  const deltaMap = new Map<string, number>()

  const wasCompleted = previousStatus === 'Concluída'
  const isCompleted = newStatus === 'Concluída'

  // Caso 1: Venda permaneceu Concluída (ou acabou de ser Concluída vinda de Concluída)
  if (wasCompleted && isCompleted) {
    // Reverte o snapshot anterior
    for (const item of previousItems) {
      if (!item.product_id) continue
      const prevQty = Number(item.quantity) || 0
      deltaMap.set(item.product_id, (deltaMap.get(item.product_id) || 0) - prevQty)
    }
    // Aplica a nova lista
    for (const item of newItems) {
      if (!item.product_id) continue
      const newQty = Number(item.quantity) || 0
      deltaMap.set(item.product_id, (deltaMap.get(item.product_id) || 0) + newQty)
    }
  }
  // Caso 2: Venda passou a ser Concluída agora (criada como Concluída ou mudou de Pendente/Cancelada -> Concluída)
  else if (!wasCompleted && isCompleted) {
    for (const item of newItems) {
      if (!item.product_id) continue
      const newQty = Number(item.quantity) || 0
      deltaMap.set(item.product_id, (deltaMap.get(item.product_id) || 0) + newQty)
    }
  }
  // Caso 3: Venda era Concluída e agora foi Cancelada ou Pendente (devolve itens ao estoque)
  else if (wasCompleted && !isCompleted) {
    for (const item of previousItems) {
      if (!item.product_id) continue
      const prevQty = Number(item.quantity) || 0
      deltaMap.set(item.product_id, (deltaMap.get(item.product_id) || 0) - prevQty)
    }
  }
  // Caso 4: Venda não era nem passou a ser Concluída (ex: Pendente -> Cancelada) => nenhum delta
  else {
    // no-op
  }

  return deltaMap
}

/**
 * Valida se os itens solicitados possuem estoque suficiente antes de efetivar a venda.
 */
/**
 * Aplica baixa ou devolução de estoque com base nos insumos do lote de produção.
 * Se finalizado: deltaMap = Map<productId, quantityUsed> -> baixa no estoque.
 * Se reaberto ou excluído: deltaMap = Map<productId, -quantityUsed> -> devolução ao estoque.
 */
export async function applyProductionBatchStockDeltas(
  deltaMap: Map<string, number>,
): Promise<{ success: boolean; errors: string[] }> {
  return await applyStockDeltas(deltaMap)
}

/**
 * Valida se os insumos de um lote de produção possuem estoque disponível suficiente.
 */
export async function validateProductionStockAvailability(
  items: { product_id?: string; quantity_used: number; item_name?: string }[],
  previousItems: { product_id?: string; quantity_used: number }[] = [],
  isEdit = false,
  previousStatus?: 'aberto' | 'finalizado',
): Promise<{ valid: boolean; errorMessage?: string }> {
  const requiredDeltas = new Map<string, number>()

  for (const item of items) {
    if (!item.product_id) continue
    const qty = Number(item.quantity_used) || 0
    requiredDeltas.set(item.product_id, (requiredDeltas.get(item.product_id) || 0) + qty)
  }

  // Se já estava finalizado na edição anterior, o consumo anterior conta a favor
  if (isEdit && previousStatus === 'finalizado') {
    for (const prevItem of previousItems) {
      if (!prevItem.product_id) continue
      const prevQty = Number(prevItem.quantity_used) || 0
      requiredDeltas.set(
        prevItem.product_id,
        (requiredDeltas.get(prevItem.product_id) || 0) - prevQty,
      )
    }
  }

  for (const [productId, delta] of requiredDeltas.entries()) {
    if (delta <= 0) continue

    try {
      const prodRecord = await pb.collection('products').getOne(productId)
      const currentStock = Number(prodRecord.quantity) || 0

      if (delta > currentStock) {
        return {
          valid: false,
          errorMessage: `Estoque insuficiente de insumo: restam apenas ${currentStock} unidade(s) de "${prodRecord.name}" em estoque (solicitado no lote: ${delta}).`,
        }
      }
    } catch (err: any) {
      return {
        valid: false,
        errorMessage: `Erro ao consultar produto insumo: ${err?.message}`,
      }
    }
  }

  return { valid: true }
}

export async function validateStockAvailability(
  items: SaleItem[],
  previousItems: SaleItem[] = [],
  isEdit = false,
  previousStatus?: 'Concluída' | 'Pendente' | 'Cancelada',
): Promise<{ valid: boolean; errorMessage?: string }> {
  // Constrói mapa de exigência líquida por produto
  const requiredDeltas = new Map<string, number>()

  for (const item of items) {
    if (!item.product_id) continue
    const qty = Number(item.quantity) || 0
    requiredDeltas.set(item.product_id, (requiredDeltas.get(item.product_id) || 0) + qty)
  }

  // Se for edição e já estava concluída, a quantidade antiga conta a favor
  if (isEdit && previousStatus === 'Concluída') {
    for (const prevItem of previousItems) {
      if (!prevItem.product_id) continue
      const prevQty = Number(prevItem.quantity) || 0
      requiredDeltas.set(
        prevItem.product_id,
        (requiredDeltas.get(prevItem.product_id) || 0) - prevQty,
      )
    }
  }

  for (const [productId, delta] of requiredDeltas.entries()) {
    if (delta <= 0) continue // Não está exigindo mais do que já havia sido baixado

    try {
      const prodRecord = await pb.collection('products').getOne(productId)
      const currentStock = Number(prodRecord.quantity) || 0

      if (delta > currentStock) {
        return {
          valid: false,
          errorMessage: `Estoque insuficiente: restam apenas ${currentStock} unidade(s) de "${prodRecord.name}" em estoque (solicitado: ${delta}).`,
        }
      }
    } catch (err: any) {
      return {
        valid: false,
        errorMessage: `Erro ao consultar produto: ${err?.message}`,
      }
    }
  }

  return { valid: true }
}
