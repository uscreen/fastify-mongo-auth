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
  fastify.post('/register', req => {
    const data = { ...req.body }
    data.hash = await this.createHash(data.password)
    delete data.password

    return { account: await this.collection.create(data) }}
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

- `key`: The key [`fastify-secure-session`](https://www.npmjs.com/package/fastify-secure-session) uses to ensure secure stateless cookie sessions. Default: `""`
- `decorateRequest`: The property each request is decorated with to contain the currently authenticated account. Default: `"user"`
- `collection`: The name of the mongodb collection the accounts are stored in. Default: `"accounts"`
- `usernameField`: The name of the property the username is stored in. Affects mongodb documents and the login handler (see below). Default: `"username"`
- `passwordField`: The name of the property the password is handed over when logging in. Default: `"username"`

## API

### get collection()

Returns the [`fastify-mongo-crud`](https://www.npmjs.com/package/@uscreen.de/fastify-mongo-crud) collection object where the accounts are stored.

### authorized(req, res, next)

PreHandler validating authentication. If autentication not valid, a `401 Unauthorized` error will be thrown.

### createHash(password)

Creates a hash from given password. Useful when creating new a new account or changing an account's password.

### verifyHash(password, hash)

Verifies if the given password corresponds to the given hash.

### async loginHandler(req)

Handler for logging in an account (i.e. called by `POST /login`). Accepts body as following (property names may differ according to delivered `opts` when plugin was registered):

```json
{
  "username": "a user's name",
  "password": "a user's password"
}
```

### async logoutHandler(req)

Handler for logging out an account (i.e. called by `POST /logout`)

### async currentUserHandler(req)

Handler returning the currently authenticated account (i.e. called by `GET /currentUser`).

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
