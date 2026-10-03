migrate(
  (app) => {
    const companiesCol = app.findCollectionByNameOrId('companies')

    // 1. Coleção 'loyalty_tiers' (Faixas do Programa de Fidelidade)
    let loyaltyTiersCol
    try {
      loyaltyTiersCol = app.findCollectionByNameOrId('loyalty_tiers')
    } catch (_) {}

    if (!loyaltyTiersCol) {
      const loyaltyTiers = new Collection({
        name: 'loyalty_tiers',
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
          { name: 'name', type: 'text', required: true, max: 100 },
          {
            name: 'criterion_type',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['total_spent', 'sales_count', 'average_ticket', 'days_recent'],
          },
          { name: 'min_value', type: 'number', required: true, min: 0 },
          { name: 'tier_order', type: 'number', required: true, min: 1 },
          {
            name: 'badge_icon',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['trophy', 'medal', 'award', 'crown', 'star', 'shield', 'gem'],
          },
          {
            name: 'badge_color',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['amber', 'slate', 'yellow', 'cyan', 'emerald', 'violet', 'rose', 'blue'],
          },
          { name: 'description', type: 'text', max: 500 },
          { name: 'benefits', type: 'text', max: 1000 },
          { name: 'discount_percent', type: 'number', min: 0, max: 100 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_loyalty_company_order ON loyalty_tiers (company_id, tier_order ASC)',
        ],
      })
      app.save(loyaltyTiers)
    }
  },
  (app) => {
    try {
      const loyaltyTiers = app.findCollectionByNameOrId('loyalty_tiers')
      app.delete(loyaltyTiers)
    } catch (_) {}
  },
)
