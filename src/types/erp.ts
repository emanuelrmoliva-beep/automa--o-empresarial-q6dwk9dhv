export interface Company {
  id: string
  user_id: string
  legal_name: string
  trade_name: string
  cnpj: string
  foundation_date: string
  business_activity: string
  business_activity_other?: string
  zip_code: string
  address: string
  number: string
  complement?: string
  district: string
  city: string
  state: string
  phone: string
  contact_email: string
  logo?: string
  created: string
  updated: string
}

export interface Product {
  id: string
  company_id: string
  name: string
  sku: string
  category: 'Produtos' | 'Alimentos' | 'Bebidas' | 'Vestuário' | 'Serviços' | 'Outros'
  cost_price: number
  selling_price: number
  quantity: number
  min_stock?: number
  photo?: string
  created: string
  updated: string
}

export interface Customer {
  id: string
  company_id: string
  client_type: 'Pessoa Jurídica' | 'Pessoa Física'
  name: string
  document: string
  email?: string
  phone?: string
  address?: string
  notes?: string
  created: string
  updated: string
}

export interface SaleItem {
  product_id: string
  name: string
  sku?: string
  quantity: number
  unit_price: number
  total: number
  batch_id?: string
  batch_number?: string
}

export interface Sale {
  id: string
  company_id: string
  customer_id?: string
  sale_date: string
  description: string
  amount: number
  status: 'Concluída' | 'Pendente' | 'Cancelada'
  payment_method?: 'À vista' | 'Pix' | 'Cartão' | 'Boleto' | 'Transferência'
  items?: SaleItem[]
  created: string
  updated: string
  expand?: {
    customer_id?: Customer
  }
}

export type NotificationType =
  | 'vencimento_pagar'
  | 'vencimento_receber'
  | 'estoque_baixo'
  | 'agenda_hoje'
  | 'sistema'

export interface ErpNotification {
  id: string
  company_id: string
  user_id: string
  type: NotificationType
  title: string
  body: string
  ref_id?: string
  read: boolean
  read_at?: string
  created: string
  updated: string
}

export interface Entry {
  id: string
  company_id: string
  entry_date: string
  description: string
  category: 'Venda' | 'Serviço' | 'Investimento' | 'Outros'
  source?: string
  amount: number
  status: 'Recebida' | 'Pendente'
  payment_method?: 'À vista' | 'Pix' | 'Cartão' | 'Boleto' | 'Transferência'
  created: string
  updated: string
}

export interface Expense {
  id: string
  company_id: string
  expense_date: string
  description: string
  category:
    | 'Aluguel'
    | 'Salários'
    | 'Impostos'
    | 'Fornecedores'
    | 'Transporte'
    | 'Marketing'
    | 'Utilidades'
    | 'Outros'
  amount: number
  status: 'Paga' | 'Pendente'
  payment_method?: 'À vista' | 'Pix' | 'Cartão' | 'Boleto' | 'Transferência'
  created: string
  updated: string
}

export interface Payable {
  id: string
  company_id: string
  due_date: string
  description: string
  supplier?: string
  amount: number
  status: 'Em aberto' | 'Pago'
  notes?: string
  created: string
  updated: string
}

export interface Receivable {
  id: string
  company_id: string
  due_date: string
  description: string
  client_id?: string
  amount: number
  status: 'Em aberto' | 'Recebida'
  notes?: string
  created: string
  updated: string
  expand?: {
    client_id?: Customer
  }
}

export interface Movement {
  id: string
  company_id: string
  movement_date: string
  type: 'entrada' | 'saída'
  description: string
  category?: string
  amount: number
  reference?: string
  created: string
  updated: string
}

export type GoalType =
  | 'faturamento'
  | 'lucro'
  | 'vendas_qtd'
  | 'reducao_despesas'
  | 'equipamento_investimento'
  | 'livre'

export type GoalPeriod = 'mensal' | 'trimestral' | 'semestral' | 'anual'

export type GoalStatus = 'em_andamento' | 'concluida' | 'cancelada'

export interface Goal {
  id: string
  company_id: string
  title: string
  goal_type: GoalType
  period_type: GoalPeriod
  start_date: string
  end_date: string
  target_value: number
  current_value?: number
  status: GoalStatus
  notes?: string
  created: string
  updated: string
}

