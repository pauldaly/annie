# Production Build Exclusion for Annie Testing Framework

## Summary

The Annie Testing Framework is designed to be **completely excluded** from production builds to prevent bloat and maintain security. Here's how it works:

## Configuration Changes Made

### 1. TypeScript Configuration (`tsconfig.json`)
- Added `src/testing/**/*` to exclude list
- Added `**/*.test.ts` and `**/*.spec.ts` patterns
- Production builds will not compile any testing code

### 2. Rollup Configuration (`rollup.config.js`) 
- Added explicit exclude patterns to all TypeScript plugins
- Ensures testing code is never bundled in ES modules or UMD builds
- Applied to both regular and minified builds

### 3. Separate Test Configuration (`tsconfig.test.json`)
- Extends main config but includes testing code
- Used only for test compilation and development
- Does not affect production builds

### 4. Package.json Scripts
- `build:test` - Compile with testing code included
- `verify-production` - Verify no testing code in production bundle
- `test:compile` - Alias for building test code

### 5. Gitignore Updates
- Added `dist-test/` to ignore test build artifacts
- Keeps repository clean

## Usage Patterns

### ✅ Correct Usage (Excluded from Production)

```typescript
// In test files (*.test.ts, *.spec.ts)
import { testHarness, createMockServices } from '../testing/index.js';

// Test code here
```

```typescript
// Conditional imports (excluded by bundler)
if (process.env.NODE_ENV === 'test') {
  const { testHarness } = await import('./testing/index.js');
}
```

### ❌ Incorrect Usage (Would Include in Production)

```typescript
// In production source files
import { testHarness } from './testing/index.js'; // DON'T DO THIS
```

## Build Commands

```bash
# Production build (excludes testing code)
npm run build                 # 0 bytes of testing code

# Test build (includes testing code)  
npm run build:test           # Includes testing framework

# Verify production build is clean
npm run verify-production    # Checks for testing code
```

## Bundle Size Impact

| Build Type | Testing Code | Bundle Size Impact |
|------------|-------------|-------------------|
| Production | ❌ Excluded | +0 bytes |
| Development | ✅ Available | +~15KB (dev only) |
| Test Build | ✅ Included | Full framework |

## File Structure

```
src/
├── core/                    # ✅ Included in production
├── ui/                      # ✅ Included in production  
├── utils/                   # ✅ Included in production
├── testing/                 # ❌ Excluded from production
│   ├── index.ts            # ❌ Excluded
│   ├── test-harness.ts     # ❌ Excluded
│   └── *.ts                # ❌ Excluded
└── *.test.ts               # ❌ Excluded
```

## Verification

To verify testing code is properly excluded:

```bash
# 1. Build production bundle
npm run build

# 2. Check for testing imports (should return nothing)
grep -r "testing" dist/

# 3. Use verification script
npm run verify-production

# 4. Check bundle analyzer
npx webpack-bundle-analyzer dist/annie.esm.js
```

## Security Benefits

Excluding testing code from production provides:

1. **Smaller Bundle Size** - No unnecessary test utilities
2. **Security** - No test mocks or debug functions exposed
3. **Performance** - Faster load times
4. **Clean API** - Only production APIs available in bundles

## Development Workflow

1. **Write Tests**: Use full testing framework in `*.test.ts` files
2. **Development**: Testing utilities available for debugging
3. **Build Production**: Testing code automatically excluded
4. **Deploy**: Clean, optimized bundle without test bloat

This ensures Annie's testing framework provides comprehensive testing capabilities during development while maintaining lean, secure production bundles.