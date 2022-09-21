import { User, List } from '@core/models'
import { loggerWithLabel } from '@core/logger'

const logger = loggerWithLabel(module)
/**
 * Retrieve all lists belonging to a specific user
 */
const listLists = async ({
  userId,
}: {
  userId: number
}): Promise<{ id: List['id']; name: List['name'] }[]> => {
  try {
    const user = await User.findOne({
      where: { id: userId },
      include: [
        {
          model: List,
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
 * Get a specified list belonging to a user
 */
const getList = async ({
  userId,
  listId,
}: {
  userId: number
  listId: number
}): Promise<List | null> => {
  return List.findOne({
    where: {
      id: listId,
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
