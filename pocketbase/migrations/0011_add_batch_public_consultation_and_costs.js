migrate(
  (app) => {
    // 1. Atualizar a coleção 'production_batches'
    const batchesCol = app.findCollectionByNameOrId('production_batches')

    if (!batchesCol.fields.getByName('is_public')) {
      batchesCol.fields.add(
        new BoolField({
          name: 'is_public',
          required: false,
        }),
      )
    }

    if (!batchesCol.fields.getByName('public_token')) {
      batchesCol.fields.add(
        new TextField({
          name: 'public_token',
          max: 64,
          required: false,
        }),
      )
    }

    if (!batchesCol.fields.getByName('total_cost')) {
      batchesCol.fields.add(
        new NumberField({
          name: 'total_cost',
          min: 0,
          required: false,
        }),
      )
    }

    // Regra de leitura (listRule e viewRule):
    // Usuário autenticado proprietário OU consulta pública se is_public = true e public_token não vazio
    batchesCol.listRule =
      "(@request.auth.id != '' && company_id.user_id = @request.auth.id) || (is_public = true && public_token != '')"
    batchesCol.viewRule =
      "(@request.auth.id != '' && company_id.user_id = @request.auth.id) || (is_public = true && public_token != '')"

    batchesCol.addIndex('idx_batches_public_token', false, 'public_token', '')
    app.save(batchesCol)

    // 2. Atualizar a coleção 'production_batch_items'
    const itemsCol = app.findCollectionByNameOrId('production_batch_items')

    if (!itemsCol.fields.getByName('unit_cost')) {
      itemsCol.fields.add(
        new NumberField({
          name: 'unit_cost',
          min: 0,
          required: false,
        }),
      )
    }

    if (!itemsCol.fields.getByName('total_cost')) {
      itemsCol.fields.add(
        new NumberField({
          name: 'total_cost',
          min: 0,
          required: false,
        }),
      )
    }

    // Regra de leitura de insumos:
    // Proprietário OU lote associado é público
    itemsCol.listRule =
      "(@request.auth.id != '' && company_id.user_id = @request.auth.id) || (batch_id.is_public = true && batch_id.public_token != '')"
    itemsCol.viewRule =
      "(@request.auth.id != '' && company_id.user_id = @request.auth.id) || (batch_id.is_public = true && batch_id.public_token != '')"

    app.save(itemsCol)
  },
  (app) => {
    try {
      const batchesCol = app.findCollectionByNameOrId('production_batches')
      batchesCol.listRule = "@request.auth.id != '' && company_id.user_id = @request.auth.id"
      batchesCol.viewRule = "@request.auth.id != '' && company_id.user_id = @request.auth.id"
      try {
        batchesCol.removeIndex('idx_batches_public_token')
      } catch (_) {}
      batchesCol.fields.removeByName('is_public')
      batchesCol.fields.removeByName('public_token')
      batchesCol.fields.removeByName('total_cost')
      app.save(batchesCol)
    } catch (_) {}

    try {
      const itemsCol = app.findCollectionByNameOrId('production_batch_items')
      itemsCol.listRule = "@request.auth.id != '' && company_id.user_id = @request.auth.id"
      itemsCol.viewRule = "@request.auth.id != '' && company_id.user_id = @request.auth.id"
      itemsCol.fields.removeByName('unit_cost')
      itemsCol.fields.removeByName('total_cost')
      app.save(itemsCol)
    } catch (_) {}
  },
)
