# fastify-mongo-auth

[![Test CI](https://github.com/uscreen/fastify-mongo-auth/actions/workflows/main.yml/badge.svg)](https://github.com/uscreen/fastify-mongo-auth/actions/workflows/node.js.yml)
[![Test Coverage](https://coveralls.io/repos/github/uscreen/fastify-mongo-auth/badge.svg?branch=next)](https://coveralls.io/github/uscreen/fastify-mongo-auth?branch=next)
[![Known Vulnerabilities](https://snyk.io/test/github/uscreen/fastify-mongo-auth/badge.svg?targetFile=package.json)](https://snyk.io/test/github/uscreen/fastify-mongo-auth?targetFile=package.json)
[![NPM Version](https://badge.fury.io/js/@uscreen.de%2Ffastify-mongo-auth.svg)](https://badge.fury.io/js/@uscreen.de%2Ffastify-mongo-auth)

> Stateless session backed by authentication against mongodb collection

__Provides:__

- `fastify.auth` - the authentication adapter with it's api (see below)
- `req.session` - as provided by [@fastify/secure-session](https://www.npmjs.com/package/@fastify/secure-session)
- `req.user` - (default, customize by `decorateRequest` option) will be a current authenticated user account

Uses [secure-password](https://www.npmjs.com/package/secure-password) for hashing and verification

## Install

```sh
$ yarn add @uscreen.de/fastify-mongo-auth
```

## Add Dependencies

```sh
$ yarn add @fastify/mongodb @uscreen.de/fastify-mongo-crud
```

The session package `@fastify/secure-session` (see [@npm](https://www.npmjs.com/package/@fastify/secure-session)) requires a secret or key. We stick to recommended setup with a generated key below, so you should generate one too:

```sh
$ secure-session-gen-key > session-key
```

## Example

__Setup__ within a `plugins/mongo.js` file to resolve required dependencies before:

```js
import fs from 'fs'
import path from 'path'
import fp from 'fastify-plugin'
import mongodb from '@fastify/mongodb'
import crud from '@uscreen.de/fastify-mongo-crud'
import auth from '@uscreen.de/fastify-mongo-auth'

/**
 * mongodb related
 */
export default fp(async (fastify, opts) => {
  /**
   * 1) setup mongodb connection
   */
  await fastify.register(mongodb, {
    url: opts.mongoUri
  })

  /**
   * 2) setup CRUD factory
   */
  await fastify.register(crud)

  /**
   * 3) enable authentication
   */
  await fastify.register(auth, {
    key: fs.readFileSync(path.join(fastify.root, 'session-key')),
    decorateRequest: 'account'
  })
})
```

__Prepare__ account within a `service/accounts.js` file:

```js
export default async fastify => {
  const { auth } = fastify

  /**
   * registration
   * -> body.{username, password}
   * <- account.{username, _id}
   */
  fastify.post('/register', async req => ({
    account: await auth.collection.create({
      hash: auth.createHash(req.body.password),
      username: req.body.username.toLowerCase()
    })
  }))
}
```

__Usage__ within a `services/auth.js` file:

```js
export default async fastify => {
  const { auth } = fastify

  /**
   * authentication / login
   * -> body.{username, password}
   * <- account.{username, _id}
   */
  fastify.post('/login', auth.loginHandler)

  /**
   * authentication / logout
   * -> {} - no payload required
   * <- {} - no payload returned
   */
  fastify.post('/logout', auth.logoutHandler)

  /**
   * authentication / check currentUser
   * <- account.{username, _id}
   */
  fastify.get(
    '/currentUser',
    {
      preHandler: auth.authorized
    },
    auth.currentUserHandler
  )
}
```

## Options

| Option                  | Description                                                                                                                                                   | Default         |
|-------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------|
| __collection__          | Name of the mongodb collection the accounts are stored in.                                                                                                    | `"accounts"`    |
| __cookie__              | Options for session cookie as listed here [`cookie`](https://github.com/jshttp/cookie#readme).                                                                | `{ path: '/' }` |
| __key__                 | Path to file of session-key [`@fastify/secure-session`](https://www.npmjs.com/package/@fastify/secure-session) uses to ensure secure stateless cookie sessions. | `""`            |
| __decorateRequest__     | Property providing current authenticated account object within request object. (ie.: `req.user` as default)                                                   | `"user"`        |
| __usernameToLowerCase__ | Should usernames be treated case-insensitive (by lower-casing all queries) or not.                                                                            | `true`          |
| __usernameField__       | Name of property for usernames. Affects mongodb documents and the login handler (see below).                                                                  | `"username"`    |
| __passwordField__       | Name of property for passwords.                                                                                                                               | `"password"`    |

## API

### get collection()

Returns the [`fastify-mongo-crud`](https://www.npmjs.com/package/@uscreen.de/fastify-mongo-crud) collection object where the accounts are stored.

### authorized(req, res, next)

PreHandler validating authentication. Throws an `401 Unauthorized` error on unvalid authentication.

### createHash(password)

Creates a hash from given password. Useful when creating a new account or changing an account's password.

### verifyHash(password, hash)

Verifies the given password to the given hash.

### async loginHandler(req)

Handler for logging in to an account (i.e. called by `POST /login`). Expects a `req` object with a `body` containing credentials as configured in __Options__, defaults to:

```json
{
  "username": "a user's name",
  "password": "a user's password"
}
```

### async logoutHandler(req)

Handler for logging off from an account (i.e. called by `POST /logout`). Expects a `req` object without a `body`.

### async currentUserHandler(req)

Handler returning the current authenticated account (i.e. called by `GET /currentUser`) or an empty object if no account is authenticated. Expects a `req` object without a `body`.

---

## Roadmap

- test
- docs
- improved dependency handling
- improved onboarding
- maybe add more handler (register, reset, etc.)?
- maybe add routes?

## Changelog
### v1.0.0

#### Changed

- switch to __ESM only__
- upgrade to fastify@4.x

### v0.2.0

#### Added

- cookie options (see [`cookie`](https://github.com/jshttp/cookie#readme) defaults to `{ path: '/' }`

### v0.1.0

#### Changed

- uses lower case usernames by default
- preHandler stops logging empty session as error

#### Added

- new option `usernameToLowerCase` to disable case-insensitive usernames (defaults to true)

### v0.0.0

- init

---

## License

Licensed under [MIT](./LICENSE).

Published, Supported and Sponsored by [u|screen](https://uscreen.de)