export type AgendaEventType = 'Pedido' | 'Entrega' | 'Outro'

export type AgendaEventStatus = 'pendente' | 'em_andamento' | 'concluido' | 'cancelado'

export interface AgendaEvent {
  id: string
  company_id: string
  title: string
  event_type: AgendaEventType
  customer_id?: string
  event_date: string
  event_time?: string
  amount?: number
  status: AgendaEventStatus
  notes?: string
  created: string
  updated: string
  expand?: {
    customer_id?: Customer
  }
}

export interface QuoteItem {
  product_id?: string
  name: string
  sku?: string
  quantity: number
  unit_price: number
  total: number
}

export interface Quote {
  id: string
  company_id: string
  customer_id?: string
  quote_number?: string
  title: string
  issue_date: string
  valid_until?: string
  customer_name?: string
  customer_contact?: string
  status: 'Rascunho' | 'Enviado' | 'Aprovado' | 'Recusado' | 'Convertido'
  items?: QuoteItem[]
  subtotal?: number
  discount?: number
  total_amount: number
  payment_terms?: string
  notes?: string
  created: string
  updated: string
  expand?: {
    customer_id?: Customer
  }
}

export interface SupplierOffer {
  id?: string
  supplier_name: string
  contact?: string
  unit_price: number
  delivery_time?: string
  min_order_qty?: number
  payment_conditions?: string
  notes?: string
  is_selected?: boolean
}

export interface SupplierQuote {
  id: string
  company_id: string
  product_id?: string
  item_name: string
  quote_date: string
  quantity_needed?: number
  status: 'Em Aberto' | 'Concluída' | 'Cancelada'
  chosen_supplier_index?: number
  suppliers?: SupplierOffer[]
  notes?: string
  created: string
  updated: string
  expand?: {
    product_id?: Product
  }
}

export interface CashFlowProjectionDay {
  date: string
  label: string
  receivables: number
  payables: number
  netChange: number
  projectedBalance: number
  isNegative: boolean
}

export type LoyaltyCriterionType =
  | 'total_spent' // Valor total em compras concluídas (R$)
  | 'sales_count' // Quantidade total de compras concluídas
  | 'average_ticket' // Ticket médio por compra concluída (R$)
  | 'days_recent' // Recência: compras realizadas nos últimos X dias

export type LoyaltyBadgeIcon = 'trophy' | 'medal' | 'award' | 'crown' | 'star' | 'shield' | 'gem'

export type LoyaltyBadgeColor =
  | 'amber' // ex: Bronze / Âmbar
  | 'slate' // ex: Prata / Cinza Metálico
  | 'yellow' // ex: Ouro / Dourado
  | 'cyan' // ex: Diamante / Azul Turquesa
  | 'emerald' // ex: Esmeralda / Platina Verde
  | 'violet' // ex: Ametista / Roxo VIP
  | 'rose' // ex: Rubi / Rosé
  | 'blue' // ex: Safira / Azul Royal

export interface LoyaltyTier {
  id: string
  company_id: string
  name: string
  criterion_type: LoyaltyCriterionType
  min_value: number
  tier_order: number
  badge_icon: LoyaltyBadgeIcon
  badge_color: LoyaltyBadgeColor
  description?: string
  benefits?: string
  discount_percent?: number
  created: string
  updated: string
}

export type ProductionBatchStatus = 'aberto' | 'finalizado'

export interface ProductionBatchItem {
  id: string
  company_id: string
  batch_id: string
  product_id?: string
  item_name: string
  grammage_type?: string
  grammage_value?: number
  supplier_batch_number?: string
  manufacture_date?: string
  quantity_used: number
  unit_measure?: string
  notes?: string
  attachments?: string[]
  created: string
  updated: string
  expand?: {
    product_id?: Product
    batch_id?: ProductionBatch
  }
}

export interface ProductionBatch {
  id: string
  company_id: string
  batch_number: string
  production_date: string
  product_id?: string
  product_name?: string
  quantity_produced?: number
  status: ProductionBatchStatus
  notes?: string
  created: string
  updated: string
  items?: ProductionBatchItem[]
  expand?: {
    product_id?: Product
  }
}
