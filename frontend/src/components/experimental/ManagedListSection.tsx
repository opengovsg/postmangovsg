import { Dispatch, SetStateAction } from 'react'
import { List } from 'classes'
import { Dropdown } from 'components/common'

export const ManagedListSection = ({
  managedLists,
  setSelectedListId,
}: {
  managedLists: List[]
  setSelectedListId: Dispatch<SetStateAction<number | undefined>>
}) => {
  return (
    <>
      <h3>Choose recipient list</h3>
      <p>Reuse an existing list for your campaign.</p>

      <Dropdown
        disabled={!managedLists.length}
        options={managedLists.map((list) => {
          return {
            label: list.filename,
            value: list.id.toString(),
          }
        })}
        onSelect={(value) => setSelectedListId(+value)}
        defaultLabel="Select existing recipient list"
        aria-label="Managed list selector"
      />
    </>
  )
}
