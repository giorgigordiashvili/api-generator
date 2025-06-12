# @gordela/api-generator

A powerful TypeScript API client generator that creates type-safe interfaces and API methods from Swagger/OpenAPI specifications with full environment variable support.

## Features

- 🚀 **TypeScript-first**: Generates fully typed interfaces and API methods
- 🌍 **Environment Variables**: Full support for configuration via `.env` files
- 🔧 **Flexible Configuration**: Multiple ways to configure (env vars, config files, CLI args)
- 📦 **Production Ready**: Proper error handling, logging, and robust code generation
- 🎯 **Smart Naming**: Automatic conversion to PascalCase interfaces and camelCase methods
- ⚡ **Fast & Reliable**: Efficient parsing and generation with axios and prettier
- 🛠 **CLI & Programmatic**: Use as CLI tool or import as a library

## Installation

```bash
npm install -g @gordela/api-generator
# or
npm install --save-dev @gordela/api-generator
```

## Quick Start

### 1. Environment Variables (Recommended)

Create a `.env` file in your project root:

```bash
# Required
API_URL=https://api.sprtverse.com
SWAGGER_PATH=/docs?api-docs.json

# Optional
API_NAMESPACE=MyApi
OUTPUT_DIR=./src/api/generated
```

Then run:

```bash
gordela-api-gen
# or
npx gordela-api-gen
```

### 2. CLI Arguments

```bash
gordela-api-gen --api-url https://api.example.com --output-dir ./api
```

### 3. Configuration File

Create `api-generator.config.js`:

```javascript
module.exports = {
  apiUrl: 'https://api.sprtverse.com',
  swaggerPath: '/docs?api-docs.json',
  outputDir: './src/api/generated',
  namespace: 'SportverseApi',
};
```

### 4. Programmatic Usage

```typescript
import { ApiGenerator } from '@gordela/api-generator';

const generator = new ApiGenerator({
  apiUrl: 'https://api.example.com',
  swaggerPath: '/openapi.json',
  outputDir: './generated',
  namespace: 'MyApi',
});

await generator.generate();
```

## Configuration Options

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `API_URL` | Base URL of your API | `https://api.sprtverse.com` |
| `SWAGGER_PATH` | Path to OpenAPI/Swagger JSON | `/docs?api-docs.json` |
| `OUTPUT_DIR` | Directory for generated files | `api/generated` |
| `API_NAMESPACE` | Namespace for generated code | `ApiClient` |

### CLI Options

```bash
gordela-api-gen [options]

Options:
  -u, --api-url <url>        API base URL
  -s, --swagger-path <path>  Swagger/OpenAPI path  
  -o, --output-dir <dir>     Output directory
  -n, --namespace <name>     API namespace
  -c, --config <file>        Config file path
  -h, --help                 Show help
  -v, --version              Show version
```

### Configuration File

Create `api-generator.config.js` in your project root:

```javascript
module.exports = {
  apiUrl: 'https://api.example.com',
  swaggerPath: '/openapi.json',
  outputDir: './src/api/generated',
  namespace: 'MyApi',
};
```

## Generated Files

The generator creates three files in your output directory:

### `interfaces.ts`
Type-safe TypeScript interfaces for all API models:

```typescript
export interface Player {
  id: number;
  name: string;
  position?: string;
}

export interface Team {
  id: number;
  name: string;
  players: Player[];
}
```

### `api.ts` 
API methods with proper typing:

```typescript
export async function getPlayers(): Promise<Player[]> {
  const response = await axios.get('/players');
  return response.data;
}

export async function createPlayer(data: Player): Promise<Player> {
  const response = await axios.post('/players', data);
  return response.data;
}
```

### `index.ts`
Convenient re-exports:

```typescript
export * from './interfaces';
export * from './api';
```

## Usage Example

After generation, use your API client:

```typescript
import { getPlayers, createPlayer, Player } from './api/generated';

// Fetch players
const players = await getPlayers();

// Create a new player
const newPlayer: Player = {
  id: 1,
  name: 'John Doe',
  position: 'Forward'
};

const createdPlayer = await createPlayer(newPlayer);
```

## Integration with Axios

The generated API methods use a relative import to `../axios`, so create your axios configuration:

```typescript
// api/axios.ts
import axios from 'axios';

const instance = axios.create({
  baseURL: process.env.API_URL || 'https://api.sprtverse.com',
  timeout: 10000,
});

// Add interceptors for auth, error handling, etc.
instance.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default instance;
```

## Advanced Configuration

### Custom Headers for Swagger Fetching

If your OpenAPI spec requires authentication:

```bash
# .env
SWAGGER_AUTH_HEADER=Bearer your-token-here
SWAGGER_API_KEY=your-api-key-here
```

### Multiple APIs

Generate clients for multiple APIs:

```javascript
// multi-api.config.js
module.exports = [
  {
    apiUrl: 'https://api.users.com',
    swaggerPath: '/openapi.json',
    outputDir: './src/api/users',
    namespace: 'UsersApi',
  },
  {
    apiUrl: 'https://api.orders.com', 
    swaggerPath: '/docs/json',
    outputDir: './src/api/orders',
    namespace: 'OrdersApi',
  }
];
```

## NPM Scripts Integration

Add to your `package.json`:

```json
{
  "scripts": {
    "generate-api": "sportverse-api-gen",
    "build": "npm run generate-api && tsc",
    "dev": "npm run generate-api && npm run start:dev"
  }
}
```

## Error Handling

The generator provides detailed error messages:

- ✅ Successful operations with clear feedback
- ⚠️  Warnings for skipped or invalid types  
- ❌ Clear error messages with response details
- 🔧 Configuration validation and helpful hints

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📚 [Documentation](https://github.com/sportverse/api-generator)
- 🐛 [Issue Tracker](https://github.com/sportverse/api-generator/issues)
- 💬 [Discussions](https://github.com/sportverse/api-generator/discussions)

---

Made with ❤️ by the Sportverse Team
