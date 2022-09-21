import { User, List } from '@core/models'
import { loggerWithLabel } from '@core/logger'
import { ChannelType } from '@core/constants'

const logger = loggerWithLabel(module)
/**
 * Retrieve all lists belonging to a specific user
 */
const listLists = async ({
  userId,
  channel,
}: {
  userId: number
  channel: ChannelType
}): Promise<{ id: List['id']; name: List['name'] }[]> => {
  try {
    const user = await User.findOne({
      where: { id: userId },
      include: [
        {
          model: List,
          where: {
            channel,
          },
        },
      ],
    })
    logger.info(user)
    if (!user) return []

    return user.lists
  } catch (err) {
    logger.error(err)
    throw err
  }
}

/**
 * Get a specified list of a specific channel type belonging to a user
 */
const getList = async ({
  userId,
  listId,
  channel,
}: {
  userId: number
  listId: number
  channel: ChannelType
}): Promise<List | null> => {
  return List.findOne({
    where: {
      id: listId,
      channel,
    },
    include: [
      {
        model: User,
        required: true, // Converts query from `OUTER JOIN` to `INNER JOIN`
        where: {
          id: userId,
        },
      },
    ],
  })
}

export const ListService = {
  listLists,
  getList,
}
