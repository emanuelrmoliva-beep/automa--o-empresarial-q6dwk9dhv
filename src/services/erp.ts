import pb from '@/lib/pocketbase/client'
import type {
  Company,
  Product,
  Customer,
  Sale,
  Entry,
  Expense,
  Payable,
  Receivable,
  Movement,
  Goal,
  AgendaEvent,
} from '@/types/erp'

// Companies
export async function getCompanyByUserId(userId: string): Promise<Company | null> {
  try {
    const record = await pb
      .collection('companies')
      .getFirstListItem<Company>(`user_id = "${userId}"`)
    return record
  } catch (err: any) {
    if (err.status === 404) return null
    throw err
  }
}

export async function createCompany(data: Partial<Company>): Promise<Company> {
  return await pb.collection('companies').create<Company>(data)
}

export async function updateCompany(id: string, data: Partial<Company>): Promise<Company> {
  return await pb.collection('companies').update<Company>(id, data)
}

// Products
export async function getProducts(companyId: string): Promise<Product[]> {
  return await pb.collection('products').getFullList<Product>({
    filter: `company_id = "${companyId}"`,
    sort: '-created',
  })
}

export async function createProduct(data: Partial<Product>): Promise<Product> {
  return await pb.collection('products').create<Product>(data)
}

export async function updateProduct(id: string, data: Partial<Product>): Promise<Product> {
  return await pb.collection('products').update<Product>(id, data)
}

export async function deleteProduct(id: string): Promise<boolean> {
  return await pb.collection('products').delete(id)
}

// Customers
export async function getCustomers(companyId: string): Promise<Customer[]> {
  return await pb.collection('customers').getFullList<Customer>({
    filter: `company_id = "${companyId}"`,
    sort: '-created',
  })
}

export async function createCustomer(data: Partial<Customer>): Promise<Customer> {
  return await pb.collection('customers').create<Customer>(data)
}

export async function updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
  return await pb.collection('customers').update<Customer>(id, data)
}

export async function deleteCustomer(id: string): Promise<boolean> {
  return await pb.collection('customers').delete(id)
}

// Sales
export async function getSales(companyId: string): Promise<Sale[]> {
  return await pb.collection('sales').getFullList<Sale>({
    filter: `company_id = "${companyId}"`,
    sort: '-sale_date',
    expand: 'customer_id',
  })
}

export async function createSale(data: Partial<Sale>): Promise<Sale> {
  return await pb.collection('sales').create<Sale>(data)
}

export async function deleteSale(id: string): Promise<boolean> {
  return await pb.collection('sales').delete(id)
}

// Entries (Receitas)
export async function getEntries(companyId: string): Promise<Entry[]> {
  return await pb.collection('entries').getFullList<Entry>({
    filter: `company_id = "${companyId}"`,
    sort: '-entry_date',
  })
}

export async function createEntry(data: Partial<Entry>): Promise<Entry> {
  return await pb.collection('entries').create<Entry>(data)
}

export async function updateEntry(id: string, data: Partial<Entry>): Promise<Entry> {
  return await pb.collection('entries').update<Entry>(id, data)
}

export async function deleteEntry(id: string): Promise<boolean> {
  return await pb.collection('entries').delete(id)
}

// Expenses (Despesas)
export async function getExpenses(companyId: string): Promise<Expense[]> {
  return await pb.collection('expenses').getFullList<Expense>({
    filter: `company_id = "${companyId}"`,
    sort: '-expense_date',
  })
}

export async function createExpense(data: Partial<Expense>): Promise<Expense> {
  return await pb.collection('expenses').create<Expense>(data)
}

export async function updateExpense(id: string, data: Partial<Expense>): Promise<Expense> {
  return await pb.collection('expenses').update<Expense>(id, data)
}

export async function deleteExpense(id: string): Promise<boolean> {
  return await pb.collection('expenses').delete(id)
}

// Payables (Contas a Pagar)
export async function getPayables(companyId: string): Promise<Payable[]> {
  return await pb.collection('payables').getFullList<Payable>({
    filter: `company_id = "${companyId}"`,
    sort: 'due_date',
  })
}

export async function createPayable(data: Partial<Payable>): Promise<Payable> {
  return await pb.collection('payables').create<Payable>(data)
}

export async function updatePayable(id: string, data: Partial<Payable>): Promise<Payable> {
  return await pb.collection('payables').update<Payable>(id, data)
}

export async function deletePayable(id: string): Promise<boolean> {
  return await pb.collection('payables').delete(id)
}

// Receivables (Contas a Receber)
export async function getReceivables(companyId: string): Promise<Receivable[]> {
  return await pb.collection('receivables').getFullList<Receivable>({
    filter: `company_id = "${companyId}"`,
    sort: 'due_date',
    expand: 'client_id',
  })
}

export async function createReceivable(data: Partial<Receivable>): Promise<Receivable> {
  return await pb.collection('receivables').create<Receivable>(data)
}

export async function updateReceivable(id: string, data: Partial<Receivable>): Promise<Receivable> {
  return await pb.collection('receivables').update<Receivable>(id, data)
}

export async function deleteReceivable(id: string): Promise<boolean> {
  return await pb.collection('receivables').delete(id)
}

// Movements (Entradas e Saídas)
export async function getMovements(companyId: string): Promise<Movement[]> {
  return await pb.collection('movements').getFullList<Movement>({
    filter: `company_id = "${companyId}"`,
    sort: '-movement_date',
  })
}

export async function createMovement(data: Partial<Movement>): Promise<Movement> {
  return await pb.collection('movements').create<Movement>(data)
}

// Goals (Metas)
export async function getGoals(companyId: string): Promise<Goal[]> {
  return await pb.collection('goals').getFullList<Goal>({
    filter: `company_id = "${companyId}"`,
    sort: '-created',
  })
}

export async function createGoal(data: Partial<Goal>): Promise<Goal> {
  return await pb.collection('goals').create<Goal>(data)
}

export async function updateGoal(id: string, data: Partial<Goal>): Promise<Goal> {
  return await pb.collection('goals').update<Goal>(id, data)
}

export async function deleteGoal(id: string): Promise<boolean> {
  return await pb.collection('goals').delete(id)
}

// Agenda Events (Pedidos e Entregas)
export async function getAgendaEvents(companyId: string): Promise<AgendaEvent[]> {
  return await pb.collection('agenda_events').getFullList<AgendaEvent>({
    filter: `company_id = "${companyId}"`,
    sort: 'event_date',
    expand: 'customer_id',
  })
}

export async function createAgendaEvent(data: Partial<AgendaEvent>): Promise<AgendaEvent> {
  return await pb.collection('agenda_events').create<AgendaEvent>(data)
}

export async function updateAgendaEvent(
  id: string,
  data: Partial<AgendaEvent>,
): Promise<AgendaEvent> {
  return await pb.collection('agenda_events').update<AgendaEvent>(id, data)
}

export async function deleteAgendaEvent(id: string): Promise<boolean> {
  return await pb.collection('agenda_events').delete(id)
}
