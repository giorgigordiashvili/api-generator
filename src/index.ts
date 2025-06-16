import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as prettier from 'prettier';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface GeneratorConfig {
  apiUrl: string;
  swaggerPath: string;
  outputDir: string;
  namespace: string;
  configFilePath?: string;
}

export interface OpenAPISpec {
  paths: Record<string, any>;
  components?: {
    schemas?: Record<string, any>;
  };
  definitions?: Record<string, any>;
}

export class ApiGenerator {
  private config: GeneratorConfig;

  constructor(config: Partial<GeneratorConfig> = {}) {
    // Default configuration
    this.config = {
      apiUrl: 'https://api.sprtverse.com',
      swaggerPath: '/docs?api-docs.json',
      outputDir: path.resolve(process.cwd(), 'api/generated'),
      namespace: 'ApiClient',
      ...config,
    };

    // Try to load config file first
    if (this.config.configFilePath) {
      this.loadConfigFile(this.config.configFilePath);
    }

    // Environment variables override config file settings
    this.loadEnvironmentVariables();
  }

  private loadConfigFile(configPath: string): void {
    try {
      const configFile = require(configPath);
      this.config = { ...this.config, ...configFile };
      
      if (configFile.outputDir) {
        this.config.outputDir = path.resolve(process.cwd(), configFile.outputDir);
      }
      
      console.log('✅ Loaded configuration from config file');
    } catch (error) {
      console.log('ℹ️  Config file not found or invalid');
    }
  }

  private loadEnvironmentVariables(): void {
    if (process.env.API_URL) {
      this.config.apiUrl = process.env.API_URL;
      console.log('🔧 Using API_URL from environment:', process.env.API_URL);
    }

    if (process.env.SWAGGER_PATH) {
      this.config.swaggerPath = process.env.SWAGGER_PATH;
      console.log('🔧 Using SWAGGER_PATH from environment:', process.env.SWAGGER_PATH);
    }

    if (process.env.API_NAMESPACE) {
      this.config.namespace = process.env.API_NAMESPACE;
      console.log('🔧 Using API_NAMESPACE from environment:', process.env.API_NAMESPACE);
    }

    if (process.env.OUTPUT_DIR) {
      this.config.outputDir = path.resolve(process.cwd(), process.env.OUTPUT_DIR);
      console.log('🔧 Using OUTPUT_DIR from environment:', process.env.OUTPUT_DIR);
    }
  }

