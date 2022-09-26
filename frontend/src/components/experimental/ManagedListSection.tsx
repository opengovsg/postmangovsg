import { Dropdown } from 'components/common'

export const ManagedListSection = () => {
  return (
    <>
      <h3>Choose recipient list</h3>
      <p>Reuse an existing list for your campaign.</p>

      <Dropdown
        disabled={true}
        options={[]} // TODO: Actually implement the managed list dropdown selector
        onSelect={() => null} // TODO: Actually implement the managed list dropdown selector
        defaultLabel="Select existing recipient list"
        aria-label="Managed list selector"
      />
    </>
  )
}
