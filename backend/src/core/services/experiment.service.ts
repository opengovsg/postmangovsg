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

export async function getUserExperimentalData(
  userId: number
): Promise<{ [key: string]: Record<string, string> }> {
  const records = await UserExperimental.findAll({
    where: { userId },
  })
  return records.reduce((cul, r) => ({ [r.feature]: r.metadata, ...cul }), {})
}
