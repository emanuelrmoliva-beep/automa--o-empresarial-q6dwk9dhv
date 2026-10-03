migrate(
  (app) => {
    const companiesCol = app.findCollectionByNameOrId('companies')
    const customersCol = app.findCollectionByNameOrId('customers')
    const productsCol = app.findCollectionByNameOrId('products')

    // 1. Coleção 'quotes' (Orçamentos)
    let quotesCol
    try {
      quotesCol = app.findCollectionByNameOrId('quotes')
    } catch (_) {}

    if (!quotesCol) {
      const quotes = new Collection({
        name: 'quotes',
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
          {
            name: 'customer_id',
            type: 'relation',
            collectionId: customersCol.id,
            maxSelect: 1,
          },
          { name: 'quote_number', type: 'text', max: 50 },
          { name: 'title', type: 'text', required: true, max: 200 },
          { name: 'issue_date', type: 'date', required: true },
          { name: 'valid_until', type: 'date' },
          { name: 'customer_name', type: 'text', max: 200 },
          { name: 'customer_contact', type: 'text', max: 100 },
          {
            name: 'status',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['Rascunho', 'Enviado', 'Aprovado', 'Recusado', 'Convertido'],
          },
          { name: 'items', type: 'json', maxSize: 524288 },
          { name: 'subtotal', type: 'number', min: 0 },
          { name: 'discount', type: 'number', min: 0 },
          { name: 'total_amount', type: 'number', required: true, min: 0 },
          { name: 'payment_terms', type: 'text', max: 300 },
          { name: 'notes', type: 'text', max: 2000 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_quotes_company_date ON quotes (company_id, issue_date DESC)',
          'CREATE INDEX idx_quotes_status ON quotes (status)',
        ],
      })
      app.save(quotes)
    }

    // 2. Coleção 'supplier_quotes' (Cotações & Comparativo de Fornecedores)
    let supplierQuotesCol
    try {
      supplierQuotesCol = app.findCollectionByNameOrId('supplier_quotes')
    } catch (_) {}

    if (!supplierQuotesCol) {
      const supplierQuotes = new Collection({
        name: 'supplier_quotes',
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
          {
            name: 'product_id',
            type: 'relation',
            collectionId: productsCol.id,
            maxSelect: 1,
          },
          { name: 'item_name', type: 'text', required: true, max: 200 },
          { name: 'quote_date', type: 'date', required: true },
          { name: 'quantity_needed', type: 'number', min: 0 },
          {
            name: 'status',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['Em Aberto', 'Concluída', 'Cancelada'],
          },
          { name: 'chosen_supplier_index', type: 'number' },
          { name: 'suppliers', type: 'json', maxSize: 524288 },
          { name: 'notes', type: 'text', max: 2000 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_supplier_quotes_company ON supplier_quotes (company_id, quote_date DESC)',
          'CREATE INDEX idx_supplier_quotes_product ON supplier_quotes (product_id)',
        ],
      })
      app.save(supplierQuotes)
    }
  },
  (app) => {
    try {
      const supplierQuotes = app.findCollectionByNameOrId('supplier_quotes')
      app.delete(supplierQuotes)
    } catch (_) {}

    try {
      const quotes = app.findCollectionByNameOrId('quotes')
      app.delete(quotes)
    } catch (_) {}
  },
)
