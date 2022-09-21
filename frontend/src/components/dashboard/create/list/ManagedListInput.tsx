import { Dispatch, SetStateAction } from 'react'

import { List } from 'classes'
import { Dropdown } from 'components/common'

// TODO: Move these up to context
const ManagedListInput = ({
  managedLists,
  setSelectedListId,
}: {
  managedLists: List[]
  setSelectedListId: Dispatch<SetStateAction<number | null>>
}) => {
  const options = managedLists.map((list) => {
    return { label: list.name, value: String(list.id) }
  })
  return (
    <Dropdown
      options={options}
      onSelect={(value) => {
        setSelectedListId(+value)
      }}
      defaultLabel="Select managed list"
      aria-label="Managed list selector"
    />
  )
}

export default ManagedListInput
