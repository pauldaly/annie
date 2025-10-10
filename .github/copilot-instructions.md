# Annie Framework - AI Agent Instructions

## Project Overview

Annie is **THE foundation for AI app factories** - designed specifically for AI agents to generate production-quality applications instantly. Unlike traditional frameworks, Annie enables AI to create enterprise applications through JSON configurations and data attributes, without compilation or complex coding.

**Core Philosophy**: AI-First Development - Natural Language → AI JSON Generation → BoltAPI Deployment → Working App (minutes, not months).

## AI-First Architecture Principles

### JSON-Driven Everything (AI-Generatable)
- **Structured data** that AI can learn and generate reliably
- **Schema-driven** development for validation and safety
- **Declarative patterns** that map to natural language descriptions
- **Zero compilation** - everything works at runtime

### AI Development Workflow
1. **Natural Language** → User describes app requirements
2. **AI Pattern Recognition** → AI maps to Annie JSON patterns
3. **JSON Generation** → AI creates `data-observe` configurations + JsonLogic
4. **BoltAPI Integration** → Server-side app generation and deployment
5. **Instant Deployment** → Working app without compilation

### Core AI-Generatable Patterns
- **Data-Observe**: `data-observe='[{"datasource":"users","type":"html","field":"name"}]'`
- **JsonLogic**: `{"if": {">": [{"var": "totalSpent"}, 1000]}, "class": {"premium": true}}`
- **Templates**: `<div>{{name}} - {{email}}</div>` 
- **Triggers**: `data-trigger='{"type":"api","query":["get-users"]}'`

## Build & Development Workflow

### Essential Commands
```bash
# Build framework (TypeScript + Rollup)
npm run build                # Full build: tsc + rollup
npx tsc                     # TypeScript compilation only
npm run bundle              # Rollup bundling only

# Development
npm run dev                 # Watch mode (tsc --watch)
npm run bundle:watch        # Rollup watch mode

# Production verification
npm run verify-production   # Ensures no testing code in dist/
```

### Build Outputs
- **`dist/annie.esm.js`**: ES modules for modern bundlers
- **`dist/annie.umd.js`**: UMD build for direct browser usage  
- **`dist/annie.umd.min.js`**: Minified UMD (39KB Brotli compressed)

## Project-Specific Conventions

### File Organization
- **No barrel exports**: Use direct `.js` imports in TypeScript files
- **Testing exclusions**: `src/testing/**` excluded from production builds
- **Demo files**: Root-level `demo-*.html` files demonstrate features
- **Documentation**: `README_*.md` files for specific features

### Data Attribute Patterns
```html
<!-- Observe data changes -->
data-observe='[{"datasource":"store","type":"html","field":"title"}]'

<!-- Trigger actions -->
data-trigger='{"type":"xhr","form":["form1"],"query":["update-user"]}'

<!-- Route navigation --> 
data-route='{"target":"profile"}'

<!-- Framework markers -->
data-annie-component="user-card"
```

### API Communication Pattern
Annie uses **POST-centric APIs** exclusively to avoid REST limitations:
```typescript
// All operations via POST with action-based requests
{
  "action": "GET_USERS",
  "data": {...},
  "filters": {...},
  "options": {...}
}
// Sent to single endpoint: /api/unified
```

**Why POST-only**:
- No URL length restrictions for complex queries
- Parameters hidden from logs/URLs for security
- Firewall-friendly (no custom HTTP methods)
- Consistent error handling across all operations

### Naming Conventions
- **Datasets**: snake_case internally (`user_profiles`), kebab-case in HTML (`user-profiles`)
- **Services**: PascalCase classes with interfaces prefixed by `I`
- **Methods**: camelCase with descriptive names
- **Files**: kebab-case for demos, PascalCase for classes

## Testing Approach

### Test Structure
- **`src/testing/index.ts`**: Central export for all testing utilities
- **Custom matchers**: Framework-specific assertions in `matchers.ts`
- **Mock services**: Complete service mocks in `mock-services.ts`
- **Test harness**: Component testing utilities in `test-harness.ts`

### Test Commands
```bash
npm run build:test         # Compile test files
npm run test:compile       # Verify test compilation
```

## Integration Points

### External Dependencies
- **SignalR**: Real-time communication (`SignalRManager`)
- **D3.js**: Chart integration (`src/charts/`)
- **Bootstrap**: UI framework (demos use Bootstrap classes)
- **Rollup**: Bundling with TypeScript, terser, and CSS copying

### API Patterns
- **POST-Centric**: All API calls use POST to avoid URL length limits and parameter visibility
- **Action-Based**: `UnifiedApiClient` with action patterns like `GET_USERS`, `CREATE_USER`
- **Enhanced HTTP**: Interceptors, caching, retry logic in `EnhancedHttpClient`
- **Unified Interface**: Single `/api/unified` endpoint handles all operations
- **Real-time**: WebSocket/SignalR integration

### Memory Management
- **Cleanup Manager**: Automatic resource disposal (`CleanupManager`)
- **Leak Detection**: Development-time memory leak detection
- **WeakSet Tracking**: Prevents duplicate element initialization

## Critical Implementation Details

### Component Lifecycle
1. **Initialization**: `AnnieFramework` constructor with `AppConfig`
2. **Service Registration**: DI container setup with `ServiceTokens`
3. **DOM Scanning**: Automatic discovery of `data-*` attributes
4. **Dynamic Updates**: MutationObserver for runtime DOM changes
5. **Cleanup**: Proper disposal via `IDisposable` interface

### State Management Pattern
```typescript
// Framework automatically handles this flow:
dataStore.setData('users', newUsers) 
→ Observable notifies observers
→ UI elements with data-observe update
→ StateManager tracks changes for undo/redo
```

### Error Boundaries
- **ErrorBoundary**: Catches and handles framework errors
- **Validation**: Type guards with custom validators
- **Graceful Degradation**: Fallbacks for missing features

## AI Agent Decision Framework

### When Adding Features, Always Ask:
1. **Can AI generate this reliably?** (JSON schema friendly)
2. **Can non-developers use this?** (Visual builder compatible)  
3. **Does this work without compilation?** (Runtime processing)
4. **Can this be modified safely?** (Validation and error handling)

### Problem-Solving Hierarchy
1. **First**: Can this be solved through enhanced `data-observe` + JsonLogic?
2. **Second**: Can this be a simple JSON configuration option?
3. **Third**: Can this be handled by BoltAPI server-side generation?
4. **Last Resort**: Add JavaScript/TypeScript complexity

### AI-Friendly Patterns ✅
```json
{
  "type": "userList",
  "datasource": "users", 
  "template": "<div>{{name}} - {{email}}</div>",
  "jsonlogic": {"if": {"var": "isActive"}}
}
```

### AI-Hostile Patterns ❌
```typescript
class UserListComponent extends BaseComponent {
  @Input() filterConfig: FilterConfiguration<User>;
  ngOnInit() { this.setupComplexLifecycle(); }
}
```

## When Modifying Code
- **Choose JSON over JavaScript** - AI can generate JSON reliably
- **Choose configuration over code** - Enable runtime modification
- **Choose runtime over compile-time** - Instant feedback loop
- **Always implement `IDisposable`** for services that hold references
- **Create JSON schemas** for every new feature to guide AI generation
- **Update demo files** to show AI-generatable patterns