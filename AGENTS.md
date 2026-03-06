# AGENTS.md - Developer Guide for Coding Agents

Guide for AI agents working on `@uscreen.de/fastify-mongo-auth` — a Fastify plugin providing session-backed authentication against a MongoDB collection.

## Key Dependencies

- **Runtime:** Node.js 24 (see `.nvmrc`), ES modules (`"type": "module"`)
- **Fastify 5.x** with `@fastify/mongodb`, `@fastify/secure-session`, `@fastify/sensible`
- **`@uscreen.de/fastify-mongo-crud`** for collection operations
- **`secure-password`** for hashing, **`env-schema`** for option validation
- **Package manager:** pnpm

## Build, Lint, and Test Commands

```bash
pnpm install               # Install dependencies
pnpm run lint              # Run ESLint (check only)
pnpm run lint:fix          # Run ESLint with auto-fix
pnpm test                  # Run all tests with spec reporter
pnpm test:cov              # Tests with coverage (HTML + text)
pnpm test:ci               # Tests with lcov coverage for CI
```

### Running Single Tests

```bash
# Run a specific test file
node --test --test-reporter spec test/auth.test.js

# Run tests matching a name pattern
node --test --test-reporter spec --test-name-pattern="should register"
```

### Prerequisites

- MongoDB must be running on `127.0.0.1:27017` (or set `mongoServer` env var)
- `services/.compose/mongo.yml` provides a Docker Compose config for MongoDB
- Tests auto-create and drop databases per run (via `@uscreen.de/id-generator`)

## Code Style Guidelines

### ESLint Configuration

Uses **`@antfu/eslint-config`** flat config in `eslint.config.js` with formatters enabled. Key rules:

- **No trailing commas** (`style/comma-dangle: ['error', 'never']`)
- **Curly braces:** required for multi-line blocks, consistent (`curly: ['error', 'multi-line', 'consistent']`)
- **`console` allowed** (`no-console: off`)
- **Arrow functions preferred** at top level (`antfu/top-level-function: off`)
- **`node:test` imports allowed** (`test/no-import-node-test: off`)

Always run `pnpm run lint` before committing.

### Formatting (from .editorconfig)

- **Indent:** 2 spaces (tabs in Makefiles only)
- **Line endings:** LF, **Encoding:** UTF-8
- **Final newline:** always, **Trailing whitespace:** trim

### Import Style

```javascript
// Node builtins with node: prefix
import { Buffer } from 'node:buffer'
import fs from 'node:fs'

// External packages
import fp from 'fastify-plugin'
import envSchema from 'env-schema'

// Relative imports with .js extension
import { build } from './setup.js'
import auth from '../index.js'
```

### Naming Conventions

- **Variables/Functions:** camelCase (`usernameField`, `createHash`, `loginHandler`)
- **Constants:** camelCase for config objects, UPPER_CASE for true constants
- **Plugin options:** validated via `envSchema` with defaults in a schema object
- **Request decorators:** configurable name (default: `'user'` for `req.user`)

### Module Exports

```javascript
// Main plugin: default export wrapped with fastify-plugin
export default fp(fastifyMongoAuth, {
  fastify: '>=2.x',
  name: 'fastify-mongo-auth',
  decorators: { fastify: ['httpErrors', 'crud'] },
  dependencies: ['@fastify/sensible', 'fastify-mongo-crud']
})

// Test utilities: named exports
export const build = async (t, options) => { /* ... */ }
```

### Error Handling

```javascript
// Use fastify.httpErrors for HTTP errors
throw fastify.httpErrors.unauthorized()

// Use try-catch with logging for unexpected errors
try {
  req[user] = await auth.collection.findOne({ _id })
} catch (err) {
  fastify.log.error(err)
}

// Use preHandler for route-level auth checks
fastify.get('/protected', { preHandler: auth.authorized }, handler)
```

### Testing Patterns

Uses **Node.js native test runner** (`node:test`) with `node:assert/strict`:

```javascript
import assert from 'node:assert/strict'
import test from 'node:test'

test('descriptive test name', async (t) => {
  const fastify = await build(t, {})

  await t.test('should do specific thing', async () => {
    const { statusCode, cookies } = await fastify.inject({
      method: 'POST',
      url: '/login',
      payload: { username: 'foo', password: 'bar' }
    })
    assert.equal(statusCode, 200)
  })
})
```

- Use `fastify.inject()` for HTTP testing (no real server needed)
- Cleanup via `t.after(() => fastify.close())` (done in `build()` helper)
- Test setup helper in `test/setup.js` — registers all plugins and test routes
- Coverage via `c8`, reports in `coverage/`

## Project Structure

```
├── index.js              # Main plugin (auth object, hooks, handlers)
├── eslint.config.js      # ESLint flat config (@antfu/eslint-config)
├── test/
│   ├── setup.js          # Test helper: builds Fastify instance with plugins
│   ├── auth.test.js      # Authentication workflow tests
│   ├── noop.test.js      # Minimal sanity test
│   └── session-key       # Pre-generated key for @fastify/secure-session
├── services/.compose/    # Docker Compose for MongoDB
├── Makefile              # Shortcuts for test/coverage
└── .nvmrc                # Node version (24)
```

## Plugin Registration Order

Dependencies must be registered in this order:
1. `@fastify/sensible` (provides `httpErrors`)
2. `@fastify/mongodb` (provides `fastify.mongo`)
3. `@uscreen.de/fastify-mongo-crud` (provides `fastify.crud()`)
4. `@uscreen.de/fastify-mongo-auth` (provides `fastify.auth`)

## Authentication Flow

1. Plugin registers a global `preHandler` hook that checks session for `_id`
2. If valid session, loads user from MongoDB and sets `req[decorateRequest]`
3. `auth.authorized` preHandler throws 401 if no authenticated user
4. `loginHandler` verifies password hash, sets session `_id`
5. `logoutHandler` calls `req.session.delete()`
6. `filter` option (e.g., `{ active: true }`) is applied to all user queries

## Commit Guidelines

- Run `pnpm run lint` and `pnpm test` before committing
- Don't commit `node_modules/`, `coverage/`, `.nyc_output/`, `.env`
