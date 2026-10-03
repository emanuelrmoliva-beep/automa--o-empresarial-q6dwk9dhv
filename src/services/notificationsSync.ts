import pb from '@/lib/pocketbase/client'
import { getPayables, getReceivables, getProducts, getAgendaEvents } from '@/services/erp'
import type { NotificationType, ErpNotification } from '@/types/erp'
import { formatCurrency, formatDatePtBr } from '@/lib/formatters'

interface NotificationCandidate {
  type: NotificationType
  title: string
  body: string
  ref_id: string
}

/**
 * Avalia as regras de negócio do ERP e calcula as notificações ativas:
 * 1. Contas a Pagar vencidas ou vencendo nos próximos 7 dias
 * 2. Contas a Receber vencidas ou vencendo nos próximos 7 dias
 * 3. Produtos esgotados (estoque zerado) ou abaixo do estoque mínimo de segurança
 * 4. Pedidos e entregas agendados para a data de hoje
 *
 * Persiste na coleção PocketBase 'notifications', deduplicando por (company_id + user_id + type + ref_id).
 */
export async function syncAndFetchNotifications(
  companyId: string,
  userId: string,
): Promise<ErpNotification[]> {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayIso = today.toISOString().split('T')[0]

    const day7 = new Date(today)
    day7.setDate(day7.getDate() + 7)
    const day7Iso = day7.toISOString().split('T')[0]

    // Busca dados em paralelo
    const [payables, receivables, products, agendaEvents] = await Promise.all([
      getPayables(companyId),
      getReceivables(companyId),
      getProducts(companyId),
      getAgendaEvents(companyId),
    ])

    const candidates: NotificationCandidate[] = []

    // 1. Contas a Pagar
    payables
      .filter((p) => p.status === 'Em aberto')
      .forEach((p) => {
        const dueDate = p.due_date.split('T')[0]
        if (dueDate < todayIso) {
          candidates.push({
            type: 'vencimento_pagar',
            title: `Conta a pagar vencida: ${p.description}`,
            body: `Título no valor de ${formatCurrency(p.amount)} venceu em ${formatDatePtBr(dueDate)} (${p.supplier || 'Fornecedor'}).`,
            ref_id: `payable_overdue_${p.id}_${dueDate}`,
          })
        } else if (dueDate <= day7Iso) {
          const isToday = dueDate === todayIso
          candidates.push({
            type: 'vencimento_pagar',
            title: isToday
              ? `Conta a pagar vence HOJE: ${p.description}`
              : `Conta a pagar vence em breve: ${p.description}`,
            body: `Título no valor de ${formatCurrency(p.amount)} vence ${isToday ? 'hoje' : `em ${formatDatePtBr(dueDate)}`} (${p.supplier || 'Fornecedor'}).`,
            ref_id: `payable_due_${p.id}_${dueDate}`,
          })
        }
      })

    // 2. Contas a Receber
    receivables
      .filter((r) => r.status === 'Em aberto')
      .forEach((r) => {
        const dueDate = r.due_date.split('T')[0]
        const clientName = (r.expand?.client_id as any)?.name || 'Cliente'
        if (dueDate < todayIso) {
          candidates.push({
            type: 'vencimento_receber',
            title: `Recebimento atrasado: ${r.description}`,
            body: `Título a receber de ${formatCurrency(r.amount)} de ${clientName} venceu em ${formatDatePtBr(dueDate)}.`,
            ref_id: `receivable_overdue_${r.id}_${dueDate}`,
          })
        } else if (dueDate <= day7Iso) {
          const isToday = dueDate === todayIso
          candidates.push({
            type: 'vencimento_receber',
            title: isToday
              ? `Recebimento para HOJE: ${r.description}`
              : `Recebimento em breve: ${r.description}`,
            body: `Título de ${formatCurrency(r.amount)} (${clientName}) vence ${isToday ? 'hoje' : `em ${formatDatePtBr(dueDate)}`}.`,
            ref_id: `receivable_due_${r.id}_${dueDate}`,
          })
        }
      })

    // 3. Estoque abaixo do mínimo ou esgotado
    const lowStockProducts = products.filter((p) => {
      const min = p.min_stock ?? 0
      return p.quantity <= min || p.quantity === 0
    })

    if (lowStockProducts.length > 0) {
      const outOfStockCount = lowStockProducts.filter((p) => p.quantity === 0).length
      const lowStockCount = lowStockProducts.length - outOfStockCount
      const namesPreview = lowStockProducts
        .slice(0, 3)
        .map((p) => `${p.name} (${p.quantity} un)`)
        .join(', ')

      candidates.push({
        type: 'estoque_baixo',
        title:
          outOfStockCount > 0
            ? `Alerta: ${lowStockProducts.length} produto(s) com estoque crítico/zerado`
            : `Atenção: ${lowStockProducts.length} produto(s) abaixo do estoque mínimo`,
        body: `Itens necessitando reposição: ${namesPreview}${lowStockProducts.length > 3 ? ` e mais ${lowStockProducts.length - 3} item(ns)` : ''}.`,
        ref_id: `stock_summary_${todayIso}_${lowStockProducts.length}`,
      })
    }

    // 4. Agenda do Dia (pedidos e entregas de hoje)
    const todayEvents = agendaEvents.filter(
      (ev) =>
        ev.event_date.split('T')[0] === todayIso &&
        ev.status !== 'concluido' &&
        ev.status !== 'cancelado',
    )

    if (todayEvents.length > 0) {
      candidates.push({
        type: 'agenda_hoje',
        title: `Agenda de Hoje: ${todayEvents.length} compromisso(s) pendente(s)`,
        body: `Você tem entregas ou pedidos programados para hoje: ${todayEvents.map((e) => e.title).join(', ')}.`,
        ref_id: `agenda_today_${todayIso}_${todayEvents.length}`,
      })
    }

    // Busca notificações já existentes no banco para deduplicar
    const existingList = await pb.collection('notifications').getFullList<ErpNotification>({
      filter: `company_id = "${companyId}" && user_id = "${userId}"`,
      sort: '-created',
    })

    const existingRefMap = new Map<string, ErpNotification>()
    existingList.forEach((n) => {
      if (n.ref_id) existingRefMap.set(n.ref_id, n)
    })

    // Cria as que ainda não existem
    for (const c of candidates) {
      if (!existingRefMap.has(c.ref_id)) {
        try {
          const created = await pb.collection('notifications').create<ErpNotification>({
            company_id: companyId,
            user_id: userId,
            type: c.type,
            title: c.title,
            body: c.body,
            ref_id: c.ref_id,
            read: false,
          })
          existingRefMap.set(c.ref_id, created)
        } catch (err) {
          console.error('Erro ao criar notificação individual:', err)
        }
      }
    }

    // Retorna a lista atualizada ordenada por data de criação desc
    return Array.from(existingRefMap.values()).sort(
      (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime(),
    )
  } catch (err) {
    console.error('Erro na sincronização de notificações:', err)
    return []
  }
}
