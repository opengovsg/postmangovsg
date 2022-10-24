/***
 * In the context of this file, when I refer to worker, I am referring to an ECS task.
 * The mapping is one-to-one.
 * A worker has a TaskARN that uniquely identifies it.
 * If a worker is stopped, the new worker that replaces the stopped worker will have a new TaskARN.
 * This means that the new worker has to find out which stopped worker it was meant to replace.
 */

import config from '@core/config'
import { loggerWithLabel } from '@core/logger'
import { QueryTypes } from 'sequelize'
import { Sequelize } from 'sequelize-typescript'

import difference from 'lodash/difference'

import ECSLoader from './ecs'

const logger = loggerWithLabel(module)

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
  const logMeta = { workerId, action: 'getDeadWorkers' }
  const serviceWorkers = await ECSLoader.getWorkersInService()
  logger.info({
    message: 'Workers in ECS',
    serviceWorkers,
    ...logMeta,
  })
  const jobWorkers = await getWorkersInDatabase(connection)
  logger.info({
    message: 'Workers in database',
    jobWorkers,
    ...logMeta,
  })
  const deadWorkers = difference(jobWorkers, serviceWorkers)
  logger.info({
    message: 'Dead workers',
    deadWorkers,
    ...logMeta,
  })

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
  const logMeta = { workerId, deadWorker, action: 'replaceDeadWorker' }
  logger.info({ message: 'Replacing deadWorker', ...logMeta })
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
        logger.info({ message: 'Replaced deadWorker', ...logMeta })
      } else {
        logger.error({ message: 'Failed to replace deadWorker', ...logMeta })
      }
      return success
    })
    .catch((err: Error) => {
      logger.error({
        message: 'Failed to replace deadWorker',
        error: err,
        ...logMeta,
      })
      return false
    })
}

const insertNewWorker = (
  connection: Sequelize,
  workerId: string
): Promise<boolean> => {
  const logMeta = { workerId, action: 'insertNewWorker' }
  logger.info({ message: 'Inserting new worker', ...logMeta })
  return connection
    .query(
      'INSERT INTO workers (id, created_at, updated_at) VALUES (:workerId, clock_timestamp(), clock_timestamp()) ON CONFLICT (id) DO NOTHING;',
      {
        replacements: { workerId },
        type: QueryTypes.INSERT,
      }
    )
    .then(() => {
      logger.info({ message: 'Inserted new worker', ...logMeta })
      return true
    })
    .catch((err: Error) => {
      logger.error({
        message: 'Failed to insert new worker',
        error: err,
        ...logMeta,
      })
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
      logger.info({
        message: 'Dev env - assignment - assumed no dead workers',
        workerId,
        action: 'assignment',
      })
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
