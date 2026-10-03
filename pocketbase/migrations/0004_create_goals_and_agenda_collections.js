migrate(
  (app) => {
    const companiesCol = app.findCollectionByNameOrId('companies')
    const customersCol = app.findCollectionByNameOrId('customers')

    // 1. goals (Metas)
    const goals = new Collection({
      name: 'goals',
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
        { name: 'title', type: 'text', required: true, max: 200 },
        {
          name: 'goal_type',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: [
            'faturamento',
            'lucro',
            'vendas_qtd',
            'reducao_despesas',
            'equipamento_investimento',
            'livre',
          ],
        },
        {
          name: 'period_type',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['mensal', 'trimestral', 'semestral', 'anual'],
        },
        { name: 'start_date', type: 'date', required: true },
        { name: 'end_date', type: 'date', required: true },
        { name: 'target_value', type: 'number', required: true, min: 0 },
        { name: 'current_value', type: 'number', min: 0 },
        {
          name: 'status',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['em_andamento', 'concluida', 'cancelada'],
        },
        { name: 'notes', type: 'text', max: 1000 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_goals_company_status ON goals (company_id, status)',
        'CREATE INDEX idx_goals_company_dates ON goals (company_id, start_date, end_date)',
      ],
    })
    app.save(goals)

    // 2. agenda_events (Agenda de Pedidos e Entregas)
    const agendaEvents = new Collection({
      name: 'agenda_events',
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
        { name: 'title', type: 'text', required: true, max: 200 },
        {
          name: 'event_type',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['Pedido', 'Entrega', 'Outro'],
        },
        {
          name: 'customer_id',
          type: 'relation',
          collectionId: customersCol.id,
          maxSelect: 1,
        },
        { name: 'event_date', type: 'date', required: true },
        { name: 'event_time', type: 'text', max: 10 },
        { name: 'amount', type: 'number', min: 0 },
        {
          name: 'status',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['pendente', 'em_andamento', 'concluido', 'cancelado'],
        },
        { name: 'notes', type: 'text', max: 1000 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_agenda_company_date ON agenda_events (company_id, event_date)',
        'CREATE INDEX idx_agenda_company_status ON agenda_events (company_id, status)',
      ],
    })
    app.save(agendaEvents)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('agenda_events'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('goals'))
    } catch (_) {}
  },
)
