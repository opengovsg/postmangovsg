import React, { useEffect, useState, useContext } from 'react'
import { OutboundLink } from 'react-ga'
import { useHistory } from 'react-router-dom'
import cx from 'classnames'
import Moment from 'react-moment'
import { capitalize } from 'lodash'

import { GUIDE_URL } from 'config'
import { ModalContext } from 'contexts/modal.context'
import { AuthContext } from 'contexts/auth.context'
import {
  Pagination,
  TitleBar,
  PrimaryButton,
  ExportRecipients,
} from 'components/common'
import { getCampaigns, getExportStatus } from 'services/campaign.service'
import { Campaign, channelIcons, Status } from 'classes'
import CreateCampaign from 'components/dashboard/create/create-modal'

import EmptyDashboardImg from 'assets/img/empty-dashboard.svg'
import styles from './Campaigns.module.scss'

const ITEMS_PER_PAGE = 10

const Campaigns = () => {
  const { email } = useContext(AuthContext)
  const modalContext = useContext(ModalContext)
  const [isLoading, setLoading] = useState(true)
  const [campaignsDisplayed, setCampaignsDisplayed] = useState(
    new Array<Campaign>()
  )
  const [selectedPage, setSelectedPage] = useState(0)
  const [campaignCount, setCampaignCount] = useState(0)
  const history = useHistory()
  const name = getNameFromEmail(email)
  const title = `Welcome, ${name}`

  function getNameFromEmail(email: string): string {
    const parts = email.split('@')
    const [nameParts] = parts
    return nameParts
      .split(/[_.-]/)
      .map((n) => capitalize(n))
      .join(' ')
  }

  async function fetchCampaigns(selectedPage: number) {
    setLoading(true)
    const { campaigns, totalCount } = await getCampaigns({
      offset: selectedPage * ITEMS_PER_PAGE,
      limit: ITEMS_PER_PAGE,
    })
    setCampaignCount(totalCount)
    setCampaignsDisplayed(campaigns)
    setLoading(false)
  }

  useEffect(() => {
    fetchCampaigns(selectedPage)
  }, [selectedPage])

  /* eslint-disable react/display-name */
  const headers = [
    {
      name: 'Mode',
      render: (campaign: Campaign) => (
        <div className={styles.iconContainer}>
          <i className={cx('bx', styles.icon, channelIcons[campaign.type])}></i>
          {campaign.protect && (
            <i className={cx('bx bxs-lock-alt', styles.lockIcon)}></i>
          )}
        </div>
      ),
      width: 'xs center',
    },
    {
      name: 'Name',
      render: (campaign: Campaign) => campaign.name,
      width: 'md',
    },
    {
      name: 'Created At',
      render: (campaign: Campaign) => (
        <Moment format="LLL">{campaign.createdAt}</Moment>
      ),
      width: 'md',
    },
    {
      name: 'Sent At',
      render: (campaign: Campaign) =>
        campaign.sentAt ? (
          <Moment format="LLL">{campaign.sentAt}</Moment>
        ) : (
          <span></span>
        ),
      width: 'md',
    },
    {
      name: 'Status',
      render: (campaign: Campaign) => capitalize(campaign.status),
      width: 'xs',
    },
    {
      name: 'Export Error List',
      render: (campaign: Campaign) => {
        if (campaign.status !== Status.Sent) return
        const { statusUpdatedAt, hasFailedRecipients } = campaign
        return (
          <ExportRecipients
            campaignId={campaign.id}
            campaignName={campaign.name}
            status={campaign.status}
            sentAt={campaign.sentAt}
            exportStatus={getExportStatus(
              statusUpdatedAt,
              +hasFailedRecipients
            )}
          />
        )
      },
      width: 'md center',
    },
  ]
  /* eslint-enable react/display-name */

  function renderRow(campaign: Campaign, key: number) {
    return (
      <tr key={key} onClick={() => history.push(`/campaigns/${campaign.id}`)}>
        {headers.map(({ render, width, name }) => (
          <td className={width} key={name}>
            {render(campaign)}
          </td>
        ))}
      </tr>
    )
  }

  function renderEmptyDashboard() {
    return (
      <div className={styles.emptyDashboard}>
        <img
          className={styles.image}
          src={EmptyDashboardImg}
          alt="Empty dashboard graphic"
        />
        <h2>We are excited to have you here!</h2>
        <h5>To get you started, we have prepared a guide for your reference</h5>
        <OutboundLink eventLabel={GUIDE_URL} to={GUIDE_URL} target="_blank">
          <PrimaryButton className={styles.darkBlueButton}>
            Learn how to set up →
          </PrimaryButton>
        </OutboundLink>
        <h5>Or you can begin creating your campaign here</h5>
        <PrimaryButton
          onClick={() =>
            modalContext.setModalContent(<CreateCampaign></CreateCampaign>)
          }
        >
          Let&apos;s begin
        </PrimaryButton>
      </div>
    )
  }

  function renderCampaignList() {
    return (
      <>
        <h2 className={styles.header}>{campaignCount} past campaigns</h2>
        <div className={styles.tableContainer}>
          <table className={styles.campaignTable}>
            <thead>
              <tr>
                {headers.map(({ name, width }) => (
                  <th className={width} key={name}>
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>{campaignsDisplayed.map(renderRow)}</tbody>
          </table>
        </div>

        <Pagination
          itemsCount={campaignCount}
          selectedPage={selectedPage}
          setSelectedPage={setSelectedPage}
          itemsPerPage={ITEMS_PER_PAGE}
        ></Pagination>
      </>
    )
  }

  return (
    <>
      <TitleBar title={title}>
        <PrimaryButton
          onClick={() =>
            modalContext.setModalContent(<CreateCampaign></CreateCampaign>)
          }
        >
          Create new campaign
        </PrimaryButton>
      </TitleBar>
      <div className={styles.content}>
        {isLoading ? (
          <i className={cx(styles.spinner, 'bx bx-loader-alt bx-spin')}></i>
        ) : campaignCount > 0 ? (
          renderCampaignList()
        ) : (
          renderEmptyDashboard()
        )}
      </div>
    </>
  )
}

export default Campaigns
