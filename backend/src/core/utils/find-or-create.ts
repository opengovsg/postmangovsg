import {
  Model,
  ModelStatic,
  Transaction,
  UniqueConstraintError,
  Sequelize,
} from 'sequelize'

type WhereOptions<T> = Partial<T> & Record<string, unknown>

interface FindOrCreateOptions<T> {
  where: WhereOptions<T>
  defaults?: Partial<T>
  transaction?: Transaction | null
}

/**
 * A safe alternative to Sequelize's findOrCreate that does not use DDL statements.
 *
 * Sequelize's native findOrCreate creates temporary PostgreSQL functions (DDL),
 * which is incompatible with AWS RDS blue/green deployments that use logical replication.
 *
 * This implementation uses pure DML (SELECT + INSERT) with application-level
 * error handling for race conditions.
 *
 * @param model - The Sequelize model to operate on
 * @param options - Options including where clause, defaults, and optional transaction
 * @returns A tuple of [instance, created] where created is true if a new record was created
 */
async function findOrCreateWithTransaction<T extends Model>(
  model: ModelStatic<T>,
  options: FindOrCreateOptions<T>
): Promise<[T, boolean]> {
  const { where, defaults, transaction } = options

  const execute = async (t: Transaction): Promise<[T, boolean]> => {
    // First, try to find existing record
    const existing = await model.findOne({
      where: where as any,
      transaction: t,
    })
    if (existing) {
      return [existing, false]
    }

    // Not found, try to create
    try {
      const created = await model.create({ ...defaults, ...where } as any, {
        transaction: t,
      })
      return [created, true]
    } catch (error) {
      // Handle race condition: another process created it first
      if (error instanceof UniqueConstraintError) {
        const found = await model.findOne({
          where: where as any,
          transaction: t,
        })
        if (found) {
          return [found, false]
        }
        // If still not found (edge case: other transaction rolled back),
        // re-throw the original error
      }
      throw error
    }
  }

  // If no transaction provided, create one. Otherwise use the provided one.
  if (!transaction) {
    const sequelize = model.sequelize as Sequelize
    return sequelize.transaction((t) => execute(t))
  }

  return execute(transaction)
}

export { findOrCreateWithTransaction, FindOrCreateOptions }
