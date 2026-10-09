migrate(
  (app) => {
    const companiesCol = app.findCollectionByNameOrId('companies')
    const productsCol = app.findCollectionByNameOrId('products')

    // 1. Coleção 'production_batches' (Lotes de Produção)
    let productionBatchesCol
    try {
      productionBatchesCol = app.findCollectionByNameOrId('production_batches')
    } catch (_) {}

    if (!productionBatchesCol) {
      const batches = new Collection({
        name: 'production_batches',
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
          { name: 'batch_number', type: 'text', required: true, max: 100 },
          { name: 'production_date', type: 'date', required: true },
          {
            name: 'product_id',
            type: 'relation',
            required: false,
            collectionId: productsCol.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'product_name', type: 'text', max: 200 },
          { name: 'quantity_produced', type: 'number', min: 0 },
          {
            name: 'status',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['aberto', 'finalizado'],
          },
          { name: 'notes', type: 'text', max: 2000 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_batches_company_number ON production_batches (company_id, batch_number)',
          'CREATE INDEX idx_batches_company_date ON production_batches (company_id, production_date DESC)',
        ],
      })
      app.save(batches)
      productionBatchesCol = batches
    }

    // 2. Coleção 'production_batch_items' (Insumos do Lote de Produção)
    let batchItemsCol
    try {
      batchItemsCol = app.findCollectionByNameOrId('production_batch_items')
    } catch (_) {}

    if (!batchItemsCol) {
      const items = new Collection({
        name: 'production_batch_items',
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
            name: 'batch_id',
            type: 'relation',
            required: true,
            collectionId: productionBatchesCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'product_id',
            type: 'relation',
            required: false,
            collectionId: productsCol.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'item_name', type: 'text', required: true, max: 200 },
          { name: 'grammage_type', type: 'text', max: 50 },
          { name: 'grammage_value', type: 'number', min: 0 },
          { name: 'supplier_batch_number', type: 'text', max: 100 },
          { name: 'manufacture_date', type: 'date' },
          { name: 'quantity_used', type: 'number', required: true, min: 0 },
          { name: 'unit_measure', type: 'text', max: 30 },
          { name: 'notes', type: 'text', max: 2000 },
          {
            name: 'attachments',
            type: 'file',
            maxSelect: 10,
            maxSize: 15728640, // 15MB
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_batch_items_batch ON production_batch_items (batch_id)',
          'CREATE INDEX idx_batch_items_company ON production_batch_items (company_id)',
          'CREATE INDEX idx_batch_items_supplier_batch ON production_batch_items (company_id, supplier_batch_number)',
        ],
      })
      app.save(items)
    }
  },
  (app) => {
    try {
      const items = app.findCollectionByNameOrId('production_batch_items')
      app.delete(items)
    } catch (_) {}
    try {
      const batches = app.findCollectionByNameOrId('production_batches')
      app.delete(batches)
    } catch (_) {}
  },
)
