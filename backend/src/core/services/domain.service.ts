import { User } from '@core/models'

// const logger = loggerWithLabel(module)

const getUserDomain = async (userId: number): Promise<string | null> => {
  const user = await User.findOne({
    where: {
      id: userId,
    },
    attributes: ['emailDomain'],
  })
  if (!user) {
    return null
  }
  return user?.emailDomain
}
export const DomainService = {
  getUserDomain,
}
