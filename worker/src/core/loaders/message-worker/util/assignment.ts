/***
 * In the context of this file, when I refer to worker, I am referring to an ECS task.
 * The mapping is one-to-one.
 * A worker has a TaskARN that uniquely identifies it.
 * If a worker is stopped, the new worker that replaces the stopped worker will have a new TaskARN.
 * This means that the new worker has to find out which stopped worker it was meant to replace.
 */

import { QueryTypes } from 'sequelize'
import logger from '@core/logger'
import { Sequelize } from 'sequelize-typescript'
import difference from 'lodash/difference'
import config from '@core/config'
import ECSLoader from './ecs'

const getWorkersInDatabase = (connection: Sequelize): Promise<string[]> => {
  return connection.query('SELECT id FROM workers;').then((results: any[]) => {
    const workers = results[0] as Array<{ id: string }>
    return workers.map((worker) => worker.id)
  })
}

const getDeadWorkers = async (
  connection: Sequelize,
  workerId: string
): Promise<string[]> => {
  const serviceWorkers = await ECSLoader.getWorkersInService()
  logger.info(`${workerId}: Workers in ECS - ${serviceWorkers}`)
  const jobWorkers = await getWorkersInDatabase(connection)
  logger.info(`${workerId}: Workers in database - ${jobWorkers}`)
  const deadWorkers = difference(jobWorkers, serviceWorkers)
  logger.info(`${workerId}: Dead workers -  ${deadWorkers}`)

  return deadWorkers
}

/**
 *  New worker tries to update the workers and job queue table
 */
const replaceDeadWorker = (
  connection: Sequelize,
  workerId: string,
  deadWorker: string
): Promise<boolean> => {
  logger.info(`${workerId}: Replacing deadWorker ${deadWorker}`)
  // The update of worker's id will cascade to the job queue
  return connection
    .query(
      'UPDATE workers SET id=:workerId, updated_at=clock_timestamp() WHERE id=:deadWorker;',
      {
        replacements: { workerId, deadWorker },
        type: QueryTypes.UPDATE,
      }
    )
    .then(([_results, rowCount]: [any, number]) => {
      const success = rowCount === 1 // Managed to replace a worker
      if (success) {
        logger.info(`${workerId}: Replaced deadWorker ${deadWorker}`)
      } else {
        logger.info(`${workerId}: Failed to replace deadWorker ${deadWorker}`)
      }
      return success
    })
    .catch((err: Error) => {
      logger.error(err)
      return false
    })
}

const insertNewWorker = (
  connection: Sequelize,
  workerId: string
): Promise<boolean> => {
  logger.info(`${workerId}: Inserting new worker`)
  return connection
    .query(
      'INSERT INTO workers (id, created_at, updated_at) VALUES (:workerId, clock_timestamp(), clock_timestamp()) ON CONFLICT (id) DO NOTHING;',
      {
        replacements: { workerId },
        type: QueryTypes.INSERT,
      }
    )
    .then(() => {
      logger.info(`${workerId}: Inserted new worker`)
      return true
    })
    .catch((err: Error) => {
      logger.error(err)
      return false
    })
}

const assignment = async (
  connection: Sequelize,
  workerId: string
): Promise<boolean> => {
  try {
    let deadWorkers: string[] = []
    if (config.get('env') !== 'development') {
      deadWorkers = await getDeadWorkers(connection, workerId)
    } else {
      logger.info(`${workerId}: Dev env - assignment - assumed no dead workers`)
    }
    if (deadWorkers.length === 0) {
      return insertNewWorker(connection, workerId)
    } else {
      const replaced: boolean = await replaceDeadWorker(
        connection,
        workerId,
        deadWorkers[0]
      )
      return (
        replaced ||
        // Try to assign again, after waiting for some time. Some other task probably replaced that dead worker already
        new Promise((resolve) =>
          setTimeout(resolve, Math.random() * 2000)
        ).then(() => assignment(connection, workerId))
      )
    }
  } catch (err) {
    return false
  }
}

export default assignment
