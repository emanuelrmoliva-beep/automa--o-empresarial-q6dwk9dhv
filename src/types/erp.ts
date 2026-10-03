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

export interface Sale {
  id: string
  company_id: string
  customer_id?: string
  sale_date: string
  description: string
  amount: number
  status: 'Concluída' | 'Pendente' | 'Cancelada'
  payment_method?: 'À vista' | 'Pix' | 'Cartão' | 'Boleto' | 'Transferência'
  created: string
  updated: string
  expand?: {
    customer_id?: Customer
  }
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
