import React, { useEffect, useState } from 'react'
import { useHistory } from 'react-router-dom'
import cx from 'classnames'
import Moment from 'react-moment'

import { Pagination, TitleBar, PrimaryButton } from 'components/common'
import { getCampaigns } from 'services/campaign.service'
import { Campaign, ChannelType } from 'classes'

import styles from './Campaigns.module.scss'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEnvelopeOpen, faCommentAlt } from '@fortawesome/free-solid-svg-icons'

const ITEMS_PER_PAGE = 2

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState(new Array<Campaign>())
  const [campaignsDisplayed, setCampaignsDisplayed] = useState(new Array<Campaign>())
  const [selectedPage, setSelectedPage] = useState(0)
  const history = useHistory()

  async function fetchCampaigns() {
    const campaigns = await getCampaigns()
    setCampaigns(campaigns)
  }

  useEffect(() => {
    fetchCampaigns()
  }, [])

  useEffect(() => {
    const offset = selectedPage * ITEMS_PER_PAGE
    setCampaignsDisplayed(campaigns.slice(offset, offset + ITEMS_PER_PAGE))
  }, [campaigns, selectedPage])

  const channelIcons = {
    [ChannelType.Email]: faEnvelopeOpen,
    [ChannelType.SMS]: faCommentAlt,
  }

  const headers = [
    {
      name: 'Mode',
      render: (campaign: Campaign) => <FontAwesomeIcon className={styles.icon} icon={channelIcons[campaign.type]} />,
      width: 'xs',
    },
    {
      name: 'Name',
      render: (campaign: Campaign) => campaign.name,
      width: 'md',
    },
    {
      name: 'Created At',
      render: (campaign: Campaign) => <Moment format='LLL'>{campaign.createdAt}</Moment>,
      width: 'md',
    },
    {
      name: 'Sent At',
      render: (campaign: Campaign) => <Moment format='LLL'>{campaign.sentAt}</Moment>,
      width: 'md',
    }
    ,
    {
      name: 'Status',
      render: (campaign: Campaign) => campaign.status,
      width: 'sm',
    },
  ]

  function renderRow(campaign: Campaign, key: number) {
    return (
      <tr key={key} onClick={() => history.push(`/campaigns/${campaign.id}`)}>
        {
          headers.map(({ render, width, name }) => (
            <td className={cx(styles.column, styles[width])} key={name} >
              {render(campaign)}
            </td>
          ))
        }
      </tr>
    )
  }

  return (
    <>
      <TitleBar title="Welcome, Agency">
        <PrimaryButton>Create new campaign</PrimaryButton>
      </TitleBar>
      <div className={styles.content}>
        <h2 className={styles.header}>{campaigns.length} past campaigns</h2>
        <table>
          <thead>
            <tr>
              {
                headers.map(({ name, width }) => (
                  <th className={styles[width]} key={name}>
                    {name}
                  </th>
                ))
              }
            </tr>
          </thead>
          <tbody>
            {
              campaignsDisplayed.map(renderRow)
            }
          </tbody>
        </table>

        <Pagination
          itemsCount={campaigns.length}
          setSelectedPage={setSelectedPage}
          itemsPerPage={ITEMS_PER_PAGE}
        ></Pagination>
      </div>
    </>
  )
}

export default Campaigns
