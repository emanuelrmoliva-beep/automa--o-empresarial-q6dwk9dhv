migrate(
  (app) => {
    const companiesCol = app.findCollectionByNameOrId('companies')
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    // 1. Adicionar campo "items" (json) na coleção "sales" para armazenar itens detalhados da venda
    const salesCol = app.findCollectionByNameOrId('sales')
    if (!salesCol.fields.getByName('items')) {
      salesCol.fields.add(
        new JSONField({
          name: 'items',
          maxSize: 524288,
        }),
      )
      app.save(salesCol)
    }

    // 2. Criar coleção "notifications"
    let notificationsCol
    try {
      notificationsCol = app.findCollectionByNameOrId('notifications')
    } catch (_) {}

    if (!notificationsCol) {
      const notifications = new Collection({
        name: 'notifications',
        type: 'base',
        listRule: "@request.auth.id != '' && user_id = @request.auth.id",
        viewRule: "@request.auth.id != '' && user_id = @request.auth.id",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != '' && user_id = @request.auth.id",
        deleteRule: "@request.auth.id != '' && user_id = @request.auth.id",
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
            name: 'user_id',
            type: 'relation',
            required: true,
            collectionId: usersCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'type',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: [
              'vencimento_pagar',
              'vencimento_receber',
              'estoque_baixo',
              'agenda_hoje',
              'sistema',
            ],
          },
          { name: 'title', type: 'text', required: true, max: 200 },
          { name: 'body', type: 'text', required: true, max: 1000 },
          { name: 'ref_id', type: 'text', max: 150 },
          { name: 'read', type: 'bool' },
          { name: 'read_at', type: 'date' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_notifications_user_company ON notifications (user_id, company_id)',
          'CREATE INDEX idx_notifications_read ON notifications (read)',
          'CREATE INDEX idx_notifications_ref ON notifications (type, ref_id)',
        ],
      })
      app.save(notifications)
    }
  },
  (app) => {
    try {
      const notificationsCol = app.findCollectionByNameOrId('notifications')
      app.delete(notificationsCol)
    } catch (_) {}

    try {
      const salesCol = app.findCollectionByNameOrId('sales')
      const itemsField = salesCol.fields.getByName('items')
      if (itemsField) {
        salesCol.fields.removeByName('items')
        app.save(salesCol)
      }
    } catch (_) {}
  },
)
