import { fastify } from 'fastify'
import fastifyCors from '@fastify/cors'
import {
  // jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { createAccount } from './routes/auth/create-account'

const app = fastify().withTypeProvider<ZodTypeProvider>()

app.setSerializerCompiler(serializerCompiler)
app.setValidatorCompiler(validatorCompiler)

// Enable CORS
app.register(fastifyCors)

// Routes
app.register(createAccount)

app
  .listen({ port: 3000 })
  .then(() => console.log('Server is running on port 3000'))
