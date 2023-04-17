import { User } from '@core/models'

// const logger = loggerWithLabel(module)

const getUserDomain = async (userId: number): Promise<string> => {
  const user = await User.findOne({
    where: {
      id: userId,
    },
    attributes: ['emailDomain'],
  })
  if (user == null) {
    return ''
  }
  return user.emailDomain ?? ''
}
export const DomainService = {
  getUserDomain,
}
