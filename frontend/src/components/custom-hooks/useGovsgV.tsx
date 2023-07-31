import { useContext } from 'react'

import { ChannelType } from 'classes'
import { AuthContext } from 'contexts/auth.context'

export const useGovsgV = () => {
  const { experimentalData } = useContext(AuthContext)
  const canAccessGovsgV = `${ChannelType.Govsg}V` in experimentalData
  return {
    canAccessGovsgV,
  }
}
