import { UserExperimental } from '@core/models/user/user-experimental'

export function getExperimentalUser(
  userId: number,
  feature: string
): Promise<UserExperimental | null> {
  return UserExperimental.findOne({
    where: {
      userId,
      feature,
    },
  })
}

export async function getFeaturesUserHasAccessTo(
  userId: number
): Promise<string[]> {
  const records = await UserExperimental.findAll({
    where: { userId },
  })
  return records.map((r) => r.feature)
}
