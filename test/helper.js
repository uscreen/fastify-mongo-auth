'use strict'

const fs = require('fs')
const path = require('path')
const Fastify = require('fastify')
const mongodb = require('fastify-mongodb')
const sensible = require('fastify-sensible')
const crud = require('@uscreen.de/fastify-mongo-crud')
const session = require('fastify-secure-session')
const auth = require('../index')

const database = process.env.TAP_CHILD_ID
  ? `npm-auth-test-${process.env.TAP_CHILD_ID}`
  : 'npm-auth-test'

const mongoServer = process.env.mongoServer || '127.0.0.1:27017'
const mongoUri = `mongodb://${mongoServer}/${database}`

const build = async (
  t,
  { usernameToLowerCase = true, addSessionDecorator = false }
) => {
  const fastify = Fastify()

  fastify.register(sensible)
  fastify.register(mongodb, {
    forceClose: true,
    useUnifiedTopology: true,
    url: mongoUri
  })
  fastify.register(crud)

  const key = fs.readFileSync(path.join(process.cwd(), 'test/session-key'))

  if (addSessionDecorator) {
    fastify.register(session, {
      key,
      cookie: {}
    })
  }

  fastify.register(auth, {
    key: fs.readFileSync(path.join(process.cwd(), 'test/session-key')),
    decorateRequest: 'account',
    usernameToLowerCase
  })

  // test routes
  const routes = (fastify, opts, done) => {
    const { auth } = fastify
    fastify.post('/register', async (req) => ({
      account: await auth.collection.create({
        hash: auth.createHash(req.body.password),
        username: usernameToLowerCase
          ? req.body.username.toLowerCase()
          : req.body.username
      })
    }))

    fastify.post('/login', auth.loginHandler)
    fastify.post('/logout', auth.logoutHandler)
    fastify.get(
      '/currentUser',
      {
        preHandler: auth.authorized
      },
      auth.currentUserHandler
    )
    done()
  }

  fastify.register(routes)

  t.teardown(fastify.close.bind(fastify))
  await fastify.ready()
  await fastify.mongo.db.dropDatabase()

  return fastify
}

module.exports = {
  build
}
