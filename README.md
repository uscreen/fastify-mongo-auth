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

> TBD

## Api

> TBD

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
