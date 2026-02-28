const UploadSchema = {
  upload: {
    tags: ['Upload'],
    summary: 'Upload file',
    description: 'Upload a file (multipart)',
    body: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  },
  getCDNUrl: {
    tags: ['Upload'],
    summary: 'Get CDN URL',
    description: 'Get CDN URL for an uploaded file by key',
    querystring: {
      type: 'object',
      properties: {
        key: { type: 'string' },
      },
    },
  },
}

export default UploadSchema
