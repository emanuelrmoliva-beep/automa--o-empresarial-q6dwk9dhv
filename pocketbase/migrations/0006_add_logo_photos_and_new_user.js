migrate(
  (app) => {
    // 1. Adicionar campo 'logo' na coleção 'companies'
    const companiesCol = app.findCollectionByNameOrId('companies')
    if (!companiesCol.fields.getByName('logo')) {
      companiesCol.fields.add(
        new FileField({
          name: 'logo',
          maxSelect: 1,
          maxSize: 5242880, // 5MB
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
        }),
      )
      app.save(companiesCol)
    }

    // 2. Adicionar campo 'photo' na coleção 'products'
    const productsCol = app.findCollectionByNameOrId('products')
    if (!productsCol.fields.getByName('photo')) {
      productsCol.fields.add(
        new FileField({
          name: 'photo',
          maxSelect: 1,
          maxSize: 5242880, // 5MB
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        }),
      )
      app.save(productsCol)
    }

    // 3. Criar usuário anajuliasaab@outlook.com com senha Senha100$
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'anajuliasaab@outlook.com')
    } catch (_) {
      const newUser = new Record(users)
      newUser.setEmail('anajuliasaab@outlook.com')
      newUser.setPassword('Senha100$')
      newUser.setVerified(true)
      newUser.set('name', 'Ana Julia Saab')
      app.save(newUser)
    }
  },
  (app) => {
    try {
      const companiesCol = app.findCollectionByNameOrId('companies')
      if (companiesCol.fields.getByName('logo')) {
        companiesCol.fields.removeByName('logo')
        app.save(companiesCol)
      }
    } catch (_) {}

    try {
      const productsCol = app.findCollectionByNameOrId('products')
      if (productsCol.fields.getByName('photo')) {
        productsCol.fields.removeByName('photo')
        app.save(productsCol)
      }
    } catch (_) {}

    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'anajuliasaab@outlook.com')
      app.delete(user)
    } catch (_) {}
  },
)
