const UploadSchema = {
  upload: {
    tags: ['upload'],
    body: {
      type: 'object',
      properties: {
        file: { type: 'string' },
      },
    },
  },
  getCDNUrl: {
    tags: ['upload'],
    querystring: {
      type: 'object',
      properties: {
        key: { type: 'string' },
      },
    },
  },
}

export default UploadSchema
