/**
 * The canonical AI BVF v1.0 JSON Schema, embedded for zero-IO access.
 * Mirror of spec/bvf-protocol.schema.json at the root of this monorepo.
 */
export const bvfSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://www.aibvf.com/bvf-protocol.schema.json',
  title: 'AI BVF Portfolio v1.0',
  type: 'object',
  required: ['bvf_version', 'organization', 'initiatives'],
  properties: {
    bvf_version: { type: 'string', const: '1.0' },
    generated_at: { type: 'string', format: 'date-time' },
    organization: {
      type: 'object',
      required: ['name', 'industry'],
      properties: {
        name: { type: 'string' },
        industry: {
          type: 'string',
          enum: ['universal','creative','education','energy','financial','healthcare','logistics','manufacturing','nonprofit','professional','public_sector','real_estate','retail','technology'],
        },
        region: { type: 'string' },
        revenue_eur: { type: 'number', minimum: 0 },
        headcount: { type: 'integer', minimum: 0 },
      },
    },
    initiatives: { type: 'array', minItems: 1 },
  },
} as const;
