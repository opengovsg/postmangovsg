/**
 * returns true if `_superset` is superset of `subset`
 * @param _superset
 * @param subset
 */
const isSuperSet = <T>(_superset: Array<T>, subset: Array<T>): boolean => {
  const superset = new Set(_superset)
  return subset.every((s) => superset.has(s))
}

export { isSuperSet }
