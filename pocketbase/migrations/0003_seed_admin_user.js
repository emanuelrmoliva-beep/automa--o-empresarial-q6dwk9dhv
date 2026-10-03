migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // Idempotent: check if user already exists
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'emanuel.r.m.oliva@gmail.com')
      return
    } catch (_) {}

    const record = new Record(users)
    record.setEmail('emanuel.r.m.oliva@gmail.com')
    record.setPassword('Skip@Pass')
    record.setVerified(true)
    record.set('name', 'Emanuel Oliva')
    app.save(record)
  },
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', 'emanuel.r.m.oliva@gmail.com')
      app.delete(record)
    } catch (_) {}
  },
)
