import { fastify } from 'fastify'
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from 'fastify-type-provider-zod'

import fastifyCors from '@fastify/cors'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'

import { createAccount } from './routes/auth/create-account'
import { authenticateWithPassword } from './routes/auth/authenticate-with-password'
import fastifyJwt from '@fastify/jwt'
import { getProfile } from './routes/auth/get-profile'
import { errorHandler } from './error-handler'
import { requestPasswordRecover } from './routes/auth/request-password-recover'
import { resetPassword } from './routes/auth/reset-password'

const app = fastify().withTypeProvider<ZodTypeProvider>()

// Zod Type Serializer Provider
app.setSerializerCompiler(serializerCompiler)
// Zod Type Validator Provider
app.setValidatorCompiler(validatorCompiler)

// Error handler
app.setErrorHandler(errorHandler)

// Swagger
app.register(fastifySwagger, {
  openapi: {
    info: {
      title: 'Next.js SaaS',
      description: 'Fullstack SaaS app with multi-tenancy & RBAC.',
      version: '1.0.0',
    },
    servers: [],
  },
  transform: jsonSchemaTransform,
})

app.register(fastifySwaggerUi, {
  routePrefix: '/docs',
})

app.register(fastifyJwt, {
  secret: 'my-jwt-secret',
})

// Enable CORS
app.register(fastifyCors)

// Routes
app.register(createAccount)
app.register(authenticateWithPassword)
app.register(getProfile)
app.register(requestPasswordRecover)
app.register(resetPassword)

app
  .listen({ port: 3000 })
  .then(() => console.log('Server is running on port 3000'))
