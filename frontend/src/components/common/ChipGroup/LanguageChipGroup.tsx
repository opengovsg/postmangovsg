import { WhatsAppLanguages } from '@shared/clients/whatsapp-client.class/types'
import { capitalize } from 'lodash'
import { Dispatch, SetStateAction } from 'react'

import { Chip } from './Chip'

interface LanguageChipGroupProps {
  options: string[]
  selected: WhatsAppLanguages
  setSelection: Dispatch<SetStateAction<WhatsAppLanguages>>
}

const languageChipGroupStyle = {
  display: 'flex',
  gap: '1rem',
}

export const LanguageChipGroup = ({
  options,
  selected,
  setSelection,
}: LanguageChipGroupProps) => {
  return (
    <div style={languageChipGroupStyle}>
      {options.map((language) => {
        const value =
          WhatsAppLanguages[language as keyof typeof WhatsAppLanguages]
        return (
          <div key={language} onClick={() => setSelection(value)}>
            <Chip label={capitalize(language)} selected={selected === value} />
          </div>
        )
      })}
    </div>
  )
}
