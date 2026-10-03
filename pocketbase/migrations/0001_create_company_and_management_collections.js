migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    // 1. companies collection
    const companies = new Collection({
      name: 'companies',
      type: 'base',
      listRule: "@request.auth.id != '' && user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && user_id = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user_id = @request.auth.id",
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: usersCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'legal_name', type: 'text', required: true, max: 200 },
        { name: 'trade_name', type: 'text', required: true, max: 200 },
        { name: 'cnpj', type: 'text', required: true, max: 25 },
        { name: 'foundation_date', type: 'date', required: true },
        {
          name: 'business_activity',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: [
            'Comércio',
            'Serviços',
            'Indústria',
            'Restaurante/Alimentação',
            'Tecnologia',
            'Construção',
            'Vestuário',
            'Outros',
          ],
        },
        { name: 'business_activity_other', type: 'text', max: 100 },
        { name: 'zip_code', type: 'text', required: true, max: 15 },
        { name: 'address', type: 'text', required: true, max: 200 },
        { name: 'number', type: 'text', required: true, max: 20 },
        { name: 'complement', type: 'text', max: 100 },
        { name: 'district', type: 'text', required: true, max: 100 },
        { name: 'city', type: 'text', required: true, max: 100 },
        {
          name: 'state',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: [
            'AC',
            'AL',
            'AP',
            'AM',
            'BA',
            'CE',
            'DF',
            'ES',
            'GO',
            'MA',
            'MT',
            'MS',
            'MG',
            'PA',
            'PB',
            'PR',
            'PE',
            'PI',
            'RJ',
            'RN',
            'RS',
            'RO',
            'RR',
            'SC',
            'SP',
            'SE',
            'TO',
          ],
        },
        { name: 'phone', type: 'text', required: true, max: 25 },
        { name: 'contact_email', type: 'email', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_companies_user ON companies (user_id)',
        'CREATE UNIQUE INDEX idx_companies_cnpj ON companies (cnpj)',
        'CREATE INDEX idx_companies_city_state ON companies (city, state)',
      ],
    })
    app.save(companies)

    const companiesCol = app.findCollectionByNameOrId('companies')

    // 2. products collection
    const products = new Collection({
      name: 'products',
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
        { name: 'name', type: 'text', required: true, max: 200 },
        { name: 'sku', type: 'text', required: true, max: 60 },
        {
          name: 'category',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['Produtos', 'Alimentos', 'Bebidas', 'Vestuário', 'Serviços', 'Outros'],
        },
        { name: 'cost_price', type: 'number', required: true, min: 0 },
        { name: 'selling_price', type: 'number', required: true, min: 0 },
        { name: 'quantity', type: 'number', required: true, min: 0 },
        { name: 'min_stock', type: 'number', min: 0 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_products_company ON products (company_id)',
        'CREATE INDEX idx_products_company_sku ON products (company_id, sku)',
        'CREATE INDEX idx_products_category ON products (category)',
      ],
    })
    app.save(products)

    // 3. customers collection
    const customers = new Collection({
      name: 'customers',
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
          name: 'client_type',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['Pessoa Jurídica', 'Pessoa Física'],
        },
        { name: 'name', type: 'text', required: true, max: 200 },
        { name: 'document', type: 'text', required: true, max: 30 },
        { name: 'email', type: 'email' },
        { name: 'phone', type: 'text', max: 30 },
        { name: 'address', type: 'text', max: 300 },
        { name: 'notes', type: 'text', max: 1000 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_customers_company ON customers (company_id)',
        'CREATE INDEX idx_customers_document ON customers (document)',
      ],
    })
    app.save(customers)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('customers'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('products'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('companies'))
    } catch (_) {}
  },
)
