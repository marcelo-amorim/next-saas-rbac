import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { prisma } from '../../../lib/prisma'
import z from 'zod'

export async function requestPasswordRecover(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    '/password/recover',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Request password recover',
        body: z.object({
          email: z.string().email(),
        }),
        response: {
          201: z.null(),
        },
      },
    },
    async (request, reply) => {
      const { email } = request.body

      const userFromEmail = await prisma.user.findUnique({ where: { email } })

      if (!userFromEmail) {
        // We don't want to leak information about the existence of the user
        return reply.status(201).send()
      }

      const { id: tokenId } = await prisma.token.create({
        data: {
          type: 'PASSWORD_RECOVER',
          userId: userFromEmail.id,
        },
      })

      // todo: send e-mail with password recover link
      console.log(`Recover password token: ${tokenId}`)

      return reply.status(201).send()
    }
  )
}
