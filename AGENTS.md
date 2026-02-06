# AGENTS.md - Developer Guide for Coding Agents

This document provides essential information for AI coding agents working on the `@uscreen.de/fastify-mongo-auth` project.

## Project Overview

A Fastify plugin providing stateless session-backed authentication against a MongoDB collection. Uses `secure-password` for hashing and `@fastify/secure-session` for secure cookie-based sessions.

**Key Dependencies:**
- Fastify 5.x
- MongoDB via `@fastify/mongodb`
- `@uscreen.de/fastify-mongo-crud` for collection operations
- `@fastify/secure-session` for session management
- Node.js 24 (see `.nvmrc`)

## Build, Lint, and Test Commands

### Installation
```bash
pnpm install
```

### Linting
```bash
pnpm run lint          # Run ESLint with auto-fix on all JS files
```

### Testing
```bash
pnpm test              # Run all tests with spec reporter
pnpm test:cov          # Run tests with coverage (HTML + text output)
pnpm test:ci           # Run tests with lcov coverage for CI
make test              # Alternative: run tests via Makefile
```

### Running Single Tests
```bash
# Run tests matching a specific pattern
node --test --test-name-pattern="should register"

# Run a specific test file
node --test test/auth.test.js

# Run with spec reporter
node --test --test-reporter spec test/auth.test.js
```

### Coverage
Coverage reports are generated in the `coverage/` directory using `c8`.

## Code Style Guidelines

### ESLint Configuration
This project extends `@uscreen.de/eslint-config-prettystandard-node`. Always run `pnpm run lint` before committing.

### Formatting Rules (from .editorconfig)
- **Encoding:** UTF-8
- **Indentation:** 2 spaces (not tabs)
- **Line endings:** LF (Unix-style)
- **Final newline:** Always insert
- **Trailing whitespace:** Always trim
- **Makefiles:** Use tabs (standard)

### Import Style
```javascript
// Use ES modules (type: "module" in package.json)
import fp from 'fastify-plugin'
import envSchema from 'env-schema'

// Relative imports use .js extension
import { build } from './setup.js'
import auth from '../index.js'
```

### Module Exports
```javascript
// Default export wrapped with fastify-plugin
export default fp(fastifyMongoAuth, {
  fastify: '>=2.x',
  name: 'fastify-mongo-auth',
  decorators: {
    fastify: ['httpErrors', 'crud']
  },
  dependencies: ['@fastify/sensible', 'fastify-mongo-crud']
})

// Named exports for utilities
export const build = async (t, options) => { /* ... */ }
```

### Naming Conventions
- **Variables/Functions:** camelCase (`usernameField`, `createHash`, `loginHandler`)
- **Constants:** camelCase for config objects, UPPER_CASE for true constants
- **Plugin options:** Use envSchema with default values
- **Request decorators:** Configurable via options (default: `'user'` for `req.user`)

### Type Usage
This is a JavaScript project without TypeScript. Use JSDoc comments for complex functions when helpful:
```javascript
/**
 * Handler for logging in to an account
 * @param {Object} req - Fastify request object
 * @returns {Promise<{account: Object}>}
 */
async loginHandler(req) { /* ... */ }
```

### Error Handling
```javascript
// Use fastify.httpErrors for standard HTTP errors
throw fastify.httpErrors.unauthorized()

// Use try-catch with logging for unexpected errors
try {
  req[user] = await auth.collection.findOne({ _id })
} catch (err) {
  fastify.log.error(err)
}

// Prefer preHandler for authentication checks
fastify.get('/protected', {
  preHandler: auth.authorized
}, handler)
```

### Testing Patterns
```javascript
// Use Node.js native test runner
import test from 'node:test'
import assert from 'node:assert/strict'

test('descriptive test name', async (t) => {
  // Nested tests for related scenarios
  await t.test('should do specific thing', async (t) => {
    const result = await operation()
    assert.equal(result.statusCode, 200)
  })
})

// Use fastify.inject() for route testing
const { statusCode, cookies } = await fastify.inject({
  method: 'POST',
  url: '/login',
  payload: { username: 'foo', password: 'bar' }
})

// Clean up after tests
t.after(() => fastify.close())
```

## Project Structure

```
.
├── index.js              # Main plugin implementation
├── test/
│   ├── setup.js         # Test utilities and helpers
│   ├── auth.test.js     # Authentication workflow tests
│   └── noop.test.js     # Minimal test
├── services/            # Example service files (not in main code)
├── package.json
├── .eslintrc            # ESLint configuration
├── .editorconfig        # Editor formatting rules
├── .nvmrc              # Node version (24)
└── Makefile            # Build shortcuts
```

## Key Implementation Details

### Plugin Registration
Always register dependencies in order:
1. `@fastify/sensible` (provides httpErrors)
2. `@fastify/mongodb`
3. `@uscreen.de/fastify-mongo-crud`
4. `@uscreen.de/fastify-mongo-auth`

### Authentication Flow
1. Plugin adds preHandler hook to check session on every request
2. Sets `req[decorateRequest]` to authenticated user or null
3. `auth.authorized` preHandler throws 401 if not authenticated
4. Login sets session `_id`, logout deletes session

### MongoDB Patterns
```javascript
// Access collection via auth.collection getter
const account = await auth.collection.findOne({ username })

// Filter option applies to all queries (e.g., { active: true })
const account = await auth.collection.findOne({ ...query, ...filter })

// Use fastify.mongo.ObjectId for _id queries
new fastify.mongo.ObjectId(sid)
```

## Testing Requirements

- MongoDB must be running (default: `127.0.0.1:27017`)
- Tests automatically create/drop test databases
- Use unique database names per test run (via `id-generator`)
- All tests must pass before merging
- Coverage reports required for CI

## Commit Guidelines

- Run `pnpm run lint` before committing
- Ensure all tests pass (`pnpm test`)
- Follow conventional commit messages if project uses them
- Don't commit `node_modules/`, `coverage/`, or `.nyc_output/`

## Common Tasks

### Adding a New Handler
1. Add method to `auth` object in `index.js`
2. Follow existing patterns (`loginHandler`, `logoutHandler`, `currentUserHandler`)
3. Add corresponding test in `test/auth.test.js`
4. Document in README.md API section

### Modifying Authentication Logic
1. Update preHandler hook or `authorized` method in `index.js`
2. Ensure filter option is applied correctly
3. Add/update tests covering new behavior
4. Update documentation if API changes

### Adding Configuration Options
1. Add to schema object in `index.js`
2. Destructure in plugin function
3. Add to README.md Options table
4. Test with custom options in `test/setup.js`
