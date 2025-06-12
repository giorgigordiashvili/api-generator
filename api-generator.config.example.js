// Example configuration file for @gordela/api-generator
// Copy this file and modify according to your needs

module.exports = {
  // Base URL of your API (required)
  apiUrl: 'https://api.sprtverse.com',
  
  // Path to the OpenAPI/Swagger JSON endpoint (required)
  swaggerPath: '/docs?api-docs.json',
  
  // Output directory for generated files (optional, default: 'api/generated')
  outputDir: './src/api/generated',
  
  // Namespace for generated interfaces and types (optional, default: 'ApiClient')
  namespace: 'SportverseApi',
};

// Alternative configurations for different environments:

// For development
// module.exports = {
//   apiUrl: 'http://localhost:3000',
//   swaggerPath: '/api-docs',
//   outputDir: './src/api/generated',
//   namespace: 'DevApi',
// };

// For production
// module.exports = {
//   apiUrl: 'https://api.production.com',
//   swaggerPath: '/openapi.json',
//   outputDir: './src/api/generated',
//   namespace: 'ProdApi',
// };