  private sanitizeParameterName(name: string): string {
    // Remove array brackets and other special characters, convert to camelCase
    return name
      .replace(/\[\]/g, '') // Remove array brackets
      .replace(/[^a-zA-Z0-9_]/g, '_') // Replace special chars with underscore
      .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
      .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()); // Convert to camelCase
  }

  // Utility functions
  private toPascalCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .split('_')
      .filter(word => word.length > 0)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  private toCamelCase(str: string): string {
    const pascalCase = str
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .split('_')
      .filter(word => word.length > 0)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
    
    return pascalCase.charAt(0).toLowerCase() + pascalCase.slice(1);
  }

  private extractTypesFromString(typeString: string, definitions: Record<string, any>): Set<string> {
    const types = new Set<string>();
    const definedTypeNames = Object.keys(definitions).map(name => this.toPascalCase(name));
    
    // Find all PascalCase words that match defined types
    // This regex looks for PascalCase words (starting with uppercase, followed by letters/numbers)
    // and also handles types in complex structures like Promise<{ data?: TypeName; }>
    const typeMatches = typeString.match(/[A-Z][a-zA-Z0-9]*(?=[\s\[\]<>{}();,?:|&]|$)/g) || [];
    
    for (const match of typeMatches) {
      if (definedTypeNames.includes(match)) {
        types.add(match);
      }
    }
    
    // Also search for types used in property definitions (e.g., "data?: TypeName")
    const propertyTypeMatches = typeString.match(/:\s*([A-Z][a-zA-Z0-9]*)/g) || [];
    for (const match of propertyTypeMatches) {
      const typeName = match.replace(/:\s*/, '');
      if (definedTypeNames.includes(typeName)) {
        types.add(typeName);
      }
    }
    
    return types;
  }

  private extractTypesFromSchema(schema: any, definitions: Record<string, any>): Set<string> {
    const types = new Set<string>();
    
    if (!schema) return types;

    // Handle direct reference
    if (schema.$ref) {
      const refName = schema.$ref.split('/').pop();
      if (refName && definitions[refName]) {
        types.add(this.toPascalCase(refName));
      }
      return types;
    }

    // Handle arrays
    if (schema.type === 'array' && schema.items) {
      const nestedTypes = this.extractTypesFromSchema(schema.items, definitions);
      nestedTypes.forEach(type => types.add(type));
    }

    // Handle object properties
    if (schema.properties) {
      Object.values(schema.properties).forEach((prop: any) => {
        const nestedTypes = this.extractTypesFromSchema(prop, definitions);
        nestedTypes.forEach(type => types.add(type));
      });
    }

    // Handle allOf, oneOf, anyOf
    ['allOf', 'oneOf', 'anyOf'].forEach(key => {
      if (schema[key] && Array.isArray(schema[key])) {
        schema[key].forEach((subSchema: any) => {
          const nestedTypes = this.extractTypesFromSchema(subSchema, definitions);
          nestedTypes.forEach(type => types.add(type));
        });
      }
    });

    return types;
  }

  private getTypeFromSchema(schema: any, definitions: Record<string, any>): string {
    if (!schema) return 'unknown';

    if (schema.$ref) {
      const refName = schema.$ref.split('/').pop();
      const pascalName = this.toPascalCase(refName);
      if (definitions && definitions[refName]) {
        return pascalName;
      }
      return pascalName;
    }

    // Handle oneOf (union types)
    if (schema.oneOf && Array.isArray(schema.oneOf)) {
      const unionTypes = schema.oneOf.map((subSchema: any) => 
        this.getTypeFromSchema(subSchema, definitions)
      );
      return unionTypes.join(' | ');
    }

    // Handle allOf (intersection types)
    if (schema.allOf && Array.isArray(schema.allOf)) {
      // For allOf, we often want to merge properties
      let mergedProperties: any = {};
      let mergedRequired: string[] = [];
      let baseTypes: string[] = [];

      for (const subSchema of schema.allOf) {
        if (subSchema.$ref) {
          const refName = subSchema.$ref.split('/').pop();
          if (refName) {
            const typeName = this.toPascalCase(refName);
            baseTypes.push(typeName);
          }
        } else if (subSchema.properties) {
          mergedProperties = { ...mergedProperties, ...subSchema.properties };
          if (subSchema.required) {
            mergedRequired = [...mergedRequired, ...subSchema.required];
          }
        }
      }

      // If we have base types and additional properties, create an intersection
      if (baseTypes.length > 0 && Object.keys(mergedProperties).length > 0) {
        const additionalProps = Object.entries(mergedProperties)
          .map(([key, value]) => {
            const isRequired = mergedRequired.includes(key);
            const propType = this.getTypeFromSchema(value, definitions);
            return `  ${key}${isRequired ? '' : '?'}: ${propType};`;
          })
          .join('\n');
        
        return `${baseTypes.join(' & ')} & {\n${additionalProps}\n}`;
      }

      // If only base types, return intersection
      if (baseTypes.length > 0) {
        return baseTypes.join(' & ');
      }

      // If only properties, return object type
      if (Object.keys(mergedProperties).length > 0) {
        const props = Object.entries(mergedProperties)
          .map(([key, value]) => {
            const isRequired = mergedRequired.includes(key);
            const propType = this.getTypeFromSchema(value, definitions);
            return `  ${key}${isRequired ? '' : '?'}: ${propType};`;
          })
          .join('\n');
        return `{\n${props}\n}`;
      }
    }

    // Handle anyOf (union types, similar to oneOf)
    if (schema.anyOf && Array.isArray(schema.anyOf)) {
      const unionTypes = schema.anyOf.map((subSchema: any) => 
        this.getTypeFromSchema(subSchema, definitions)
      );
      return unionTypes.join(' | ');
    }

    if (schema.type === 'string') {
      if (schema.format === 'date-time') return 'string';
      if (schema.format === 'email') return 'string';
      if (schema.enum) return schema.enum.map((e: string) => `'${e}'`).join(' | ');
      return 'string';
    }

    if (schema.type === 'number' || schema.type === 'integer') {
      return 'number';
    }

    if (schema.type === 'boolean') {
      return 'boolean';
    }

    if (schema.type === 'array') {
      const itemType = this.getTypeFromSchema(schema.items, definitions);
      // Handle complex types in arrays by wrapping in parentheses if needed
      if (itemType.includes(' | ') || itemType.includes(' & ')) {
        return `(${itemType})[]`;
      }
      return `${itemType}[]`;
    }

    // Handle enum at the schema level (not just in string type)
    if (schema.enum) {
      if (schema.type === 'string' || !schema.type) {
        return schema.enum.map((e: string) => `'${e}'`).join(' | ');
      }
      return schema.enum.join(' | ');
    }

    if (schema.type === 'object' || schema.properties) {
      if (schema.properties) {
        const props = Object.entries(schema.properties)
          .map(([key, value]) => {
            const isRequired = schema.required && schema.required.includes(key);
            const propType = this.getTypeFromSchema(value, definitions);
            return `  ${key}${isRequired ? '' : '?'}: ${propType};`;
          })
          .join('\n');
        return `{\n${props}\n}`;
      }
      return 'Record<string, any>';
    }

    // If no type is specified but has properties, treat as object
    if (schema.properties) {
      const props = Object.entries(schema.properties)
        .map(([key, value]) => {
          const isRequired = schema.required && schema.required.includes(key);
          const propType = this.getTypeFromSchema(value, definitions);
          return `  ${key}${isRequired ? '' : '?'}: ${propType};`;
        })
        .join('\n');
      return `{\n${props}\n}`;
    }

    return 'any';
  }

  private generateInterfaces(openApiSpec: OpenAPISpec): string {
    const definitions = openApiSpec.components?.schemas || openApiSpec.definitions || {};

    return Object.entries(definitions)
      .map(([name, schema]: [string, any]) => {
        const interfaceName = this.toPascalCase(name);
        const properties = schema.properties || {};
        const required = schema.required || [];

        if (Object.keys(properties).length === 0) {
          return `export interface ${interfaceName} {\n  [key: string]: any;\n}`;
        }

        const props = Object.entries(properties)
          .map(([key, value]) => {
            const isRequired = required.includes(key);
            const propType = this.getTypeFromSchema(value, definitions);
            return `  ${key}${isRequired ? '' : '?'}: ${propType};`;
          })
          .join('\n');

        return `export interface ${interfaceName} {\n${props}\n}`;
      })
      .join('\n\n');
  }

  private generateApiMethods(openApiSpec: OpenAPISpec): { methods: string; usedTypes: Set<string> } {
    const paths = openApiSpec.paths || {};
    const definitions = openApiSpec.components?.schemas || openApiSpec.definitions || {};
    const usedTypes = new Set<string>();

    const methods = Object.entries(paths)
      .flatMap(([path, pathMethods]: [string, any]) =>
        Object.entries(pathMethods)
          .filter(([method]) => ['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase()))
          .map(([method, operation]: [string, any]) => {
            const operationId = operation.operationId || `${method}${path.replace(/[^a-zA-Z0-9]/g, '')}`;
            const methodName = this.toCamelCase(operationId);

            // Extract parameters
            const parameters = operation.parameters || [];
            const requestBody = operation.requestBody;

            let methodParams = '';
            let requestData = '';

            // Handle path and query parameters
            const pathParams = parameters.filter((p: any) => p.in === 'path');
            const queryParams = parameters.filter((p: any) => p.in === 'query');
            const allParams = [...pathParams, ...queryParams];

            if (allParams.length > 0) {
              const paramTypes = allParams.map((p: any) => {
                const paramType = this.getTypeFromSchema(
                  p.schema || { type: p.type || 'string' },
                  definitions
                );
                const sanitizedName = this.sanitizeParameterName(p.name);
                return `${sanitizedName}${p.required ? '' : '?'}: ${paramType}`;
              });
              methodParams = paramTypes.join(', ');
            }

            // Handle request body
            if (requestBody) {
              const content = requestBody.content?.['application/json'];
              if (content?.schema) {
                const bodyType = this.getTypeFromSchema(content.schema, definitions);
                
                // Extract all types from the request body schema
                const requestTypes = this.extractTypesFromSchema(content.schema, definitions);
                requestTypes.forEach(type => usedTypes.add(type));
                
                if (content.schema.$ref) {
                  const refName = content.schema.$ref.split('/').pop();
                  if (refName) {
                    const typeName = this.toPascalCase(refName);
                    usedTypes.add(typeName);
                    methodParams = methodParams ? `${methodParams}, data: ${typeName}` : `data: ${typeName}`;
                    requestData = ', data';
                  }
                } else {
                  methodParams = methodParams ? `${methodParams}, data: ${bodyType}` : `data: ${bodyType}`;
                  requestData = ', data';
                }
              }
            }

            // Handle response type
            let returnType = 'any';
            const responses = operation.responses || {};
            const successResponse = responses['200'] || responses['201'] || responses['204'];

            if (successResponse?.content?.['application/json']?.schema) {
              returnType = this.getTypeFromSchema(
                successResponse.content['application/json'].schema,
                definitions
              );

              // Extract all types from the response schema
              const responseTypes = this.extractTypesFromSchema(
                successResponse.content['application/json'].schema,
                definitions
              );
              responseTypes.forEach(type => usedTypes.add(type));
            }

            // Build the path with parameter substitution
            let apiPath = path;
            pathParams.forEach((p: any) => {
              const sanitizedName = this.sanitizeParameterName(p.name);
              apiPath = apiPath.replace(`{${p.name}}`, `\${${sanitizedName}}`);
            });

            // Build query string - handle this more carefully to avoid nested template literal issues
            let queryStringCode = '';
            if (queryParams.length > 0) {
              if (queryParams.length === 1 && !queryParams[0].required) {
                const sanitizedName = this.sanitizeParameterName(queryParams[0].name);
                const param = queryParams[0];
                
                // Handle array parameters
                if (param.schema?.type === 'array' || param.name.includes('[]')) {
                  queryStringCode = `\${${sanitizedName} ? '?${param.name}=' + ${sanitizedName}.map(String).map(encodeURIComponent).join('&${param.name}=') : ''}`;
                } else {
                  queryStringCode = `\${${sanitizedName} ? '?${param.name}=' + encodeURIComponent(${sanitizedName}) : ''}`;
                }
              } else {
                const queryPartsCode = queryParams.map((p: any) => {
                  const sanitizedName = this.sanitizeParameterName(p.name);
                  
                  // Handle array parameters
                  if (p.schema?.type === 'array' || p.name.includes('[]')) {
                    if (p.required) {
                      return `'${p.name}=' + ${sanitizedName}.map(String).map(encodeURIComponent).join('&${p.name}=')`;
                    } else {
                      return `${sanitizedName} ? '${p.name}=' + ${sanitizedName}.map(String).map(encodeURIComponent).join('&${p.name}=') : null`;
                    }
                  } else {
                    if (p.required) {
                      return `'${p.name}=' + encodeURIComponent(${sanitizedName})`;
                    } else {
                      return `${sanitizedName} ? '${p.name}=' + encodeURIComponent(${sanitizedName}) : null`;
                    }
                  }
                }).join(', ');
                queryStringCode = `\${(() => { const parts = [${queryPartsCode}].filter(Boolean); return parts.length > 0 ? '?' + parts.join('&') : ''; })()}`;
              }
            }

            const generatedMethod = `export async function ${methodName}(${methodParams}): Promise<${returnType}> {
  const response = await axios.${method.toLowerCase()}(\`${apiPath}${queryStringCode}\`${requestData});
  return response.data;
}`;

            // Extract all types used in the generated method string
            const extractedTypes = this.extractTypesFromString(generatedMethod, definitions);
            extractedTypes.forEach(type => usedTypes.add(type));

            return generatedMethod;
          })
      )
      .join('\n\n');

    return { methods, usedTypes };
  }

  async generate(): Promise<void> {
    try {
      console.log('Fetching OpenAPI specification...');
      const response = await axios.get(`${this.config.apiUrl}${this.config.swaggerPath}`);
      const openApiSpec: OpenAPISpec = response.data;

      // Ensure output directory exists
      if (!fs.existsSync(this.config.outputDir)) {
        fs.mkdirSync(this.config.outputDir, { recursive: true });
      }

      console.log('Generating TypeScript interfaces...');
      const interfaces = this.generateInterfaces(openApiSpec);

      console.log('Generating API methods...');
      const { methods: apiMethods, usedTypes } = this.generateApiMethods(openApiSpec);

      // Get defined types
      const definitions = openApiSpec.components?.schemas || openApiSpec.definitions || {};
      const definedTypes = new Set(Object.keys(definitions).map(name => this.toPascalCase(name)));

      // Filter valid used types
      const validUsedTypes = Array.from(usedTypes).filter(type => definedTypes.has(type));

      // Generate interfaces file
      const interfacesContent = `/**
 * THIS FILE IS AUTOMATICALLY GENERATED FROM: ${this.config.apiUrl}${this.config.swaggerPath}
 * DO NOT EDIT MANUALLY
 */

${interfaces}`;

      const formattedInterfaces = await prettier.format(interfacesContent, {
        parser: 'typescript',
        semi: true,
        singleQuote: true,
        tabWidth: 2,
      });

      fs.writeFileSync(path.join(this.config.outputDir, 'interfaces.ts'), formattedInterfaces);
      console.log('✅ Generated interfaces.ts');

      // Generate type imports
      const typeImports = validUsedTypes.length > 0
        ? `import type {\n  ${validUsedTypes.join(',\n  ')}\n} from './interfaces';`
        : '';

      // Generate API methods file
      const apiContent = `/**
 * THIS FILE IS AUTOMATICALLY GENERATED FROM: ${this.config.apiUrl}${this.config.swaggerPath}
 * DO NOT EDIT MANUALLY
 */

import axios from '../axios';
${typeImports}

${apiMethods}`;

      const formattedApi = await prettier.format(apiContent, {
        parser: 'typescript',
        semi: true,
        singleQuote: true,
        tabWidth: 2,
      });

      fs.writeFileSync(path.join(this.config.outputDir, 'api.ts'), formattedApi);
      console.log('✅ Generated api.ts');

      // Generate index file for easy imports
      const indexContent = `export * from './interfaces';
export * from './api';`;

      const formattedIndex = await prettier.format(indexContent, {
        parser: 'typescript',
        semi: true,
        singleQuote: true,
        tabWidth: 2,
      });

      fs.writeFileSync(path.join(this.config.outputDir, 'index.ts'), formattedIndex);
      console.log('✅ Generated index.ts');

      console.log('\n🎉 API generation completed successfully!');
      console.log(`📁 Files generated in: ${this.config.outputDir}`);

      // Debug logging
      console.log(`🔧 Total used types found: ${usedTypes.size}`);
      console.log(`🔧 Valid types: ${validUsedTypes.join(', ')}`);
      console.log(`⚠️  Skipped undefined types: ${Array.from(usedTypes).filter(type => !definedTypes.has(type)).join(', ')}`);

    } catch (error: any) {
      console.error('❌ Error generating API:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      throw error;
    }
  }
}

export default ApiGenerator;
