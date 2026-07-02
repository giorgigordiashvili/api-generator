// Unit test: enum component schemas must generate as string/number union type
// aliases, not `interface X { [key: string]: any }`.
const assert = require('assert');
const { ApiGenerator } = require('../dist/index');

function run() {
  console.log('🧪 Testing enum type generation...');

  const generator = new ApiGenerator({
    apiUrl: 'https://example.com',
    swaggerPath: '/schema',
    outputDir: '/tmp/enum-test-output',
    namespace: 'TestApi',
  });

  const spec = {
    openapi: '3.0.3',
    info: { title: 'test', version: '1.0.0' },
    paths: {},
    components: {
      schemas: {
        DeliveryMethodEnum: {
          enum: ['courier', 'pickup'],
          type: 'string',
        },
        StatusCodeEnum: {
          enum: [1, 2, 3],
          type: 'integer',
        },
        // A genuinely empty object schema must still fall back to the loose
        // index-signature interface (not become an enum).
        EmptyBag: {},
        Order: {
          type: 'object',
          properties: {
            delivery_method: { allOf: [{ $ref: '#/components/schemas/DeliveryMethodEnum' }] },
          },
        },
      },
    },
  };

  // generateInterfaces is private in TS but callable at runtime.
  const out = generator['generateInterfaces'](spec);

  assert.ok(
    out.includes("export type DeliveryMethodEnum = 'courier' | 'pickup';"),
    'string enum should be a union type alias'
  );
  assert.ok(
    !/interface DeliveryMethodEnum/.test(out),
    'string enum must NOT be an interface'
  );
  assert.ok(
    out.includes('export type StatusCodeEnum = 1 | 2 | 3;'),
    'integer enum should be a numeric union type alias'
  );
  assert.ok(
    out.includes('export interface EmptyBag {\n  [key: string]: any;\n}'),
    'truly empty object schema should still fall back to index-signature interface'
  );
  // The referencing property resolves to the enum name, which is now a union.
  assert.ok(
    /delivery_method\?: DeliveryMethodEnum;/.test(out),
    'property should reference the enum type by name'
  );

  console.log('✅ enum union type generation works');
}

if (require.main === module) {
  try {
    run();
    console.log('🎉 enum test passed');
  } catch (e) {
    console.error('❌ enum test failed:', e.message);
    process.exit(1);
  }
}

module.exports = { run };
