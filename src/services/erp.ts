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
  ErpNotification,
  Quote,
  SupplierQuote,
} from '@/types/erp'

// PocketBase File URL helper
export function getPbFileUrl(
  collectionIdOrName: string,
  recordId: string,
  filename?: string,
): string | null {
  if (!filename) return null
  return pb.files.getURL(
    { id: recordId, collectionId: collectionIdOrName, collectionName: collectionIdOrName } as any,
    filename,
  )
}

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

export async function createCompany(data: FormData | Partial<Company>): Promise<Company> {
  return await pb.collection('companies').create<Company>(data)
}

export async function updateCompany(
  id: string,
  data: FormData | Partial<Company>,
): Promise<Company> {
  return await pb.collection('companies').update<Company>(id, data)
}

// Products
export async function getProducts(companyId: string): Promise<Product[]> {
  return await pb.collection('products').getFullList<Product>({
    filter: `company_id = "${companyId}"`,
    sort: '-created',
  })
}

export async function createProduct(data: FormData | Partial<Product>): Promise<Product> {
  return await pb.collection('products').create<Product>(data)
}

export async function updateProduct(
  id: string,
  data: FormData | Partial<Product>,
): Promise<Product> {
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

export async function getSaleById(id: string): Promise<Sale> {
  return await pb.collection('sales').getOne<Sale>(id, {
    expand: 'customer_id',
  })
}

export async function createSale(data: Partial<Sale>): Promise<Sale> {
  return await pb.collection('sales').create<Sale>(data)
}

export async function updateSale(id: string, data: Partial<Sale>): Promise<Sale> {
  return await pb.collection('sales').update<Sale>(id, data)
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

// Notifications
export async function getNotifications(
  companyId: string,
  userId: string,
  limit = 40,
): Promise<ErpNotification[]> {
  try {
    return await pb
      .collection('notifications')
      .getList<ErpNotification>(1, limit, {
        filter: `company_id = "${companyId}" && user_id = "${userId}"`,
        sort: '-created',
      })
      .then((res) => res.items)
  } catch (err) {
    console.error('Erro ao buscar notificações:', err)
    return []
  }
}

export async function createNotification(data: Partial<ErpNotification>): Promise<ErpNotification> {
  return await pb.collection('notifications').create<ErpNotification>(data)
}

export async function markNotificationAsRead(id: string): Promise<ErpNotification> {
  return await pb.collection('notifications').update<ErpNotification>(id, {
    read: true,
    read_at: new Date().toISOString(),
  })
}

export async function markAllNotificationsAsRead(companyId: string, userId: string): Promise<void> {
  try {
    const unread = await pb.collection('notifications').getFullList<ErpNotification>({
      filter: `company_id = "${companyId}" && user_id = "${userId}" && read = false`,
    })
    await Promise.all(
      unread.map((n) =>
        pb.collection('notifications').update(n.id, {
          read: true,
          read_at: new Date().toISOString(),
        }),
      ),
    )
  } catch (err) {
    console.error('Erro ao marcar todas como lidas:', err)
  }
}

// Quotes (Orçamentos)
export async function getQuotes(companyId: string): Promise<Quote[]> {
  return await pb.collection('quotes').getFullList<Quote>({
    filter: `company_id = "${companyId}"`,
    sort: '-issue_date',
    expand: 'customer_id',
  })
}

export async function getQuoteById(id: string): Promise<Quote> {
  return await pb.collection('quotes').getOne<Quote>(id, {
    expand: 'customer_id',
  })
}

export async function createQuote(data: Partial<Quote>): Promise<Quote> {
  return await pb.collection('quotes').create<Quote>(data)
}

export async function updateQuote(id: string, data: Partial<Quote>): Promise<Quote> {
  return await pb.collection('quotes').update<Quote>(id, data)
}

export async function deleteQuote(id: string): Promise<boolean> {
  return await pb.collection('quotes').delete(id)
}

// Supplier Quotes (Cotações & Comparativo de Fornecedores)
export async function getSupplierQuotes(companyId: string): Promise<SupplierQuote[]> {
  return await pb.collection('supplier_quotes').getFullList<SupplierQuote>({
    filter: `company_id = "${companyId}"`,
    sort: '-quote_date',
    expand: 'product_id',
  })
}

export async function getSupplierQuoteById(id: string): Promise<SupplierQuote> {
  return await pb.collection('supplier_quotes').getOne<SupplierQuote>(id, {
    expand: 'product_id',
  })
}

export async function createSupplierQuote(data: Partial<SupplierQuote>): Promise<SupplierQuote> {
  return await pb.collection('supplier_quotes').create<SupplierQuote>(data)
}

export async function updateSupplierQuote(
  id: string,
  data: Partial<SupplierQuote>,
): Promise<SupplierQuote> {
  return await pb.collection('supplier_quotes').update<SupplierQuote>(id, data)
}

export async function deleteSupplierQuote(id: string): Promise<boolean> {
  return await pb.collection('supplier_quotes').delete(id)
}

// User Tour completion
export async function markUserTourCompleted(userId: string): Promise<void> {
  try {
    await pb.collection('users').update(userId, {
      tour_completed_at: new Date().toISOString(),
    })
  } catch (err) {
    console.warn('Erro ao salvar conclusão do tour:', err)
  }
}

export async function resetUserTour(userId: string): Promise<void> {
  try {
    await pb.collection('users').update(userId, {
      tour_completed_at: null,
    })
  } catch (err) {
    console.warn('Erro ao resetar tour do usuário:', err)
  }
}

// Exportação / Backup Completo da Empresa
export interface FullCompanyBackup {
  metadata: {
    export_date: string
    system_version: string
    company_id: string
    company_name: string
    total_records: number
  }
  company: Company | null
  customers: Customer[]
  products: Product[]
  sales: Sale[]
  quotes: Quote[]
  supplier_quotes: SupplierQuote[]
  entries: Entry[]
  expenses: Expense[]
  payables: Payable[]
  receivables: Receivable[]
  movements: Movement[]
  goals: Goal[]
  agenda_events: AgendaEvent[]
}

export async function exportFullCompanyBackup(companyId: string): Promise<FullCompanyBackup> {
  const [
    company,
    customers,
    products,
    sales,
    quotes,
    supplier_quotes,
    entries,
    expenses,
    payables,
    receivables,
    movements,
    goals,
    agenda_events,
  ] = await Promise.all([
    pb
      .collection('companies')
      .getOne<Company>(companyId)
      .catch(() => null),
    pb
      .collection('customers')
      .getFullList<Customer>({ filter: `company_id = "${companyId}"` })
      .catch(() => []),
    pb
      .collection('products')
      .getFullList<Product>({ filter: `company_id = "${companyId}"` })
      .catch(() => []),
    pb
      .collection('sales')
      .getFullList<Sale>({ filter: `company_id = "${companyId}"` })
      .catch(() => []),
    pb
      .collection('quotes')
      .getFullList<Quote>({ filter: `company_id = "${companyId}"` })
      .catch(() => []),
    pb
      .collection('supplier_quotes')
      .getFullList<SupplierQuote>({ filter: `company_id = "${companyId}"` })
      .catch(() => []),
    pb
      .collection('entries')
      .getFullList<Entry>({ filter: `company_id = "${companyId}"` })
      .catch(() => []),
    pb
      .collection('expenses')
      .getFullList<Expense>({ filter: `company_id = "${companyId}"` })
      .catch(() => []),
    pb
      .collection('payables')
      .getFullList<Payable>({ filter: `company_id = "${companyId}"` })
      .catch(() => []),
    pb
      .collection('receivables')
      .getFullList<Receivable>({ filter: `company_id = "${companyId}"` })
      .catch(() => []),
    pb
      .collection('movements')
      .getFullList<Movement>({ filter: `company_id = "${companyId}"` })
      .catch(() => []),
    pb
      .collection('goals')
      .getFullList<Goal>({ filter: `company_id = "${companyId}"` })
      .catch(() => []),
    pb
      .collection('agenda_events')
      .getFullList<AgendaEvent>({ filter: `company_id = "${companyId}"` })
      .catch(() => []),
  ])

  // Acrescentar URLs das fotos/logos para facilidade de download no backup
  const enrichedProducts = products.map((p) => ({
    ...p,
    photo_download_url: p.photo ? getPbFileUrl('products', p.id, p.photo) : null,
  }))

  const enrichedCompany = company
    ? {
        ...company,
        logo_download_url: company.logo
          ? getPbFileUrl('companies', company.id, company.logo)
          : null,
      }
    : null

  const total =
    (customers.length || 0) +
    (products.length || 0) +
    (sales.length || 0) +
    (quotes.length || 0) +
    (supplier_quotes.length || 0) +
    (entries.length || 0) +
    (expenses.length || 0) +
    (payables.length || 0) +
    (receivables.length || 0) +
    (movements.length || 0) +
    (goals.length || 0) +
    (agenda_events.length || 0)

  return {
    metadata: {
      export_date: new Date().toISOString(),
      system_version: 'Automação Empresarial ERP v2.0',
      company_id: companyId,
      company_name: company?.trade_name || company?.legal_name || 'Empresa',
      total_records: total,
    },
    company: enrichedCompany,
    customers,
    products: enrichedProducts,
    sales,
    quotes,
    supplier_quotes,
    entries,
    expenses,
    payables,
    receivables,
    movements,
    goals,
    agenda_events,
  }
}
