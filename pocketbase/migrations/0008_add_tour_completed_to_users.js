migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    if (!users.fields.getByName('tour_completed_at')) {
      users.fields.add(
        new DateField({
          name: 'tour_completed_at',
          required: false,
        }),
      )
    }
    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const field = users.fields.getByName('tour_completed_at')
    if (field) {
      users.fields.remove(field)
      app.save(users)
    }
  },
)
