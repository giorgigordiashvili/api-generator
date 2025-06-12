"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = exports.ApiGenerator = void 0;
const axios_1 = __importDefault(require("axios"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const prettier = __importStar(require("prettier"));
const dotenv = __importStar(require("dotenv"));
// Load environment variables
dotenv.config();
class ApiGenerator {
    constructor(config = {}) {
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
    loadConfigFile(configPath) {
        try {
            const configFile = require(configPath);
            this.config = { ...this.config, ...configFile };
            if (configFile.outputDir) {
                this.config.outputDir = path.resolve(process.cwd(), configFile.outputDir);
            }
            console.log('✅ Loaded configuration from config file');
        }
        catch (error) {
            console.log('ℹ️  Config file not found or invalid');
        }
    }
    loadEnvironmentVariables() {
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
    sanitizeParameterName(name) {
        // Remove array brackets and other special characters, convert to camelCase
        return name
            .replace(/\[\]/g, '') // Remove array brackets
            .replace(/[^a-zA-Z0-9_]/g, '_') // Replace special chars with underscore
            .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
            .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()); // Convert to camelCase
    }
    // Utility functions
    toPascalCase(str) {
        return str
            .replace(/([a-z])([A-Z])/g, '$1_$2')
            .replace(/[^a-zA-Z0-9]/g, '_')
            .split('_')
            .filter(word => word.length > 0)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('');
    }
    toCamelCase(str) {
        const pascalCase = str
            .replace(/([a-z])([A-Z])/g, '$1_$2')
            .replace(/[^a-zA-Z0-9]/g, '_')
            .split('_')
            .filter(word => word.length > 0)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('');
        return pascalCase.charAt(0).toLowerCase() + pascalCase.slice(1);
    }
    getTypeFromSchema(schema, definitions) {
        if (!schema)
            return 'any';
        if (schema.$ref) {
            const refName = schema.$ref.split('/').pop();
            const pascalName = this.toPascalCase(refName);
            if (definitions && definitions[refName]) {
                return pascalName;
            }
            return pascalName;
        }
        if (schema.type === 'string') {
            if (schema.format === 'date-time')
                return 'string';
            if (schema.format === 'email')
                return 'string';
            if (schema.enum)
                return schema.enum.map((e) => `'${e}'`).join(' | ');
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
            if (itemType.includes(' | ')) {
                return `(${itemType})[]`;
            }
            return `${itemType}[]`;
        }
        // Handle enum at the schema level (not just in string type)
        if (schema.enum) {
            if (schema.type === 'string' || !schema.type) {
                return schema.enum.map((e) => `'${e}'`).join(' | ');
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
        return 'any';
    }
    generateInterfaces(openApiSpec) {
        const definitions = openApiSpec.components?.schemas || openApiSpec.definitions || {};
        return Object.entries(definitions)
            .map(([name, schema]) => {
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
    generateApiMethods(openApiSpec) {
        const paths = openApiSpec.paths || {};
        const definitions = openApiSpec.components?.schemas || openApiSpec.definitions || {};
        const usedTypes = new Set();
        const methods = Object.entries(paths)
            .flatMap(([path, pathMethods]) => Object.entries(pathMethods)
            .filter(([method]) => ['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase()))
            .map(([method, operation]) => {
            const operationId = operation.operationId || `${method}${path.replace(/[^a-zA-Z0-9]/g, '')}`;
            const methodName = this.toCamelCase(operationId);
            // Extract parameters
            const parameters = operation.parameters || [];
            const requestBody = operation.requestBody;
            let methodParams = '';
            let requestData = '';
            // Handle path and query parameters
            const pathParams = parameters.filter((p) => p.in === 'path');
            const queryParams = parameters.filter((p) => p.in === 'query');
            const allParams = [...pathParams, ...queryParams];
            if (allParams.length > 0) {
                const paramTypes = allParams.map((p) => {
                    const paramType = this.getTypeFromSchema(p.schema || { type: p.type || 'string' }, definitions);
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
                    if (bodyType.includes('interface') || definitions[content.schema.$ref?.split('/').pop() || '']) {
                        const refName = content.schema.$ref?.split('/').pop();
                        if (refName) {
                            const typeName = this.toPascalCase(refName);
                            usedTypes.add(typeName);
                            methodParams = methodParams ? `${methodParams}, data: ${typeName}` : `data: ${typeName}`;
                            requestData = ', data';
                        }
                    }
                    else {
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
                returnType = this.getTypeFromSchema(successResponse.content['application/json'].schema, definitions);
                if (successResponse.content['application/json'].schema.$ref) {
                    const refName = successResponse.content['application/json'].schema.$ref.split('/').pop();
                    if (refName && definitions[refName]) {
                        const typeName = this.toPascalCase(refName);
                        usedTypes.add(typeName);
                        returnType = typeName;
                    }
                }
            }
            // Build the path with parameter substitution
            let apiPath = path;
            pathParams.forEach((p) => {
                const sanitizedName = this.sanitizeParameterName(p.name);
                apiPath = apiPath.replace(`{${p.name}}`, `\${${sanitizedName}}`);
            });
            // Build query string - handle this more carefully to avoid nested template literal issues
            let queryStringCode = '';
            if (queryParams.length > 0) {
                if (queryParams.length === 1 && !queryParams[0].required) {
                    const sanitizedName = this.sanitizeParameterName(queryParams[0].name);
                    queryStringCode = `\${${sanitizedName} ? '?${queryParams[0].name}=' + encodeURIComponent(${sanitizedName}) : ''}`;
                }
                else {
                    const queryPartsCode = queryParams.map((p) => {
                        const sanitizedName = this.sanitizeParameterName(p.name);
                        if (p.required) {
                            return `'${p.name}=' + encodeURIComponent(${sanitizedName})`;
                        }
                        else {
                            return `${sanitizedName} ? '${p.name}=' + encodeURIComponent(${sanitizedName}) : null`;
                        }
                    }).join(', ');
                    queryStringCode = `\${(() => { const parts = [${queryPartsCode}].filter(Boolean); return parts.length > 0 ? '?' + parts.join('&') : ''; })()}`;
                }
            }
            return `export async function ${methodName}(${methodParams}): Promise<${returnType}> {
  const response = await axios.${method.toLowerCase()}(\`${apiPath}${queryStringCode}\`${requestData});
  return response.data;
}`;
        }))
            .join('\n\n');
        return { methods, usedTypes };
    }
    async generate() {
        try {
            console.log('Fetching OpenAPI specification...');
            const response = await axios_1.default.get(`${this.config.apiUrl}${this.config.swaggerPath}`);
            const openApiSpec = response.data;
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
            console.log('\\n🎉 API generation completed successfully!');
            console.log(`📁 Files generated in: ${this.config.outputDir}`);
            console.log(`🔧 Valid types: ${validUsedTypes.join(', ')}`);
            console.log(`⚠️  Skipped undefined types: ${Array.from(usedTypes).filter(type => !definedTypes.has(type)).join(', ')}`);
        }
        catch (error) {
            console.error('❌ Error generating API:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            throw error;
        }
    }
}
exports.ApiGenerator = ApiGenerator;
exports.default = ApiGenerator;
//# sourceMappingURL=index.js.map