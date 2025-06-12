# Changelog

All notable changes to this project will be documented in this file.

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
