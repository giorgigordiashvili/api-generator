#!/usr/bin/env node

import ApiGenerator from './index';
import * as path from 'path';

interface CLIOptions {
  apiUrl?: string;
  swaggerPath?: string;
  outputDir?: string;
  namespace?: string;
  config?: string;
  help?: boolean;
  version?: boolean;
}

function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--api-url':
      case '-u':
        options.apiUrl = nextArg;
        i++;
        break;
      case '--swagger-path':
      case '-s':
        options.swaggerPath = nextArg;
        i++;
        break;
      case '--output-dir':
      case '-o':
        options.outputDir = nextArg;
        i++;
        break;
      case '--namespace':
      case '-n':
        options.namespace = nextArg;
        i++;
        break;
      case '--config':
      case '-c':
        options.config = nextArg;
        i++;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      case '--version':
      case '-v':
        options.version = true;
        break;
    }
  }

  return options;
}

function showHelp(): void {
  console.log(`
🚀 Gordela API Generator

Usage: gordela-api-gen [options]

Options:
  -u, --api-url <url>        API base URL (default: from .env or https://api.sprtverse.com)
  -s, --swagger-path <path>  Swagger/OpenAPI path (default: from .env or /docs?api-docs.json)
  -o, --output-dir <dir>     Output directory (default: api/generated)
  -n, --namespace <n>     API namespace (default: from .env or ApiClient)
  -c, --config <file>        Config file path (default: api-generator.config.js)
  -h, --help                 Show help
  -v, --version              Show version

Environment Variables:
  API_URL                    API base URL
  SWAGGER_PATH               Swagger/OpenAPI path
  OUTPUT_DIR                 Output directory
  API_NAMESPACE              API namespace

Examples:
  gordela-api-gen
  gordela-api-gen --api-url https://api.example.com --output-dir ./generated
  gordela-api-gen --config ./my-config.js

For more information, visit: https://github.com/gordela/api-generator
`);
}

function showVersion(): void {
  try {
    const packageJson = require('../package.json');
    console.log(`v${packageJson.version}`);
  } catch (error) {
    console.log('Version unknown');
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.help) {
    showHelp();
    return;
  }

  if (options.version) {
    showVersion();
    return;
  }

  try {
    const configPath = options.config ? path.resolve(process.cwd(), options.config) : undefined;

    const generator = new ApiGenerator({
      ...(options.apiUrl && { apiUrl: options.apiUrl }),
      ...(options.swaggerPath && { swaggerPath: options.swaggerPath }),
      ...(options.outputDir && { outputDir: path.resolve(process.cwd(), options.outputDir) }),
      ...(options.namespace && { namespace: options.namespace }),
      ...(configPath && { configFilePath: configPath }),
    });

    await generator.generate();
  } catch (error: any) {
    console.error('❌ Generation failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}
