const UserSchema = {
  list: {
    querystring: {
      type: 'object',
      properties: {
        page: { type: 'integer', minimum: 1 },
        limit: { type: 'integer', minimum: 25 },
      },
    },
  },

  detail: {
    params: {
      type: 'object',
      required: [
        'id',
      ],
      properties: {
        id: { type: 'integer' },
      },
    },
  },

  create: {
    body: {
      type: 'object',
      required: [
        'name',
        'username',
        'password',
        'confirmPassword',
      ],
      properties: {
        name: { type: 'string' },
        username: { type: 'string' },
        password: { type: 'string' },
        confirmPassword: { type: 'string' },
      },
    },
  },

  update: {
    body: {
      type: 'object',
      required: [
        'id',
      ],
      properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
        username: { type: 'string' },
        oldPassword: { type: 'string' },
        newPassword: { type: 'string' },
        confirmPassword: { type: 'string' },
      },
    },
  },

  delete: {
    params: {
      type: 'object',
      required: [
        'id',
      ],
      properties: {
        id: { type: 'integer' },
      },
    },
  },
}

export default UserSchema
