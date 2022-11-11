import { User, List, UserList } from '@shared/core/models'
import { loggerWithLabel } from '@core/logger'
import { ChannelType } from '@shared/core/constants'
import { Op } from 'sequelize'

const DAYS_TO_LIST_EXPIRY = 14

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
}): Promise<{ id: List['id']; filename: List['filename'] }[]> => {
  const currentDateTime = new Date()
  try {
    const user = await User.findOne({
      where: { id: userId },
      include: [
        {
          model: List,
          where: {
            channel,
            createdAt: {
              // We currently only want to retrieve managed lists that were uploaded fewer than <DAYS_TO_LIST_EXPIRY> ago
              [Op.gte]: currentDateTime.setDate(
                currentDateTime.getDate() - DAYS_TO_LIST_EXPIRY
              ),
            },
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
  const currentDateTime = new Date()
  return List.findOne({
    where: {
      id: listId,
      channel,
      createdAt: {
        // We currently only want to retrieve managed lists that were uploaded fewer than <DAYS_TO_LIST_EXPIRY> ago
        [Op.gte]: currentDateTime.setDate(
          currentDateTime.getDate() - DAYS_TO_LIST_EXPIRY
        ),
      },
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

const createList = async ({
  s3key,
  etag,
  filename,
  channel,
}: {
  s3key: string
  etag: string
  filename: string
  channel: ChannelType
}): Promise<List> => {
  return List.create({
    s3key,
    etag,
    filename,
    channel,
  })
}

const grantListAccessToUser = async ({
  userId,
  listId,
}: {
  userId: number
  listId: number
}): Promise<UserList> => {
  return UserList.create({
    userId,
    listId,
  })
}

export const ListService = {
  listLists,
  getList,
  createList,
  grantListAccessToUser,
}
