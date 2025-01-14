import { defineAbilityFor, Role, userSchema } from '@saas/auth'

export function getUserPermissions(userId: string, role: Role) {
  console.log(`defining ability for user User ${userId} and role ${role}`)
  const authUser = userSchema.parse({
    id: userId,
    role,
  })

  const ability = defineAbilityFor(authUser)

  console.log('------- console.log(ability) -------')
  console.log(ability)

  console.log('------- console.log(ability.can) -------')
  console.log(ability.can)

  console.log('------- console.log(ability.cannot) -------')
  console.log(ability.cannot)

  return ability
}
