# fastify-mongo-auth

> Stateless session backed by authentication against mongodb collection

__Provides:__

- `fastify.auth` - the authentication adapter with it's api (see below)
- `req.session` - as provided by [fastify-secure-session](https://www.npmjs.com/package/fastify-secure-session)
- `req.user` - (default, customize by `decorateRequest` option) will be a current authenticated user account

Uses [secure-password](https://www.npmjs.com/package/secure-password) for hashing and verification

## Install

```sh
$ yarn add @uscreen.de/fastify-mongo-auth
```

## Add Dependencies

```sh
$ yarn add fastify-mongodb @uscreen.de/fastify-mongo-crud
```

The session package `fastify-secure-session` (see [@npm](https://www.npmjs.com/package/fastify-secure-session)) requires a secret or key. We stick to recommended setup with a generated key below, so you should generate one too:

```sh
$ secure-session-gen-key > session-key
```

## Example

__Setup__ within a `plugins/mongo.js` file to resolve required dependencies before:

```js
'use strict'

const fs = require('fs')
const path = require('path')
const fp = require('fastify-plugin')
const mongodb = require('fastify-mongodb')
const crud = require('@uscreen.de/fastify-mongo-crud')
const auth = require('@uscreen.de/fastify-mongo-auth')

/**
 * mongodb related
 */
module.exports = fp(async (fastify, opts) => {
  /**
   * 1) setup mongodb connection
   */
  await fastify.register(mongodb, {
    forceClose: true,
    useUnifiedTopology: true,
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
'use strict'

module.exports = async fastify => {
  const { auth } = fastify

  /**
   * registration
   * -> body.{username, password}
   * <- account.{username, _id}
   */
  fastify.post('/register', async req => {
    const data = { ...req.body }
    data.hash = auth.createHash(data.password)
    delete data.password

    return { account: await auth.collection.create(data) }
  })
}
```

__Usage__ within a `services/auth.js` file:

```js
'use strict'

module.exports = async fastify => {
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

| Option              | Description                                                                                                                                                   | Default      |
|---------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------|
| __collection__      | Name of the mongodb collection the accounts are stored in.                                                                                                    | `"accounts"` |
| __key__             | Path to file of session-key [`fastify-secure-session`](https://www.npmjs.com/package/fastify-secure-session) uses to ensure secure stateless cookie sessions. | `""`         |
| __decorateRequest__ | Property providing current authenticated account object within request object. (ie.: `req.user` as default)                                                   | `"user"`     |
| __usernameField__   | Name of property for usernames. Affects mongodb documents and the login handler (see below).                                                                  | `"username"` |
| __passwordField__   | Name of property for passwords.                                                                                                                               | `"password"` |

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

> TBD

### v0.0.0

- init

---

## License

Licensed under [MIT](./LICENSE).

Published, Supported and Sponsored by [u|screen](https://uscreen.de)
