import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { access } from 'fs'
import z from 'zod'
import { BadRequestError } from '../_errors/bad-request-error'
import { prisma } from '../../../lib/prisma'
import { env } from '@saas/env'

export async function authenticateWithGithub(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    '/sessions/github',
    {
      schema: {
        tags: ['auth'],
        summary: 'Authenticate with Github account',
        body: z.object({
          code: z.string(),
        }),
        response: {
          201: z.object({
            token: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { code } = request.body

      const githubOAuthURL = new URL(
        'https://github.com/login/oauth/access_token'
      )

      githubOAuthURL.searchParams.set('client_id', env.GITHUB_OAUTH_CLIENT_ID)
      githubOAuthURL.searchParams.set(
        'client_secret',
        env.GITHUB_OAUTH_SECRET_ID
      )
      githubOAuthURL.searchParams.set(
        'redirect_uri',
        env.GITHUB_OAUTH_REDIRECT_URI
      )
      githubOAuthURL.searchParams.set('code', code)

      const githubAccessTokenResponse = await fetch(githubOAuthURL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
        },
      })

      const githubAccessTokenData = await githubAccessTokenResponse.json()

      const { access_token: githubAccessToken } = z
        .object({
          access_token: z.string(),
          token_type: z.literal('bearer'),
          scope: z.string(),
        })
        .parse(githubAccessTokenData)

      const githubUserResponse = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${githubAccessToken}`,
        },
      })

      const githubUserData = await githubUserResponse.json()

      const {
        name,
        id: githubId,
        email: githubEmail,
        avatar_url: avatarUrl,
      } = z
        .object({
          id: z.number().int().transform(String),
          avatar_url: z.string().url(),
          name: z.string().nullable(),
          email: z.string().nullable(),
        })
        .parse(githubUserData)

      let email = githubEmail

      if (email == null) {
        // If the user has no email, we need to fetch the emails from the user emails API
        const githubUserEmailsResponse = await fetch(
          'https://api.github.com/user/emails',
          {
            headers: {
              Authorization: `Bearer ${githubAccessToken}`,
            },
          }
        )

        const githubUserEmailsData = await githubUserEmailsResponse.json()

        const userEmailsList = z
          .array(
            z.object({
              email: z.string().email(),
              primary: z.boolean(),
            })
          )
          .parse(githubUserEmailsData)

        const userPrimaryEmail = userEmailsList.find(
          (email) => email.primary === true
        )

        if (!userPrimaryEmail)
          throw new BadRequestError(
            'Your Github account must have an email to authenticate.'
          )

        email = userPrimaryEmail.email
      }

      let user = await prisma.user.findUnique({
        where: { email },
      })

      if (!user) {
        user = await prisma.user.create({
          data: {
            name,
            email,
            avatarUrl,
          },
        })
      }

      let account = await prisma.account.findUnique({
        where: {
          provider_userId: {
            provider: 'GITHUB',
            userId: user.id,
          },
        },
      })

      if (!account) {
        await prisma.account.create({
          data: {
            provider: 'GITHUB',
            providerAccountId: githubId,
            userId: user.id,
          },
        })
      }

      const token = await reply.jwtSign(
        { sub: user.id },
        { sign: { expiresIn: '7d' } }
      )

      return reply.status(201).send({ token })
    }
  )
}
