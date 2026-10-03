migrate(
  (app) => {
    const companiesCol = app.findCollectionByNameOrId('companies')
    const customersCol = app.findCollectionByNameOrId('customers')

    // 1. sales
    const sales = new Collection({
      name: 'sales',
      type: 'base',
      listRule: "@request.auth.id != '' && company_id.user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && company_id.user_id = @request.auth.id",
      createRule: "@request.auth.id != '' && company_id.user_id = @request.auth.id",
      updateRule: "@request.auth.id != '' && company_id.user_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && company_id.user_id = @request.auth.id",
      fields: [
        {
          name: 'company_id',
          type: 'relation',
          required: true,
          collectionId: companiesCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'customer_id', type: 'relation', collectionId: customersCol.id, maxSelect: 1 },
        { name: 'sale_date', type: 'date', required: true },
        { name: 'description', type: 'text', required: true, max: 300 },
        { name: 'amount', type: 'number', required: true, min: 0 },
        {
          name: 'status',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['Concluída', 'Pendente', 'Cancelada'],
        },
        {
          name: 'payment_method',
          type: 'select',
          maxSelect: 1,
          values: ['À vista', 'Pix', 'Cartão', 'Boleto', 'Transferência'],
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_sales_company_date ON sales (company_id, sale_date DESC)',
        'CREATE INDEX idx_sales_status ON sales (status)',
      ],
    })
    app.save(sales)

    // 2. entries (receitas)
    const entries = new Collection({
      name: 'entries',
      type: 'base',
      listRule: "@request.auth.id != '' && company_id.user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && company_id.user_id = @request.auth.id",
      createRule: "@request.auth.id != '' && company_id.user_id = @request.auth.id",
      updateRule: "@request.auth.id != '' && company_id.user_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && company_id.user_id = @request.auth.id",
      fields: [
        {
          name: 'company_id',
          type: 'relation',
          required: true,
          collectionId: companiesCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'entry_date', type: 'date', required: true },
        { name: 'description', type: 'text', required: true, max: 300 },
        {
          name: 'category',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['Venda', 'Serviço', 'Investimento', 'Outros'],
        },
        { name: 'source', type: 'text', max: 150 },
        { name: 'amount', type: 'number', required: true, min: 0 },
        {
          name: 'status',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['Recebida', 'Pendente'],
        },
        {
          name: 'payment_method',
          type: 'select',
          maxSelect: 1,
          values: ['À vista', 'Pix', 'Cartão', 'Boleto', 'Transferência'],
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_entries_company_date ON entries (company_id, entry_date DESC)',
        'CREATE INDEX idx_entries_status ON entries (status)',
      ],
    })
    app.save(entries)

    // 3. expenses (despesas)
    const expenses = new Collection({
      name: 'expenses',
      type: 'base',
      listRule: "@request.auth.id != '' && company_id.user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && company_id.user_id = @request.auth.id",
      createRule: "@request.auth.id != '' && company_id.user_id = @request.auth.id",
      updateRule: "@request.auth.id != '' && company_id.user_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && company_id.user_id = @request.auth.id",
      fields: [
        {
          name: 'company_id',
          type: 'relation',
          required: true,
          collectionId: companiesCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'expense_date', type: 'date', required: true },
        { name: 'description', type: 'text', required: true, max: 300 },
        {
          name: 'category',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: [
            'Aluguel',
            'Salários',
            'Impostos',
            'Fornecedores',
            'Transporte',
            'Marketing',
            'Utilidades',
            'Outros',
          ],
        },
        { name: 'amount', type: 'number', required: true, min: 0 },
        {
          name: 'status',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['Paga', 'Pendente'],
        },
        {
          name: 'payment_method',
          type: 'select',
          maxSelect: 1,
          values: ['À vista', 'Pix', 'Cartão', 'Boleto', 'Transferência'],
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_expenses_company_date ON expenses (company_id, expense_date DESC)',
        'CREATE INDEX idx_expenses_status ON expenses (status)',
      ],
    })
    app.save(expenses)

    // 4. payables (contas a pagar)
    const payables = new Collection({
      name: 'payables',
      type: 'base',
      listRule: "@request.auth.id != '' && company_id.user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && company_id.user_id = @request.auth.id",
      createRule: "@request.auth.id != '' && company_id.user_id = @request.auth.id",
      updateRule: "@request.auth.id != '' && company_id.user_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && company_id.user_id = @request.auth.id",
      fields: [
        {
          name: 'company_id',
          type: 'relation',
          required: true,
          collectionId: companiesCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'due_date', type: 'date', required: true },
        { name: 'description', type: 'text', required: true, max: 300 },
        { name: 'supplier', type: 'text', max: 200 },
        { name: 'amount', type: 'number', required: true, min: 0 },
        {
          name: 'status',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['Em aberto', 'Pago'],
        },
        { name: 'notes', type: 'text', max: 1000 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_payables_company_due ON payables (company_id, due_date ASC)',
        'CREATE INDEX idx_payables_status ON payables (status)',
      ],
    })
    app.save(payables)

    // 5. receivables (contas a receber)
    const receivables = new Collection({
      name: 'receivables',
      type: 'base',
      listRule: "@request.auth.id != '' && company_id.user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && company_id.user_id = @request.auth.id",
      createRule: "@request.auth.id != '' && company_id.user_id = @request.auth.id",
      updateRule: "@request.auth.id != '' && company_id.user_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && company_id.user_id = @request.auth.id",
      fields: [
        {
          name: 'company_id',
          type: 'relation',
          required: true,
          collectionId: companiesCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'due_date', type: 'date', required: true },
        { name: 'description', type: 'text', required: true, max: 300 },
        { name: 'client_id', type: 'relation', collectionId: customersCol.id, maxSelect: 1 },
        { name: 'amount', type: 'number', required: true, min: 0 },
        {
          name: 'status',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['Em aberto', 'Recebida'],
        },
        { name: 'notes', type: 'text', max: 1000 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_receivables_company_due ON receivables (company_id, due_date ASC)',
        'CREATE INDEX idx_receivables_status ON receivables (status)',
      ],
    })
    app.save(receivables)

    // 6. movements (entradas e saídas ledger)
    const movements = new Collection({
      name: 'movements',
      type: 'base',
      listRule: "@request.auth.id != '' && company_id.user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && company_id.user_id = @request.auth.id",
      createRule: "@request.auth.id != '' && company_id.user_id = @request.auth.id",
      updateRule: "@request.auth.id != '' && company_id.user_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && company_id.user_id = @request.auth.id",
      fields: [
        {
          name: 'company_id',
          type: 'relation',
          required: true,
          collectionId: companiesCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'movement_date', type: 'date', required: true },
        {
          name: 'type',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['entrada', 'saída'],
        },
        { name: 'description', type: 'text', required: true, max: 300 },
        { name: 'category', type: 'text', max: 100 },
        { name: 'amount', type: 'number', required: true, min: 0 },
        { name: 'reference', type: 'text', max: 100 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_movements_company_date ON movements (company_id, movement_date DESC)',
        'CREATE INDEX idx_movements_type ON movements (type)',
        'CREATE INDEX idx_movements_reference ON movements (company_id, reference)',
      ],
    })
    app.save(movements)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('movements'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('receivables'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('payables'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('expenses'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('entries'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('sales'))
    } catch (_) {}
  },
)
