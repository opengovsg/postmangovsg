import React, { useEffect, useState, useContext } from 'react'
import { useHistory } from 'react-router-dom'
import cx from 'classnames'
import Moment from 'react-moment'

import { POSTMAN_GUIDE_URL } from 'config'
import { ModalContext } from 'contexts/modal.context'
import { Pagination, TitleBar, PrimaryButton } from 'components/common'
import { getCampaigns } from 'services/campaign.service'
import { Campaign, ChannelType } from 'classes'
import CreateCampaign from 'components/dashboard/create-modal'

import EmptyDashboardImg from 'assets/img/empty-dashboard.svg'
import styles from './Campaigns.module.scss'

const ITEMS_PER_PAGE = 2

const Campaigns = () => {
  const modalContext = useContext(ModalContext)
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
    [ChannelType.SMS]: 'bx-message-detail',
    [ChannelType.Email]: 'bx-envelope-open',
  }

  const headers = [
    {
      name: 'Mode',
      render: (campaign: Campaign) => <i className={cx('bx', styles.icon, channelIcons[campaign.type])}></i>
      ,
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
        <PrimaryButton
          onClick={() => modalContext.setModalContent(
            <CreateCampaign></CreateCampaign>
          )}>
          Create new campaign
        </PrimaryButton>
      </TitleBar>
      <div className={styles.content}>
        {
          campaigns.length > 0
            ? (
              <>
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
              </>
            )
            : (
              <div className={styles.emptyDashboard}>
                <img src={EmptyDashboardImg} alt="Empty dashboard graphic" />
                <h2>We are excited to have you here!</h2>
                <h5>To get you started, we have prepared a guide for your reference</h5>
                <a href={POSTMAN_GUIDE_URL}>
                  <PrimaryButton className={styles.darkBlueButton}>Learn how to set up →</PrimaryButton>
                </a>
                <h5>Or you can begin creating your campaign with our step-by step</h5>
                <PrimaryButton onClick={() => modalContext.setModalContent(
                  <CreateCampaign></CreateCampaign>
                )}>
                  Let&apos;s begin
                </PrimaryButton>
              </div>
            )
        }
      </div>
    </>
  )
}

export default Campaigns
