# Changelog

All notable changes to this project will be documented in this file.

## [1.3.0] - 2026-04-17 (multipart/form-data support)

### Added
- **`multipart/form-data` request bodies are now generated.** Endpoints that declare a `multipart/form-data` content type are emitted with a `data: FormData` parameter. Axios auto-detects `FormData` instances and applies the correct `Content-Type` header (with boundary), so no extra per-call configuration is required.
- New helper `schemaHasBinary()` recursively walks a schema (including `properties`, `items`, and `allOf`/`oneOf`/`anyOf` branches) to detect `format: binary` fields.

### Changed
- Request-body content-type selection now follows a clear rule:
  - If `multipart/form-data` is declared **and** (no `application/json` variant exists **or** the multipart schema contains a binary field), the generator emits `data: FormData`.
  - Otherwise it falls back to the previous `application/json` behavior.
- When both `application/json` and `multipart/form-data` are declared (e.g., an endpoint that accepts a base64 string OR a real file), the generator now prefers the file-upload variant, which is almost always what the caller wants.

### Fixed
- File-upload endpoints that only declared `multipart/form-data` previously generated a zero-argument function (e.g., `uploadMedia(): Promise<…>`), silently dropping the request body. They now correctly accept the upload payload.

## [1.2.0] - 2025-06-16 (Complete Type Safety Enhancement)

### 🎉 Major Improvements
- **Complete elimination of `any` types**: All generated functions now have proper, specific types
- **Advanced schema handling**: Full support for `oneOf`, `allOf`, and `anyOf` OpenAPI schemas
- **Union types**: Proper generation of TypeScript union types from `oneOf` schemas (e.g., login with email OR phone)
- **Intersection types**: Proper generation of TypeScript intersection types from `allOf` schemas (e.g., ApiResponse & additional properties)
- **Enhanced type extraction**: Recursive type detection finds all referenced types in complex nested schemas

### ✅ Fixed Issues
- ❌ `loginAdminUser` returning `Promise<any>` → ✅ `Promise<ApiResponse & { data?: { access_token?: string; }; }>`
- ❌ `getPlayers` returning `Promise<any>` → ✅ `Promise<PaginatedResponse & { data?: Player[]; }>`
- ❌ `getSports` returning `Promise<any>` → ✅ `Promise<PaginatedResponse & { data?: Sport[]; }>`
- ❌ `getTeams` returning `Promise<any>` → ✅ `Promise<PaginatedResponse & { data?: Team[]; }>`
- ❌ `loginUser` with `data: any` parameter → ✅ Proper union type for email/phone login
- ❌ `registerContentCreator` with `data: any` parameter → ✅ Proper union type with social_data
- ❌ `registerUser` with `data: any` parameter → ✅ Proper union type for email/phone registration

### 📊 Statistics
- **33 functions** generated with complete type safety
- **20 interface types** properly imported and used
- **14 union types** generated from `oneOf` schemas
- **7 intersection types** generated from `allOf` schemas
- **0 `any` types** remaining in generated code

### 🧪 Testing
- Added comprehensive type verification test suite
- New npm scripts: `test:types` and `test:all`
- Automated detection of type issues and improvements
- Verification that all functions have proper Promise return types

### 🔧 Technical Details
- Enhanced `getTypeFromSchema` method with `oneOf`, `allOf`, and `anyOf` support
- Improved type extraction for complex nested schemas
- Better handling of inline schemas vs `$ref` references
- Proper parameter type generation for complex request bodies

## [1.1.0] - 2025-06-12 (Enhanced Type Detection)

### Added
- Improved type detection algorithm that recursively extracts types from complex schemas
- Better handling of nested types in object properties, arrays, and union types
- Enhanced `extractTypesFromSchema` method for comprehensive type analysis
- Support for detecting types in complex return type structures like `Promise<{ data?: TypeName; }>`

### Fixed
- Fixed missing type imports in generated API files (e.g., `CmsuserItem`, `PaginatedResponse`)
- Improved array parameter handling with proper string conversion for query parameters
- Fixed TypeScript compilation errors related to complex type structures
- Better handling of array parameters with non-primitive types

### Changed
- Enhanced `extractTypesFromString` method with improved regex patterns
- Updated type extraction to handle property type definitions (e.g., "data?: TypeName")
- Improved array parameter encoding with `.map(String).map(encodeURIComponent)`

## [1.0.1] - 2025-06-12 (Recovery & Fixes)

### Fixed
- Fixed CLI configuration logic that was overriding default values with `undefined`
- Removed unused `getSafeType` method to eliminate compilation warnings
- Fixed parameter passing in CLI to properly handle optional arguments
- Improved configuration merging to only override values when explicitly provided

### Added
- Comprehensive test suite
- Example configuration files (.env.example, api-generator.config.example.js)
- Better error handling and logging
- TypeScript source code recovery from published npm package

### Changed
- Improved CLI argument handling to preserve default values
- Enhanced configuration system to be more robust

## [1.0.0] - Initial Release
- TypeScript API generator from OpenAPI/Swagger specifications
- CLI tool with multiple configuration options
- Environment variable support
- Flexible configuration system
