// pocketbase/hooks/movements_sync.js
// Sincroniza movimentações (entradas/saídas) quando contas a pagar/receber são quitadas
// ou quando receitas/despesas são registradas já recebidas/pagas.

onRecordAfterCreateSuccess(
  (e) => {
    try {
      const record = e.record
      const collectionName = record.collection().name

      if (collectionName === 'entries') {
        const status = record.getString('status')
        if (status === 'Recebida') {
          const companyId = record.getString('company_id')
          const id = record.getId()
          const ref = 'entries/' + id

          // Idempotência
          try {
            $app.findFirstRecordByData('movements', 'reference', ref)
            return
          } catch (_) {}

          const movementsCol = $app.findCollectionByNameOrId('movements')
          const mov = new Record(movementsCol)
          mov.set('company_id', companyId)
          mov.set(
            'movement_date',
            record.getString('entry_date') || new Date().toISOString().split('T')[0],
          )
          mov.set('type', 'entrada')
          mov.set('description', record.getString('description'))
          mov.set('category', record.getString('category') || 'Receita')
          mov.set('amount', record.getFloat('amount'))
          mov.set('reference', ref)
          $app.save(mov)
        }
      } else if (collectionName === 'expenses') {
        const status = record.getString('status')
        if (status === 'Paga') {
          const companyId = record.getString('company_id')
          const id = record.getId()
          const ref = 'expenses/' + id

          try {
            $app.findFirstRecordByData('movements', 'reference', ref)
            return
          } catch (_) {}

          const movementsCol = $app.findCollectionByNameOrId('movements')
          const mov = new Record(movementsCol)
          mov.set('company_id', companyId)
          mov.set(
            'movement_date',
            record.getString('expense_date') || new Date().toISOString().split('T')[0],
          )
          mov.set('type', 'saída')
          mov.set('description', record.getString('description'))
          mov.set('category', record.getString('category') || 'Despesa')
          mov.set('amount', record.getFloat('amount'))
          mov.set('reference', ref)
          $app.save(mov)
        }
      }
    } catch (err) {
      console.error('Erro no hook onRecordAfterCreateSuccess movements_sync:', err)
    }
    e.next()
  },
  'entries',
  'expenses',
)

onRecordAfterUpdateSuccess(
  (e) => {
    try {
      const record = e.record
      const original = record.original()
      const collectionName = record.collection().name

      if (collectionName === 'payables') {
        const oldStatus = original ? original.getString('status') : ''
        const newStatus = record.getString('status')

        if (oldStatus !== 'Pago' && newStatus === 'Pago') {
          const companyId = record.getString('company_id')
          const id = record.getId()
          const ref = 'payables/' + id

          try {
            $app.findFirstRecordByData('movements', 'reference', ref)
            return
          } catch (_) {}

          const movementsCol = $app.findCollectionByNameOrId('movements')
          const mov = new Record(movementsCol)
          mov.set('company_id', companyId)
          mov.set('movement_date', new Date().toISOString().split('T')[0])
          mov.set('type', 'saída')
          mov.set('description', record.getString('description'))
          mov.set('category', 'Contas a Pagar')
          mov.set('amount', record.getFloat('amount'))
          mov.set('reference', ref)
          $app.save(mov)
        }
      } else if (collectionName === 'receivables') {
        const oldStatus = original ? original.getString('status') : ''
        const newStatus = record.getString('status')

        if (oldStatus !== 'Recebida' && newStatus === 'Recebida') {
          const companyId = record.getString('company_id')
          const id = record.getId()
          const ref = 'receivables/' + id

          try {
            $app.findFirstRecordByData('movements', 'reference', ref)
            return
          } catch (_) {}

          const movementsCol = $app.findCollectionByNameOrId('movements')
          const mov = new Record(movementsCol)
          mov.set('company_id', companyId)
          mov.set('movement_date', new Date().toISOString().split('T')[0])
          mov.set('type', 'entrada')
          mov.set('description', record.getString('description'))
          mov.set('category', 'Contas a Receber')
          mov.set('amount', record.getFloat('amount'))
          mov.set('reference', ref)
          $app.save(mov)
        }
      }
    } catch (err) {
      console.error('Erro no hook onRecordAfterUpdateSuccess movements_sync:', err)
    }
    e.next()
  },
  'payables',
  'receivables',
)
